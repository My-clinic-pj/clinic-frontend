import React, { useState, useEffect, useMemo } from 'react';
import { usePatients, PatientRecord } from '../hooks/usePatients';
import { useUser } from '@clerk/clerk-react';
import { CheckoutModal } from '../components/CheckoutModalComponent';
import { AddPatientModal } from '../components/AddPatientModal';
import { Search, Loader2, Users, X, Activity, DollarSign, Calendar } from 'lucide-react';


const ITEMS_PER_PAGE = 10;

interface PatientProfileModalProps {
  patient: PatientRecord;
  onClose: () => void;
  onCheckOut: (patient: PatientRecord) => void;
}

function PatientProfileModal({ patient, onClose, onCheckOut }: PatientProfileModalProps) {
  const visits = patient.visitHistory || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-3xl overflow-hidden animate-fadeIn">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-black tracking-tight">{patient.name}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1"><Users className="w-4 h-4 text-gray-400" /> {patient.age} yrs</span>
              <span className="text-gray-300">•</span>
              <span>{patient.phone}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-md border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Residential Address</p>
              <p className="text-sm font-medium text-black">{patient.address || '—'}</p>
            </div>
            <div className="p-4 rounded-md border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Registered Date</p>
              <p className="text-sm font-medium text-black">{new Date(patient.createdAt).toLocaleDateString()}</p>
            </div>
            <div className={`p-4 rounded-md border ${patient.allergies && patient.allergies.toLowerCase() !== 'none' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${patient.allergies && patient.allergies.toLowerCase() !== 'none' ? 'text-red-500' : 'text-gray-500'}`}>Known Allergies</p>
              <p className={`text-sm font-medium ${patient.allergies && patient.allergies.toLowerCase() !== 'none' ? 'text-red-700' : 'text-black'}`}>{patient.allergies || 'None'}</p>
            </div>
          </div>

          {/* Upcoming Appointment Section */}
          {patient.nextAppointmentDate && new Date(patient.nextAppointmentDate).getTime() >= new Date().setHours(0, 0, 0, 0) && (
            <div 
              onClick={() => onCheckOut(patient)}
              className="bg-blue-200 text-blue-900 rounded-md p-4 mb-4 cursor-pointer hover:bg-blue-300 transition-colors border border-blue-300"
            >
              <h3 className="text-sm font-bold uppercase tracking-wider mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Upcoming Appointment</span>
                <span className="text-xs bg-blue-900 text-white px-2 py-1 rounded">Record New Visit &rarr;</span>
              </h3>
              <p className="font-medium text-sm mb-1">
                <span className="opacity-75">Date: </span>
                <span className="font-mono tabular-nums">{new Date(patient.nextAppointmentDate).toLocaleDateString()}</span>
              </p>
              {patient.nextAppointmentReason && (
                <p className="font-medium text-sm">
                  <span className="opacity-75">Reason: </span>
                  {patient.nextAppointmentReason}
                </p>
              )}
            </div>
          )}

          {/* Visit History Section */}
          <div>
            <h3 className="text-sm font-bold text-black uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Visit History</h3>
            
            {visits.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm border border-dashed border-gray-200 rounded-md">
                No completed visit history found.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase">BP & Temp</th>
                      <th className="px-4 py-3 font-semibold text-xs text-gray-500 uppercase text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visits.map((v, idx) => (
                      <tr key={v._id || idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-black font-medium">{new Date(v.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${v.status === 'Completed' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'}`}>
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="inline-flex items-center gap-1"><Activity className="w-3 h-3" /> {v.bloodPressure || v.vitals?.bloodPressure || '—'}</span>
                            <span>{v.bodyTemperature || v.vitals?.bodyTemperature || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-900 font-medium text-right text-xs">
                          {v.paymentAmount || (v.payment && v.payment.amount)
                            ? `${(v.paymentAmount || v.payment?.amount || 0).toLocaleString()} MMK (${v.paymentType || v.payment?.type || 'Cash'})` 
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer">
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Patients() {
  const { patients, loading, fetchPatients, updatePatient } = usePatients();
  const { user, isLoaded } = useUser();
  
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [patientForCheckout, setPatientForCheckout] = useState<PatientRecord | null>(null);

  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);
  const [checkinPatient, setCheckinPatient] = useState<PatientRecord | null>(null);

  const handleCheckOut = (patient: PatientRecord) => {
    setSelectedPatient(null);
    setPatientForCheckout(patient);
    setIsCheckoutModalOpen(true);
  };

  useEffect(() => {
    if (user?.id) fetchPatients(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search);
      const matchesDate = dateFilter ? new Date(p.createdAt).toISOString().split('T')[0] === dateFilter : true;
      return matchesSearch && matchesDate;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort newest first
  }, [patients, search, dateFilter]);

  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE) || 1;
  const currentData = filteredPatients.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, dateFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black tracking-tight">Registered Patients</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col shadow-sm w-full">
        {/* Filters Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center w-full sm:max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition-all bg-white"
            />
          </div>
          
          <div className="flex items-center w-full sm:max-w-[200px] gap-2">
            <div className="relative flex-1 sm:w-full">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition-all bg-white text-gray-700"
              />
            </div>
            
            {(search || dateFilter) && (
              <button 
                onClick={() => { setSearch(''); setDateFilter(''); }}
                className="p-2 text-gray-400 hover:text-black bg-gray-200/50 hover:bg-gray-200 rounded-md transition-colors shrink-0"
                title="Clear Filters"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto w-full min-h-[400px]">
          {loading && patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-black" />
              <p className="text-sm">Loading patient directory...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
              <Users className="w-10 h-10 text-gray-300" />
              <p className="text-sm">No patients found matching your criteria.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-white">
                  <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider hidden sm:table-cell">Age</th>
                  <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider hidden md:table-cell">Address</th>
                  <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider hidden lg:table-cell">Allergies</th>
                  <th className="px-6 py-4 font-semibold text-xs text-gray-500 uppercase tracking-wider text-center">Total Visits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentData.map((p) => (
                  <tr 
                    key={p._id} 
                    onClick={() => setSelectedPatient(p)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-medium text-black whitespace-nowrap group-hover:text-gray-700 transition-colors">
                      <div className="flex items-center gap-2">
                        {p.name}
                        {p.nextAppointmentDate && new Date(p.nextAppointmentDate).getTime() >= new Date().setHours(0, 0, 0, 0) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wider border border-blue-200">
                            <Calendar className="w-3 h-3" /> Scheduled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{p.phone}</td>
                    <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">{p.age}</td>
                    <td className="px-6 py-4 text-gray-600 hidden md:table-cell truncate max-w-[150px]">
                      {p.address || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 hidden lg:table-cell">
                      {p.allergies && p.allergies.toLowerCase() !== 'none' ? (
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-black border border-gray-200">{p.allergies}</span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap text-center font-mono tabular-nums">
                      {p.visitHistory?.length || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredPatients.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <span className="text-sm text-gray-500 font-medium">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPatients.length)} of {filteredPatients.length} patients
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-black bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center justify-center w-8 text-sm font-bold text-black">
                {currentPage}
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-md border border-gray-300 text-sm font-medium text-black bg-white hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedPatient && (
        <PatientProfileModal 
          patient={selectedPatient} 
          onClose={() => setSelectedPatient(null)} 
          onCheckOut={handleCheckOut}
        />
      )}

      {isCheckoutModalOpen && patientForCheckout && (
        <CheckoutModal 
          patient={patientForCheckout}
          onClose={() => setIsCheckoutModalOpen(false)}
          onSubmit={updatePatient}
          onSuccess={async () => { if (user?.id) await fetchPatients(user.id); }}
        />
      )}

      {isCheckinModalOpen && checkinPatient && (
        <AddPatientModal
          existingPatient={checkinPatient}
          onClose={() => setIsCheckinModalOpen(false)}
          loading={loading}
          onSubmit={async (payload) => {
            await updatePatient(checkinPatient._id, payload);
            if (user?.id) fetchPatients(user.id);
          }}
        />
      )}
    </div>
  );
}
