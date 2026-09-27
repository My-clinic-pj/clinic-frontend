import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  FileDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Table,
} from 'lucide-react';
import type { Visit, Patient } from '../types';

export const ReportsPage: React.FC = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [notification, setNotification] = useState<string | null>(null);

  // Dexie live queries
  const allVisits = useLiveQuery(() => db.visits.toArray());
  const allPatients = useLiveQuery(() => db.patients.toArray());

  // Patient lookup map
  const patientMap = useMemo(() => {
    const map = new Map<number, Patient>();
    if (allPatients) {
      for (const p of allPatients) {
        if (p.id) map.set(p.id, p);
      }
    }
    return map;
  }, [allPatients]);

  // Generate 7-day trend data (last 7 days from today)
  const sevenDayTrend = useMemo(() => {
    const data: {
      date: string;
      label: string;
      fullDate: string;
      patients: number;
      revenue: number;
      isToday: boolean;
    }[] = [];

    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthDay = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      // All visits for this date
      const dayVisits = allVisits ? allVisits.filter((v) => v.date === dateStr) : [];
      let dayRev = 0;
      for (const v of dayVisits) {
        if (v.status === 'Checkout') {
          dayRev += Number(v.payAmount) || 0;
        }
      }

      data.push({
        date: dateStr,
        label: `${dayName} (${monthDay})`,
        fullDate: dateStr,
        patients: dayVisits.length,
        revenue: dayRev,
        isToday: dateStr === todayStr,
      });
    }

    return data;
  }, [allVisits, todayStr]);

  // Selected date summary metrics
  const selectedDateMetrics = useMemo(() => {
    if (!allVisits) {
      return {
        totalPatients: 0,
        checkingCount: 0,
        checkoutCount: 0,
        totalRevenue: 0,
        cashTotal: 0,
        kpayTotal: 0,
        waveTotal: 0,
      };
    }

    const dayVisits = allVisits.filter((v) => v.date === selectedDate);
    let checkingCount = 0;
    let checkoutCount = 0;
    let totalRevenue = 0;
    let cashTotal = 0;
    let kpayTotal = 0;
    let waveTotal = 0;

    for (const v of dayVisits) {
      if (v.status === 'Checking') {
        checkingCount++;
      } else if (v.status === 'Checkout') {
        checkoutCount++;
        const amt = Number(v.payAmount) || 0;
        totalRevenue += amt;
        if (v.paymentType === 'Cash') cashTotal += amt;
        else if (v.paymentType === 'KPay') kpayTotal += amt;
        else if (v.paymentType === 'WavePay') waveTotal += amt;
      }
    }

    return {
      totalPatients: dayVisits.length,
      checkingCount,
      checkoutCount,
      totalRevenue,
      cashTotal,
      kpayTotal,
      waveTotal,
    };
  }, [allVisits, selectedDate]);

  // Date Navigation handlers
  const handleShiftDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSetToday = () => {
    setSelectedDate(todayStr);
  };

  // 1. Export PDF using jspdf & jspdf-autotable
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Monochrome Report Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text('CLINIC PATIENT MANAGEMENT SYSTEM', 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('CLINICAL ANALYTICS & SUMMARY REPORT (OFFLINE AUDIT)', 14, 26);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 31);
      doc.text(`Filter Date: ${selectedDate} ${selectedDate === todayStr ? '(Today)' : ''}`, 14, 36);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(14, 40, 196, 40);

      // Section 1: Selected Date Summary Metrics
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`1. SUMMARY METRICS FOR ${selectedDate}`, 14, 48);

      const summaryData = [
        ['Total Patients Admitted', `${selectedDateMetrics.totalPatients} patients`],
        ['In Checking Stage', `${selectedDateMetrics.checkingCount} patients`],
        ['Completed Checkout', `${selectedDateMetrics.checkoutCount} patients`],
        ['Total Revenue Collected', `${selectedDateMetrics.totalRevenue.toLocaleString()} MMK`],
        ['Cash Payment Total', `${selectedDateMetrics.cashTotal.toLocaleString()} MMK`],
        ['KBZPay (KPay) Total', `${selectedDateMetrics.kpayTotal.toLocaleString()} MMK`],
        ['WavePay Total', `${selectedDateMetrics.waveTotal.toLocaleString()} MMK`],
      ];

      autoTable(doc, {
        startY: 52,
        head: [['Metric', 'Value']],
        body: summaryData,
        theme: 'plain',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
        },
        styles: {
          textColor: [0, 0, 0],
          lineColor: [220, 220, 220],
          lineWidth: 0.2,
          fontSize: 9,
          cellPadding: 3,
        },
      });

      // Section 2: 7-Day Patient Trend Data Table
      const trendStartY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : 110;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('2. PATIENT TREND OVER LAST 7 DAYS', 14, trendStartY);

      const trendRows = sevenDayTrend.map((t) => [
        t.fullDate,
        t.label,
        `${t.patients} patients`,
        `${t.revenue.toLocaleString()} MMK`,
      ]);

      autoTable(doc, {
        startY: trendStartY + 4,
        head: [['Date', 'Day', 'Patient Volume', 'Settled Revenue']],
        body: trendRows,
        theme: 'plain',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          lineColor: [200, 200, 200],
          lineWidth: 0.2,
        },
        styles: {
          textColor: [0, 0, 0],
          lineColor: [220, 220, 220],
          lineWidth: 0.2,
          fontSize: 9,
          cellPadding: 3,
        },
      });

      // Section 3: Completed Visits List for selected date (if any)
      const selectedVisits = allVisits ? allVisits.filter((v) => v.date === selectedDate) : [];
      if (selectedVisits.length > 0) {
        const visitsStartY = (doc as any).lastAutoTable.finalY + 12;
        if (visitsStartY < 240) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.text(`3. VISITS LOGGED FOR ${selectedDate}`, 14, visitsStartY);

          const visitRows = selectedVisits.map((v) => {
            const p = patientMap.get(v.patientId);
            return [
              p ? p.name : `Patient #${v.patientId}`,
              p ? p.phone : '—',
              v.status,
              v.bloodPressure || '—',
              v.temperature || '—',
              v.paymentType || '—',
              v.payAmount ? `${v.payAmount.toLocaleString()} MMK` : '0 MMK',
            ];
          });

          autoTable(doc, {
            startY: visitsStartY + 4,
            head: [['Patient', 'Phone', 'Status', 'BP', 'Temp', 'Payment', 'Amount']],
            body: visitRows,
            theme: 'plain',
            headStyles: {
              fillColor: [240, 240, 240],
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              lineColor: [200, 200, 200],
              lineWidth: 0.2,
            },
            styles: {
              textColor: [0, 0, 0],
              lineColor: [220, 220, 220],
              lineWidth: 0.2,
              fontSize: 8,
              cellPadding: 2.5,
            },
          });
        }
      }

      // Footer
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(
          `Clinic Patient Management System • Confidential Clinical Audit • Page ${i} of ${totalPages}`,
          14,
          288
        );
      }

      doc.save(`Clinic-Report-${selectedDate}.pdf`);
      setNotification(`PDF report downloaded successfully for ${selectedDate}`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      setNotification('Failed to generate PDF. Please try again.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // 2. Export CSV (Excel)
  const handleExportCSV = () => {
    if (!allVisits || allVisits.length === 0) {
      setNotification('No data available to export.');
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    try {
      const headers = [
        'Visit Date',
        'Patient Name',
        'Patient Phone',
        'Patient Age',
        'Patient Address',
        'Status',
        'Blood Pressure',
        'Temperature',
        'Payment Type',
        'Amount (MMK)',
      ];

      const rows = allVisits.map((v) => {
        const p = patientMap.get(v.patientId);
        return [
          v.date || '',
          p ? p.name : `Patient #${v.patientId}`,
          p ? p.phone : '',
          p && p.age ? String(p.age) : '',
          p && p.address ? p.address : '',
          v.status || '',
          v.bloodPressure || '',
          v.temperature || '',
          v.paymentType || '',
          v.payAmount ? String(v.payAmount) : '0',
        ]
          .map((field) => `"${field.replace(/"/g, '""')}"`)
          .join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      // Adding BOM so Excel handles UTF-8 correctly
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Clinic-Report-AllData-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setNotification('Excel (CSV) export downloaded successfully.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      setNotification('Failed to generate CSV. Please try again.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const isToday = selectedDate === todayStr;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Notification Toast */}
      {notification && (
        <div className="p-3 bg-black text-white text-xs font-medium rounded flex items-center justify-between transition">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header with Export PDF */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-500">
              Analytics
            </span>
            <span className="text-xs font-mono text-neutral-400">•</span>
            <span className="text-xs text-neutral-500 font-medium">Offline Dexie Storage</span>
          </div>
          <h1 className="text-2xl font-black text-black tracking-tight mt-0.5">
            Reports &amp; Analytics
          </h1>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={<Table className="w-4 h-4" />}
            onClick={handleExportCSV}
          >
            Export to Excel (CSV)
          </Button>

          <Button
            size="sm"
            variant="primary"
            icon={<FileDown className="w-4 h-4" />}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* TOP SECTION: Animated Line Chart (Patient Trend over the last 7 days) */}
      <Card
        title="Patient Trend over the last 7 days"
        subtitle="Daily volume of clinical patient visits across the past week"
        action={
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-black border border-neutral-300">
              <TrendingUp className="w-3 h-3 text-black" />
              7-Day Total: {sevenDayTrend.reduce((acc, d) => acc + d.patients, 0)} visits
            </span>
          </div>
        }
      >
        <div className="h-72 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sevenDayTrend}
              margin={{ top: 15, right: 20, left: -20, bottom: 5 }}
            >
              {/* Subtle horizontal grid lines only */}
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E5E5"
                vertical={false}
              />

              {/* X Axis */}
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#666666', fontFamily: 'monospace' }}
                stroke="#CCCCCC"
                tickLine={{ stroke: '#CCCCCC' }}
                dy={6}
              />

              {/* Y Axis */}
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#666666', fontFamily: 'monospace' }}
                stroke="#CCCCCC"
                tickLine={{ stroke: '#CCCCCC' }}
                domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax * 1.25))]}
              />

              {/* Custom Monochrome Minimalist Tooltip */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-black p-3 shadow-sm rounded text-xs space-y-1">
                        <div className="font-bold text-black border-b border-neutral-200 pb-1 flex items-center justify-between gap-4">
                          <span>{data.fullDate}</span>
                          {data.isToday && (
                            <span className="text-[10px] px-1 rounded bg-black text-white">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1">
                          <span className="text-neutral-500">Total Visits:</span>
                          <span className="font-bold font-mono text-black">
                            {data.patients} patient{data.patients === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-neutral-500">Total Revenue:</span>
                          <span className="font-mono font-bold text-black">
                            {data.revenue.toLocaleString()} MMK
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Animated Solid Line */}
              <Line
                type="monotone"
                dataKey="patients"
                name="Patients"
                stroke="#000000"
                strokeWidth={2.5}
                dot={{ r: 4.5, fill: '#000000', stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#000000', stroke: '#000000', strokeWidth: 1 }}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 7-Day Quick Day Selection Pills */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
            Quick Select Day:
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {sevenDayTrend.map((d) => {
              const isSelected = d.date === selectedDate;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDate(d.date)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
                    isSelected
                      ? 'bg-black text-white border-black font-bold'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:border-black'
                  }`}
                >
                  {d.date.slice(5)} ({d.patients}p)
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* MIDDLE SECTION: Date Filter & Summary Metric Cards */}
      <div className="space-y-4">
        {/* Date Filter Bar */}
        <div className="p-4 bg-white border border-neutral-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-black shrink-0" />
            <div>
              <span className="text-xs font-bold text-black uppercase tracking-wider block">
                Filter Analytics By Date
              </span>
              <span className="text-xs text-neutral-500">
                Defaults to today; adjust below or use shortcuts
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Previous Day */}
            <button
              type="button"
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 rounded border border-neutral-300 hover:border-black transition text-neutral-700 hover:text-black"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Date Input */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded border border-neutral-300 text-xs font-mono font-bold text-black focus:outline-none focus:border-black bg-white"
            />

            {/* Next Day */}
            <button
              type="button"
              onClick={() => handleShiftDate(1)}
              className="p-1.5 rounded border border-neutral-300 hover:border-black transition text-neutral-700 hover:text-black"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Jump to Today */}
            {!isToday && (
              <button
                type="button"
                onClick={handleSetToday}
                className="px-2.5 py-1.5 text-xs font-bold rounded border border-black bg-black text-white hover:bg-neutral-800 transition"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Summary Metric Cards for Selected Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Total Patients */}
          <Card className="border-neutral-200 hover:border-black transition">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-black" />
                  Total Patients
                </span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-3xl font-black text-black font-mono">
                    {selectedDateMetrics.totalPatients}
                  </span>
                  <span className="text-xs text-neutral-500 font-medium">admissions</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-600 font-mono">
              <span>Checking: {selectedDateMetrics.checkingCount}</span>
              <span>•</span>
              <span>Checkout: {selectedDateMetrics.checkoutCount}</span>
            </div>
          </Card>

          {/* Card 2: Total Revenue */}
          <Card className="border-neutral-200 hover:border-black transition">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-black" />
                  Total Revenue
                </span>
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-3xl font-black text-black font-mono">
                    {selectedDateMetrics.totalRevenue.toLocaleString()}
                  </span>
                  <span className="text-xs font-mono font-bold text-neutral-600">MMK</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
              Settled across {selectedDateMetrics.checkoutCount} completed checkout visit{selectedDateMetrics.checkoutCount === 1 ? '' : 's'}
            </div>
          </Card>

          {/* Card 3: Payment Breakdown */}
          <Card className="border-neutral-200 hover:border-black transition">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-black" />
                  Payment Breakdown
                </span>
                <div className="flex items-baseline gap-2 pt-1 font-mono text-sm font-bold text-black">
                  <span>Cash &amp; Digital Channels</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-neutral-100 space-y-1 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-neutral-500">Cash:</span>
                <span className="font-bold text-black">
                  {selectedDateMetrics.cashTotal.toLocaleString()} MMK
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">KPay:</span>
                <span className="font-bold text-black">
                  {selectedDateMetrics.kpayTotal.toLocaleString()} MMK
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">WavePay:</span>
                <span className="font-bold text-black">
                  {selectedDateMetrics.waveTotal.toLocaleString()} MMK
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
};
