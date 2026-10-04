import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePatients } from '../hooks/usePatients';
import { useUser } from '@clerk/clerk-react';
import { Download, ChevronLeft, ChevronRight, TrendingUp, Users, DollarSign, Activity, Loader2, PieChart, Calendar } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';



// Helper to format Date to YYYY-MM-DD for input value
const formatDateString = (date: Date) => {
  return date.toISOString().split('T')[0];
};

export default function Reports() {
  const { patients, loading, fetchPatients } = usePatients();
  const { user } = useUser();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Initialize selectedDate to today
  const [selectedDate, setSelectedDate] = useState(formatDateString(new Date()));

  useEffect(() => {
    if (user?.id) fetchPatients(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // --- Handlers for Date Navigation ---
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(formatDateString(d));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(formatDateString(d));
  };

  // --- Calculations for Trend Chart (Last 7 Days) ---
  const chartData = useMemo(() => {
    const data = [];
    // Generate the last 7 days ending on today (or we could end on selectedDate, but prompt says "past week")
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = formatDateString(d);
      
      // Count completed patients for this date
      const count = patients.filter(p => {
        if (p.status !== 'Completed') return false;
        // Ideally use settledAt, but fallback to updatedAt or createdAt
        const checkOutDateStr = p.payment?.settledAt 
          ? formatDateString(new Date(p.payment.settledAt)) 
          : formatDateString(new Date(p.updatedAt || p.createdAt));
        return checkOutDateStr === dateStr;
      }).length;

      // Short label like "Mon", "Tue" or "MM/DD"
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      data.push({
        date: label,
        fullDate: dateStr,
        Checkouts: count
      });
    }
    return data;
  }, [patients]);

  // --- Calculations for Analytics Cards (Selected Date) ---
  const { totalAdmissions, checkingCount, checkoutCount, totalRevenue, paymentBreakdown } = useMemo(() => {
    let admissions = 0;
    let checking = 0;
    let checkout = 0;
    let revenue = 0;
    const breakdown: Record<string, number> = {};

    patients.forEach(p => {
      // For admissions, we usually look at createdAt
      const createdDateStr = formatDateString(new Date(p.createdAt));
      
      if (createdDateStr === selectedDate) {
        admissions++;
        if (p.status === 'Completed') {
          checkout++;
        } else {
          checking++;
        }
      }

      // For revenue, we look at Completed patients who checked out on this date
      // (Using createdDateStr for simplicity here, but settledAt is more precise if available)
      const checkoutDateStr = p.payment?.settledAt 
        ? formatDateString(new Date(p.payment.settledAt)) 
        : formatDateString(new Date(p.updatedAt || p.createdAt));

      if (p.status === 'Completed' && checkoutDateStr === selectedDate && p.payment) {
        revenue += p.payment.amount || 0;
        
        const type = p.payment.type || 'Unknown';
        if (!breakdown[type]) {
          breakdown[type] = 0;
        }
        breakdown[type] += p.payment.amount || 0;
      }
    });

    return {
      totalAdmissions: admissions,
      checkingCount: checking,
      checkoutCount: checkout,
      totalRevenue: revenue,
      paymentBreakdown: Object.entries(breakdown).map(([type, amount]) => ({ type, amount }))
    };
  }, [patients, selectedDate]);

  // --- PDF Export Logic ---
  const handleDownloadPDF = async () => {
    if (!reportRef.current || isExporting) return;
    
    try {
      setIsExporting(true);
      
      // CRITICAL FIX: Wait for React to finish rendering the 'isExporting' state.
      // Without this, Recharts' ResponsiveContainer may asynchronously resize or
      // unmount its SVG while html2canvas is cloning the DOM, causing a fatal crash.
      await new Promise(resolve => setTimeout(resolve, 400));

      const element = reportRef.current;
      
      // 1. Generate PNG using html-to-image (Supports Tailwind v4 oklch natively)
      const imgData = await htmlToImage.toPng(element, { 
        backgroundColor: '#FAFAFA',
        pixelRatio: 2
      });

      if (!imgData || imgData === 'data:,') {
        throw new Error("html-to-image returned a blank image.");
      }
      
      // 2. Bulletproof jsPDF Instantiation (Handles Vite ESM / CJS bugs)
      let pdf: any;
      try {
        pdf = new jsPDF('p', 'mm', 'a4');
      } catch (e) {
        console.warn("Static jsPDF failed, falling back to dynamic import", e);
        const jspdfModule = await import('jspdf');
        const FallbackConstructor = jspdfModule.jsPDF || (jspdfModule as any).default;
        pdf = new FallbackConstructor('p', 'mm', 'a4');
      }
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      // Calculate aspect ratio using original DOM element dimensions
      const pdfHeight = (element.offsetHeight * pdfWidth) / element.offsetWidth;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Clinic_Report_${selectedDate}.pdf`);
    } catch (error: any) {
      console.error("EXACT_PDF_ERROR:", error);
      alert(`Error generating PDF: ${error?.message || error}\nPlease check the console for more details.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Export Button */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black tracking-tight">Analytics & Reports</h1>
        <button 
          onClick={handleDownloadPDF}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {isExporting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
          ) : (
            <><Download className="w-4 h-4" /> Download PDF</>
          )}
        </button>
      </div>

      {loading && patients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
          <p className="text-sm">Loading reports data...</p>
        </div>
      ) : (
        // Report Container (This div gets exported to PDF)
        <div ref={reportRef} className="space-y-6 bg-[#FAFAFA] p-1 -m-1">
          
          {/* Trend Chart Section */}
          <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-black" />
              <h2 className="text-lg font-bold text-black">Patient Trend over the last 7 days</h2>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dx={-10} allowDecimals={false} />
                  <Tooltip 
                    isAnimationActive={false}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#000', marginBottom: '4px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line 
                    isAnimationActive={false}
                    type="monotone" 
                    name="Completed Patients"
                    dataKey="Checkouts" 
                    stroke="#000000" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#000000', strokeWidth: 0 }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Date Filter Section */}
          <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">Filter Analytics By Date</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevDay}
                className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition-all bg-white font-medium text-black min-w-[150px]"
              />
              <button 
                onClick={handleNextDay}
                className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1: Total Patients */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm flex flex-col h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-md bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                  <Users className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Patients</h3>
              </div>
              <div className="mt-2 mb-4">
                <span className="text-4xl font-extrabold text-black tracking-tight">{totalAdmissions}</span>
                <span className="text-sm text-gray-500 ml-2 font-medium">admissions</span>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Activity className="w-4 h-4 text-gray-400" />
                  <span>Checking: <strong className="text-black">{checkingCount}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-black"></span>
                  <span>Checkout: <strong className="text-black">{checkoutCount}</strong></span>
                </div>
              </div>
            </div>

            {/* Card 2: Total Revenue */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm flex flex-col h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-md bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                  <DollarSign className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Revenue</h3>
              </div>
              <div className="mt-2 mb-4">
                <span className="text-4xl font-extrabold text-black tracking-tight">{totalRevenue.toLocaleString()}</span>
                <span className="text-sm text-gray-500 ml-2 font-medium">MMK</span>
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100 text-sm text-gray-500">
                From <strong className="text-black">{checkoutCount}</strong> completed transactions
              </div>
            </div>

            {/* Card 3: Payment Breakdown */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-md bg-gray-50 flex items-center justify-center border border-gray-100 shrink-0">
                  <PieChart className="w-5 h-5 text-black" />
                </div>
                <h3 className="text-xs text-gray-500 font-bold uppercase tracking-wider">Payment Breakdown</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {paymentBreakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-400">
                    No payment data available.
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {paymentBreakdown.map((item, index) => (
                      <li key={index} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-700 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                          {item.type}
                        </span>
                        <span className="font-bold text-black">{item.amount.toLocaleString()} MMK</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
