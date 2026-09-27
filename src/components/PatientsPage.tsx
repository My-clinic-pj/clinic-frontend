import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Pagination } from './ui/Pagination';
import { Modal } from './ui/Modal';
import {
  Users,
  Search,
  Calendar,
  X,
  AlertTriangle,
  History,
  Clock,
  CheckCircle2,
  Download,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Patient, Visit, PaymentMethod } from '../types';
import { useSettings } from '../hooks/useSettings';

export const PatientsPage: React.FC = () => {
  const { clinicName, doctorName, clinicAddress, clinicPhone, doctorSignature } = useSettings();
  // Filters
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Selected patient for read-only history modal
  const [inspectPatient, setInspectPatient] = useState<Patient | null>(null);

  // Follow-up visit state
  const [followUpVisitId, setFollowUpVisitId] = useState<number | null>(null);
  const [followUpData, setFollowUpData] = useState({
    bp: '',
    temp: '',
    amount: '0',
    type: 'Cash' as PaymentMethod,
  });

  // Live query from Dexie
  const patients = useLiveQuery(() => db.patients.toArray());
  const visits = useLiveQuery(() => db.visits.toArray());

  // Count visits per patient
  const patientVisitStats = useMemo(() => {
    const counts = new Map<number, { total: number; lastVisitDate?: string }>();
    if (visits) {
      for (const v of visits) {
        const current = counts.get(v.patientId) || { total: 0 };
        current.total += 1;
        if (!current.lastVisitDate || v.date > current.lastVisitDate) {
          current.lastVisitDate = v.date;
        }
        counts.set(v.patientId, current);
      }
    }
    return counts;
  }, [visits]);

  // Compute upcoming appointments for badges
  const patientUpcomingAppointments = useMemo(() => {
    const map = new Map<number, boolean>();
    const todayStr = new Date().toISOString().split('T')[0];
    if (visits) {
      for (const v of visits) {
        if (v.nextAppointmentDate && v.nextAppointmentDate >= todayStr && !v.appointmentFulfilled) {
          map.set(v.patientId, true);
        }
      }
    }
    return map;
  }, [visits]);

  // Filtered patients
  const filteredPatients = useMemo(() => {
    if (!patients) return [];

    return patients.filter((p) => {
      // Name or Phone filter
      if (nameFilter.trim()) {
        const query = nameFilter.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesPhone = p.phone.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone) return false;
      }

      // Date filter (Registration date)
      if (dateFilter) {
        const regDate = p.createdAt ? p.createdAt.split('T')[0] : '';
        if (regDate !== dateFilter) return false;
      }

      return true;
    });
  }, [patients, nameFilter, dateFilter]);

  // Paginated patients (10 per page)
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPatients.slice(start, start + PAGE_SIZE);
  }, [filteredPatients, currentPage]);

  // Visits for inspected patient
  const inspectPatientVisits = useMemo(() => {
    if (!inspectPatient || !inspectPatient.id || !visits) return [];
    return visits
      .filter((v) => v.patientId === inspectPatient.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [inspectPatient, visits]);

  const handleClearFilters = () => {
    setNameFilter('');
    setDateFilter('');
    setCurrentPage(1);
  };

  const handleSaveFollowUp = async (v: Visit) => {
    if (!v.id || !inspectPatient?.id) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Create new visit
    await db.visits.add({
      patientId: inspectPatient.id,
      date: todayStr,
      status: 'Checkout',
      bloodPressure: followUpData.bp,
      temperature: followUpData.temp,
      payAmount: Number(followUpData.amount) || 0,
      paymentType: followUpData.type,
      createdAt: new Date().toISOString()
    });

    // Update old visit
    await db.visits.update(v.id, { appointmentFulfilled: true });

    setFollowUpVisitId(null);
  };

  const handleExportPdf = () => {
    if (!inspectPatient) return;

    const doc = new jsPDF();

    // 1. Header Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(clinicName || 'Clinic Name', 105, 20, { align: 'center' });

    let currentY = 26;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (doctorName) {
      doc.text(`Dr. ${doctorName}`, 105, currentY, { align: 'center' });
      currentY += 6;
    }
    if (clinicAddress) {
      doc.text(clinicAddress, 105, currentY, { align: 'center' });
      currentY += 6;
    }
    if (clinicPhone) {
      doc.text(`Phone: ${clinicPhone}`, 105, currentY, { align: 'center' });
      currentY += 6;
    }

    // 2. Title Section
    const startY = currentY + 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MEDICAL RECORD / CERTIFICATE OF ATTENDANCE', 105, startY, { align: 'center' });

    // 3. Patient Details Section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Patient Name: ${inspectPatient.name}`, 14, startY + 15);
    doc.text(`Age: ${inspectPatient.age} yrs`, 14, startY + 22);
    doc.text(`Phone: ${inspectPatient.phone}`, 14, startY + 29);
    doc.text(`Address: ${inspectPatient.address || '—'}`, 14, startY + 36);
    doc.text(`Allergies: ${inspectPatient.allergies || 'None'}`, 14, startY + 43);
    doc.text(`Registered On: ${inspectPatient.createdAt ? inspectPatient.createdAt.split('T')[0] : '—'}`, 14, startY + 50);

    // 4. Clinical History Section (autoTable)
    const tableData = inspectPatientVisits.map(v => [
      v.date,
      v.bloodPressure || '—',
      v.temperature || '—',
      v.payAmount ? `${v.payAmount} MMK` : '—',
      v.nextAppointmentDate || '—'
    ]);

    autoTable(doc, {
      startY: startY + 60,
      head: [['Date', 'Blood Pressure', 'Body Temp', 'Payment', 'Next Appointment']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    // 5. Footer Section
    // @ts-ignore
    const finalY = (doc as any).lastAutoTable?.finalY || startY + 60;

    if (doctorSignature) {
      try {
        // Add signature above the line
        doc.addImage(doctorSignature, 'PNG', 145, finalY + 5, 45, 18);
      } catch (e) {
        console.error("Failed to add signature image to PDF", e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.text("Doctor's Signature & Date", 196, finalY + 30, { align: 'right' });
    doc.line(140, finalY + 25, 196, finalY + 25); // Signature line

    // Save PDF
    doc.save(`${inspectPatient.name.replace(/\\s+/g, '_')}_Medical_Record.pdf`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-500">
              Directory
            </span>
            <span className="text-xs font-mono text-neutral-400">•</span>
            <span className="text-xs text-neutral-500 font-medium">
              {patients ? patients.length : 0} Total Patients
            </span>
          </div>
          <h1 className="text-2xl font-black text-black tracking-tight mt-0.5">
            Registered Patients
          </h1>
        </div>
      </div>

      {/* Filters at the Top: "Date Filter" and "Name Filter" */}
      <div className="p-4 bg-white border border-neutral-200 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-black">
            Filter Patient Records
          </span>
          {(nameFilter || dateFilter) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs font-semibold text-neutral-600 hover:text-black inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Name / Phone Filter */}
          <div>
            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
              Name Filter
            </label>
            <div className="relative">
              <input
                type="text"
                value={nameFilter}
                onChange={(e) => {
                  setNameFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by patient name or phone number..."
                className="w-full px-3 py-2 pl-9 rounded border border-neutral-300 text-xs text-black placeholder-neutral-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono transition"
              />
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              {nameFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setNameFilter('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
              Date Filter (Registration Date)
            </label>
            <div className="relative">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 pl-9 rounded border border-neutral-300 text-xs text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono transition bg-white"
              />
              <Calendar className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-black"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <Card
        title="Patient Roster"
        subtitle={`Showing ${filteredPatients.length} matching patient record${filteredPatients.length === 1 ? '' : 's'}`}
        action={
          <span className="text-xs font-mono font-semibold px-2 py-1 rounded bg-neutral-100 text-black border border-neutral-300">
            Page {currentPage} of {Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE))}
          </span>
        }
      >
        {filteredPatients.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-black">No patients found</h4>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
              {nameFilter || dateFilter
                ? 'Try adjusting or clearing your Name or Date filter to view more results.'
                : 'No patients have been registered yet. Check in patients from the Dashboard.'}
            </p>
            {(nameFilter || dateFilter) && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="px-3 py-1.5 text-xs font-medium border border-neutral-300 rounded hover:border-black transition"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-wider text-neutral-500 font-bold">
                <tr>
                  <th className="px-5 py-3">Patient Name</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Age</th>
                  <th className="px-5 py-3">Address</th>
                  <th className="px-5 py-3">Allergies</th>
                  <th className="px-5 py-3">Registered Date</th>
                  <th className="px-5 py-3 text-right">Total Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {paginatedPatients.map((patient) => {
                  const stats = patient.id ? patientVisitStats.get(patient.id) : undefined;
                  const regDate = patient.createdAt
                    ? patient.createdAt.split('T')[0]
                    : '—';
                  const hasAllergies =
                    patient.allergies && patient.allergies.toLowerCase() !== 'none';

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => setInspectPatient(patient)}
                      className="hover:bg-neutral-50 transition cursor-pointer"
                    >
                      {/* Name */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-black">{patient.name}</span>
                          {patientUpcomingAppointments.get(patient.id!) && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">
                              Scheduled
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-neutral-600">
                        {patient.phone}
                      </td>

                      {/* Age */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-neutral-700">
                        {patient.age} yrs
                      </td>

                      {/* Address */}
                      <td className="px-5 py-3.5 text-neutral-600 max-w-xs truncate">
                        {patient.address || '—'}
                      </td>

                      {/* Allergies */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {hasAllergies ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-black bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
                            <AlertTriangle className="w-3 h-3 text-black" />
                            {patient.allergies}
                          </span>
                        ) : (
                          <span className="text-neutral-400">None</span>
                        )}
                      </td>

                      {/* Registered Date */}
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono text-neutral-500">
                        {regDate}
                      </td>

                      {/* Total Visits */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono font-bold text-black">
                        {stats ? stats.total : 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination (10 rows per page) */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredPatients.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>

      {/* Read-Only Patient Visit History Modal (NO Add Medical Record Button!) */}
      {inspectPatient && (
        <Modal
          isOpen={!!inspectPatient}
          onClose={() => setInspectPatient(null)}
          title={`Patient Profile: ${inspectPatient.name}`}
          subtitle={`Phone: ${inspectPatient.phone} • Age: ${inspectPatient.age} yrs`}
          size="2xl"
        >
          <div className="space-y-4">
            {/* Demographics Summary */}
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">
                    Address
                  </span>
                  <span className="text-neutral-800 font-medium">
                    {inspectPatient.address || 'Not specified'}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">
                    Registered On
                  </span>
                  <span className="font-mono text-neutral-800">
                    {inspectPatient.createdAt ? inspectPatient.createdAt.split('T')[0] : '—'}
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">
                    Known Allergies
                  </span>
                  <span className="font-semibold text-black">
                    {inspectPatient.allergies || 'None'}
                  </span>
                </div>
              </div>
            </div>

            {/* Visit History Timeline */}
            <div>
              <div className="flex items-center gap-2 pb-4">
                <History className="w-4 h-4 text-black" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-black">
                  Clinical History Timeline ({inspectPatientVisits.length} visits)
                </h4>
              </div>

              {inspectPatientVisits.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-neutral-200 rounded text-xs text-neutral-500">
                  No recorded visits yet for this patient.
                </div>
              ) : (
                <div className="relative border-l-2 border-neutral-200 ml-3 space-y-6 pb-2">
                  {inspectPatientVisits.map((v) => (
                    <div key={v.id} className="relative pl-6">
                      {/* Timeline dot */}
                      <div className="absolute -left-2.25 top-1.5 w-4 h-4 rounded-full bg-black border-[3px] border-white shadow-sm" />
                      
                      {/* Timeline content card */}
                      <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm hover:border-black transition">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-neutral-100">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-black">{v.date}</span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                v.status === 'Checking'
                                  ? 'bg-neutral-200 text-black'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {v.status}
                            </span>
                          </div>
                          {v.status === 'Checkout' && (
                            <div className="text-right">
                              <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-bold block mb-0.5">Payment</span>
                              <span className="font-mono text-black font-bold">{v.payAmount ? `${v.payAmount.toLocaleString()} MMK` : '—'}</span>
                              <span className="text-[10px] text-neutral-500 ml-1">({v.paymentType})</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-4 text-xs">
                          {v.status === 'Checkout' ? (
                            <>
                              <div className="bg-neutral-50 p-3 rounded border border-neutral-100">
                                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block mb-1.5">Clinical Vitals</span>
                                <div className="flex flex-col sm:flex-row gap-4">
                                  <p><span className="text-neutral-500">BP:</span> <span className="font-mono font-medium text-black">{v.bloodPressure || '—'}</span></p>
                                  <p><span className="text-neutral-500">Temp:</span> <span className="font-mono font-medium text-black">{v.temperature || '—'}</span></p>
                                </div>
                                {v.nextAppointmentDate && !v.appointmentFulfilled && (
                                  followUpVisitId === v.id ? (
                                    <div className="bg-blue-50/50 p-4 rounded border border-blue-200 mt-3">
                                      <h5 className="font-bold text-black mb-3 flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-blue-600" />
                                        Record Follow-up Vitals
                                      </h5>
                                      <div className="space-y-3">
                                        <Input 
                                          label="Blood Pressure" 
                                          placeholder="e.g., 120/80 mmHg" 
                                          value={followUpData.bp} 
                                          onChange={(e) => setFollowUpData({ ...followUpData, bp: e.target.value })} 
                                        />
                                        <Input 
                                          label="Body Temperature" 
                                          placeholder="e.g., 98.6 °F" 
                                          value={followUpData.temp} 
                                          onChange={(e) => setFollowUpData({ ...followUpData, temp: e.target.value })} 
                                        />
                                        <div className="grid grid-cols-2 gap-3">
                                          <Input 
                                            type="number" 
                                            label="Pay Amount (MMK)" 
                                            value={followUpData.amount} 
                                            onChange={(e) => setFollowUpData({ ...followUpData, amount: e.target.value })} 
                                          />
                                          <div className="space-y-1">
                                            <label className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Payment Type</label>
                                            <select 
                                              className="w-full px-3 py-2 rounded border border-neutral-300 text-xs text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition bg-white"
                                              value={followUpData.type} 
                                              onChange={(e) => setFollowUpData({ ...followUpData, type: e.target.value as PaymentMethod })}
                                            >
                                              <option value="Cash">Cash</option>
                                              <option value="KPay">KPay</option>
                                              <option value="WavePay">WavePay</option>
                                            </select>
                                          </div>
                                        </div>
                                        <div className="flex justify-end gap-2 pt-2">
                                          <Button size="sm" variant="outline" onClick={() => setFollowUpVisitId(null)}>Cancel</Button>
                                          <Button size="sm" variant="primary" onClick={() => handleSaveFollowUp(v)}>Save Follow-up Visit</Button>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div 
                                      className="bg-blue-50/50 p-3 rounded border border-blue-100 cursor-pointer hover:bg-blue-100 transition mt-3"
                                      onClick={() => {
                                        setFollowUpVisitId(v.id!);
                                        setFollowUpData({ bp: '', temp: '', amount: '0', type: 'Cash' });
                                      }}
                                    >
                                      <span className="text-[10px] text-blue-800 uppercase tracking-wider font-bold flex items-center gap-1 mb-1.5">
                                        <Clock className="w-3 h-3" />
                                        Next Appointment Scheduled (Click to Record Return)
                                      </span>
                                      <div className="space-y-1 pointer-events-none">
                                        <p><span className="text-blue-600/80">Date:</span> <span className="font-medium text-blue-900">{v.nextAppointmentDate}</span></p>
                                        <p><span className="text-blue-600/80">Reason:</span> <span className="font-medium text-blue-900">{v.nextAppointmentReason || '—'}</span></p>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="text-neutral-500 italic bg-neutral-50 p-3 rounded border border-neutral-100">
                              Patient is currently in the checking stage. Clinical vitals and payment will be recorded upon checkout.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-neutral-200 mt-4">
              <button
                type="button"
                onClick={handleExportPdf}
                className="px-4 py-2 rounded border border-black bg-white text-black flex items-center gap-2 text-xs font-bold hover:bg-neutral-50 transition"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => setInspectPatient(null)}
                className="px-4 py-2 rounded bg-black text-white text-xs font-bold hover:bg-neutral-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
