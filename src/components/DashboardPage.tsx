import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { PaymentBadge } from './ui/Badge';
import { Pagination } from './ui/Pagination';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';
import {
  UserPlus,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  Activity,
  Thermometer,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type { Patient, Visit } from '../types';

interface DashboardPageProps {
  onGoToPatients: () => void;
  onGoToReports: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onGoToPatients,
  onGoToReports,
}) => {
  const [activeStage, setActiveStage] = useState<'checking' | 'checkout'>('checking');
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  // Selected visit and patient for checkout modal
  const [selectedVisitForCheckout, setSelectedVisitForCheckout] = useState<Visit | null>(null);
  const [selectedPatientForCheckout, setSelectedPatientForCheckout] = useState<Patient | null>(null);

  // Pagination states
  const [checkingPage, setCheckingPage] = useState(1);
  const [checkoutPage, setCheckoutPage] = useState(1);
  const PAGE_SIZE = 10;

  const todayStr = new Date().toISOString().split('T')[0];

  // Dexie live queries
  const allPatients = useLiveQuery(() => db.patients.toArray());
  const allVisits = useLiveQuery(() => db.visits.reverse().sortBy('createdAt'));

  // Patient Map for fast O(1) lookups
  const patientMap = useMemo(() => {
    const map = new Map<number, Patient>();
    if (allPatients) {
      for (const p of allPatients) {
        if (p.id) map.set(p.id, p);
      }
    }
    return map;
  }, [allPatients]);

  // Split visits by status
  const checkingVisits = useMemo(() => {
    if (!allVisits) return [];
    return allVisits.filter((v) => v.status === 'Checking');
  }, [allVisits]);

  const checkoutVisits = useMemo(() => {
    if (!allVisits) return [];
    return allVisits.filter((v) => v.status === 'Checkout');
  }, [allVisits]);

  // Compute upcoming appointments for badges
  const patientUpcomingAppointments = useMemo(() => {
    const map = new Map<number, boolean>();
    if (allVisits) {
      for (const v of allVisits) {
        if (v.nextAppointmentDate && v.nextAppointmentDate >= todayStr && !v.appointmentFulfilled) {
          map.set(v.patientId, true);
        }
      }
    }
    return map;
  }, [allVisits, todayStr]);

  // Today's specific metrics
  const todayMetrics = useMemo(() => {
    if (!allVisits) {
      return {
        totalTodayPatients: 0,
        todayCheckingCount: 0,
        todayCheckoutCount: 0,
        todayRevenue: 0,
        cashTotal: 0,
        kpayTotal: 0,
        waveTotal: 0,
      };
    }

    const todayVisits = allVisits.filter((v) => v.date === todayStr);
    let todayCheckingCount = 0;
    let todayCheckoutCount = 0;
    let todayRevenue = 0;
    let cashTotal = 0;
    let kpayTotal = 0;
    let waveTotal = 0;

    for (const v of todayVisits) {
      if (v.status === 'Checking') {
        todayCheckingCount++;
      } else if (v.status === 'Checkout') {
        todayCheckoutCount++;
        const amt = Number(v.payAmount) || 0;
        todayRevenue += amt;
        if (v.paymentType === 'Cash') cashTotal += amt;
        else if (v.paymentType === 'KPay') kpayTotal += amt;
        else if (v.paymentType === 'WavePay') waveTotal += amt;
      }
    }

    return {
      totalTodayPatients: todayVisits.length,
      todayCheckingCount,
      todayCheckoutCount,
      todayRevenue,
      cashTotal,
      kpayTotal,
      waveTotal,
    };
  }, [allVisits, todayStr]);

  // Paginated records for Checking Stage
  const paginatedCheckingVisits = useMemo(() => {
    const start = (checkingPage - 1) * PAGE_SIZE;
    return checkingVisits.slice(start, start + PAGE_SIZE);
  }, [checkingVisits, checkingPage]);

  // Paginated records for Checkout Stage
  const paginatedCheckoutVisits = useMemo(() => {
    const start = (checkoutPage - 1) * PAGE_SIZE;
    return checkoutVisits.slice(start, start + PAGE_SIZE);
  }, [checkoutVisits, checkoutPage]);

  // Trigger Checkout Modal
  const handleOpenCheckout = (visit: Visit) => {
    const patient = patientMap.get(visit.patientId) || null;
    setSelectedVisitForCheckout(visit);
    setSelectedPatientForCheckout(patient);
  };

  const handleCloseCheckout = () => {
    setSelectedVisitForCheckout(null);
    setSelectedPatientForCheckout(null);
  };

  // Formatted today string
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 overflow-x-hidden">
      {/* Top Header with "Check In Patient" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-500">
              Reception &amp; Triage
            </span>
            <span className="text-xs font-mono text-neutral-400">•</span>
            <span className="text-xs text-neutral-500 font-medium">{formattedToday}</span>
          </div>
          <h1 className="text-2xl font-black text-black tracking-tight mt-0.5">
            Clinic Dashboard
          </h1>
        </div>

        {/* Top Right Action: "Check In Patient" */}
        <Button
          size="md"
          variant="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => setIsCheckInOpen(true)}
        >
          Check In Patient
        </Button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Metric 1: Checking Stage Queue */}
        <Card className="border-neutral-200 hover:border-black transition">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-black" />
                In Checking Stage
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-black font-mono">
                  {checkingVisits.length}
                </span>
                <span className="text-xs text-neutral-500 font-medium">waiting</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
            Patients admitted and awaiting clinical vitals &amp; checkout
          </p>
        </Card>

        {/* Metric 2: Today's Completed Checkouts */}
        <Card className="border-neutral-200 hover:border-black transition">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                Completed Today
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-black font-mono">
                  {todayMetrics.todayCheckoutCount}
                </span>
                <span className="text-xs text-neutral-500 font-medium">settled</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="mt-3 pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
            {todayMetrics.totalTodayPatients} total patient admissions today
          </p>
        </Card>

        {/* Metric 3: Today's Revenue */}
        <Card className="border-neutral-200 hover:border-black transition">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-black" />
                Today&apos;s Revenue
              </span>
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-black font-mono">
                  {todayMetrics.todayRevenue.toLocaleString()}
                </span>
                <span className="text-xs font-mono font-bold text-neutral-600">MMK</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Cash: {todayMetrics.cashTotal.toLocaleString()}</span>
            <span>•</span>
            <span>Digital: {(todayMetrics.kpayTotal + todayMetrics.waveTotal).toLocaleString()}</span>
          </div>
        </Card>
      </div>

      {/* Two Tabs: "Checking Stage" and "Checkout Stage" */}
      <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden">
        {/* Tab Switcher */}
        <div className="flex border-b border-neutral-200 bg-neutral-50">
          <button
            type="button"
            onClick={() => setActiveStage('checking')}
            className={`flex-1 sm:flex-none px-6 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-r border-neutral-200 transition ${
              activeStage === 'checking'
                ? 'bg-white text-black border-b-2 border-b-black'
                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Checking Stage</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                activeStage === 'checking'
                  ? 'bg-black text-white'
                  : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {checkingVisits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStage('checkout')}
            className={`flex-1 sm:flex-none px-6 py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition ${
              activeStage === 'checkout'
                ? 'bg-white text-black border-b-2 border-b-black'
                : 'text-neutral-500 hover:text-black hover:bg-neutral-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Checkout Stage</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                activeStage === 'checkout'
                  ? 'bg-black text-white'
                  : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {checkoutVisits.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Checking Stage Table */}
        {activeStage === 'checking' && (
          <div>
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-black">Active Checking Stage Queue</h3>
                <p className="text-xs text-neutral-500">
                  Patients currently waiting for consultation, examination, and checkout settlement
                </p>
              </div>
            </div>

            {checkingVisits.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Clock className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-black">No patients in Checking Stage</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                  All checked-in patients have completed their visits or no patients are currently admitted.
                </p>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={() => setIsCheckInOpen(true)}
                  >
                    Check In Patient
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-wider text-neutral-500 font-bold">
                      <tr>
                        <th className="px-5 py-3">Patient Name</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3">Age</th>
                        <th className="px-5 py-3">Address</th>
                        <th className="px-5 py-3">Allergies</th>
                        <th className="px-5 py-3">Check-in Time</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {paginatedCheckingVisits.map((visit) => {
                        const patient = patientMap.get(visit.patientId);
                        const checkinTime = new Date(visit.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        const hasAllergies =
                          patient?.allergies && patient.allergies.toLowerCase() !== 'none';

                        return (
                          <tr key={visit.id} className="hover:bg-neutral-50/80 transition">
                            {/* Patient Name */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-black">
                                  {patient ? patient.name : `Patient #${visit.patientId}`}
                                </span>
                                {patientUpcomingAppointments.get(visit.patientId) && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wider">
                                    Follow-up
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Phone */}
                            <td className="px-5 py-3.5 font-mono text-neutral-600">
                              {patient ? patient.phone : '—'}
                            </td>

                            {/* Age */}
                            <td className="px-5 py-3.5 font-mono text-neutral-700">
                              {patient ? `${patient.age} yrs` : '—'}
                            </td>

                            {/* Address */}
                            <td className="px-5 py-3.5 text-neutral-600 max-w-xs truncate">
                              {patient?.address || '—'}
                            </td>

                            {/* Allergies */}
                            <td className="px-5 py-3.5">
                              {hasAllergies ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-black bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300">
                                  <AlertTriangle className="w-3 h-3 text-black" />
                                  {patient?.allergies}
                                </span>
                              ) : (
                                <span className="text-neutral-400">None</span>
                              )}
                            </td>

                            {/* Check-in Time */}
                            <td className="px-5 py-3.5 font-mono text-neutral-600 whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                {checkinTime}
                              </span>
                            </td>

                            {/* Action: "Check Out" Button */}
                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <Button
                                size="sm"
                                variant="primary"
                                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                                onClick={() => handleOpenCheckout(visit)}
                              >
                                Check Out
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination (10 rows per page) */}
                <Pagination
                  currentPage={checkingPage}
                  totalItems={checkingVisits.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCheckingPage}
                />
              </>
            )}
          </div>
        )}

        {/* Tab 2: Checkout Stage Table */}
        {activeStage === 'checkout' && (
          <div>
            <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-black">Completed Checkout Records</h3>
                <p className="text-xs text-neutral-500">
                  Visits with finalized vitals, recorded payments, and complete checkout logs
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={onGoToReports}
              >
                View 7-Day Analytics
              </Button>
            </div>

            {checkoutVisits.length === 0 ? (
              <div className="text-center py-16 px-4">
                <CheckCircle2 className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-black">No checkout records yet</h4>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto mt-1">
                  Once a patient in the Checking Stage is checked out, their recorded vitals and payment will appear here.
                </p>
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] uppercase tracking-wider text-neutral-500 font-bold">
                      <tr>
                        <th className="px-5 py-3">Patient Name</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3">Blood Pressure</th>
                        <th className="px-5 py-3">Temperature</th>
                        <th className="px-5 py-3">Payment Type</th>
                        <th className="px-5 py-3 text-right">Pay Amount</th>
                        <th className="px-5 py-3 text-right">Date &amp; Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {paginatedCheckoutVisits.map((visit) => {
                        const patient = patientMap.get(visit.patientId);
                        const visitTime = new Date(visit.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        });

                        return (
                          <tr key={visit.id} className="hover:bg-neutral-50/80 transition">
                            {/* Patient Name */}
                            <td className="px-5 py-3.5 font-bold text-black whitespace-nowrap">
                              {patient ? patient.name : `Patient #${visit.patientId}`}
                            </td>

                            {/* Phone */}
                            <td className="px-5 py-3.5 font-mono text-neutral-600 whitespace-nowrap">
                              {patient ? patient.phone : '—'}
                            </td>

                            {/* Blood Pressure */}
                            <td className="px-5 py-3.5 font-mono font-medium text-black whitespace-nowrap">
                              {visit.bloodPressure || '—'}
                            </td>

                            {/* Temperature */}
                            <td className="px-5 py-3.5 font-mono text-neutral-700 whitespace-nowrap">
                              {visit.temperature || '—'}
                            </td>

                            {/* Payment Type */}
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <PaymentBadge method={visit.paymentType || 'Cash'} />
                            </td>

                            {/* Pay Amount */}
                            <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono font-bold text-black">
                              {(visit.payAmount || 0).toLocaleString()} MMK
                            </td>

                            {/* Date & Time */}
                            <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono text-neutral-500 text-[11px]">
                              {visit.date} {visitTime}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination (10 rows per page) */}
                <Pagination
                  currentPage={checkoutPage}
                  totalItems={checkoutVisits.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCheckoutPage}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Check In Modal */}
      <CheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        onSuccess={() => {
          setActiveStage('checking');
        }}
      />

      {/* Check Out Modal */}
      <CheckOutModal
        isOpen={!!selectedVisitForCheckout}
        onClose={handleCloseCheckout}
        visit={selectedVisitForCheckout}
        patient={selectedPatientForCheckout}
        onSuccess={() => {
          handleCloseCheckout();
          setActiveStage('checkout');
        }}
      />
    </div>
  );
};
