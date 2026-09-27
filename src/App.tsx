import { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import AuthScreen from './components/AuthScreen';
import {
  Activity,
  Users,
  Plus,
  Trash2,
  Pencil,
  Search,
  Phone,
  MapPin,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  HeartPulse,
  X,
  LayoutDashboard,
  BarChart,
  Settings as SettingsIcon,
  Clock,
  CheckCircle,
  DollarSign,
  Check,
  LogOut
} from 'lucide-react';
import { usePatients, type PatientPayload, type PatientRecord } from './hooks/usePatients';
import Patients from './pages/Patients';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const DEFAULT_CLINIC_ID = '6ab5ee4e04d787fb8194e8f8';




import { CheckoutModal } from './components/CheckoutModalComponent';
import { AddPatientModal } from './components/AddPatientModal';

function DashboardView() {
  const { patients, loading, error, fetchPatients, addPatient, updatePatient } = usePatients();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [activeTableTab, setActiveTableTab] = useState<'checking' | 'checkout'>('checking');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedPatientForCheckout, setSelectedPatientForCheckout] = useState<PatientRecord | null>(null);

  useEffect(() => {
    fetchPatients(DEFAULT_CLINIC_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive separated lists
  const todayStr = new Date().toDateString();
  const checkingPatients = patients.filter(p => !p.status || p.status === 'Checking');
  const completedPatients = patients.filter(p => p.status === 'Completed');
  
  // Filter for patients who checked out today
  const completedTodayPatients = completedPatients.filter(p => {
    if (!p.visitHistory || p.visitHistory.length === 0) return false;
    return p.visitHistory.some(v => {
      const visitDate = v.date || p.updatedAt;
      return new Date(visitDate).toDateString() === todayStr;
    });
  });
  
  // Calculate today's revenue from all visits across all patients
  let completedTodayCount = 0;

  const todayRevenue = patients.reduce((total, p) => {
    if (!p.visitHistory || p.visitHistory.length === 0) return total;
    
    // Find visits that happened today
    const visitsToday = p.visitHistory.filter(v => {
      // v.date should be available from backend, fallback to createdAt if not
      const visitDate = v.date || p.updatedAt;
      return new Date(visitDate).toDateString() === todayStr;
    });

    // Count today's visits towards completedTodayCount
    if (visitsToday.length > 0) {
      completedTodayCount += visitsToday.length;
    }

    // Sum the paymentAmount for these visits
    const revenueFromVisits = visitsToday.reduce((sum, v) => {
      // Handle both the flat paymentAmount and nested payment.amount for backwards compatibility
      const amount = v.paymentAmount || (v.payment && v.payment.amount) || 0;
      return sum + Number(amount);
    }, 0);
    
    return total + revenueFromVisits;
  }, 0);

  // Filter the currently active tab by search
  const displayPatients = activeTableTab === 'checking' ? checkingPatients : completedTodayPatients;
  const filtered = displayPatients.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black tracking-tight">Dashboard</h1>
        <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md bg-black text-white text-sm font-bold hover:bg-gray-800 transition-colors cursor-pointer shadow-sm">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Check-in Patient</span><span className="sm:hidden">Check-in</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'IN CHECKING STAGE', value: checkingPatients.length, icon: Clock },
          { label: 'COMPLETED TODAY', value: completedTodayCount, icon: CheckCircle },
          { label: '$ TODAY\'S REVENUE', value: `${todayRevenue.toLocaleString()} MMK`, icon: DollarSign },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 p-4 sm:p-6 rounded-lg flex items-center gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-gray-50 flex items-center justify-center border border-gray-200 shrink-0">
              <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-wider truncate">{stat.label}</p>
              <p className="text-lg sm:text-2xl font-black tracking-tight text-black mt-1 font-mono tabular-nums truncate">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Tabs and Search Header */}
        <div className="border-b border-gray-200 px-4 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setActiveTableTab('checking')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTableTab === 'checking' 
                  ? 'border-black text-black font-semibold' 
                  : 'border-transparent text-gray-500 hover:text-gray-800 font-medium'
              } -mb-px`}
            >
              CHECKING STAGE <span className="font-mono tabular-nums">({checkingPatients.length})</span>
            </button>
            <button 
              onClick={() => setActiveTableTab('checkout')}
              className={`pb-3 border-b-2 transition-colors cursor-pointer ${
                activeTableTab === 'checkout' 
                  ? 'border-black text-black font-semibold' 
                  : 'border-transparent text-gray-500 hover:text-gray-800 font-medium'
              } -mb-px`}
            >
              CHECKOUT STAGE <span className="font-mono tabular-nums">({completedTodayPatients.length})</span>
            </button>
          </div>
          
          <div className="flex items-center max-w-sm w-full relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none text-sm transition-all bg-white"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-black text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading && patients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
            <p className="text-sm">Loading records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Users className="w-8 h-8" />
            <p className="text-sm">{search ? 'No patients found.' : 'No patients in this stage.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 font-bold text-xs text-gray-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 font-bold text-xs text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 font-bold text-xs text-gray-500 uppercase tracking-wider hidden sm:table-cell">Age</th>
                  <th className="px-6 py-3 font-bold text-xs text-gray-500 uppercase tracking-wider hidden md:table-cell">Address</th>
                  <th className="px-6 py-3 font-bold text-xs text-gray-500 uppercase tracking-wider hidden lg:table-cell">Allergies</th>
                  <th className="px-6 py-3 font-bold text-xs text-gray-500 uppercase tracking-wider hidden sm:table-cell">Check-in Time</th>
                  <th className="px-6 py-3 font-bold text-xs text-gray-500 uppercase tracking-wider text-right hidden sm:table-cell">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr 
                    key={p._id} 
                    className={`hover:bg-gray-50 transition-colors ${activeTableTab === 'checking' ? 'cursor-pointer sm:cursor-default' : ''}`}
                    onClick={() => {
                      if (activeTableTab === 'checking') {
                        setSelectedPatientForCheckout(p);
                        setIsCheckoutModalOpen(true);
                      }
                    }}
                  >
                    <td className="px-4 sm:px-6 py-4 font-medium text-black whitespace-nowrap">{p.name}</td>
                    <td className="px-4 sm:px-6 py-4 text-gray-600 font-medium font-mono tabular-nums whitespace-nowrap">
                      {p.phone}
                      <div className="text-[10px] text-gray-400 sm:hidden mt-0.5 font-sans">
                        {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium font-mono tabular-nums hidden sm:table-cell">{p.age}</td>
                    <td className="px-6 py-4 text-gray-600 font-medium hidden md:table-cell truncate max-w-[150px]">
                      {p.address || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium hidden lg:table-cell">
                      {p.allergies && p.allergies.toLowerCase() !== 'none' ? (
                        <span className="text-black">{p.allergies}</span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium font-mono tabular-nums whitespace-nowrap hidden sm:table-cell">
                      {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap hidden sm:table-cell">
                      {activeTableTab === 'checking' ? (
                        <div className="inline-flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPatientForCheckout(p);
                              setIsCheckoutModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center px-4 py-1.5 rounded-md bg-black text-white text-xs font-semibold hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            Check Out
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-2">
                          <span className="text-gray-400 font-medium text-xs px-2">Completed</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && <AddPatientModal onClose={() => setShowAddModal(false)} onSubmit={addPatient} loading={loading} />}
      
      {isCheckoutModalOpen && selectedPatientForCheckout && (
        <CheckoutModal 
          patient={selectedPatientForCheckout} 
          onClose={() => {
            setIsCheckoutModalOpen(false);
            setSelectedPatientForCheckout(null);
          }} 
          onSubmit={updatePatient}
          onSuccess={() => fetchPatients(DEFAULT_CLINIC_ID)}
        />
      )}
    </div>
  );
}

function MainLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { username, globalClinicName } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Mobile/Tablet Top Header */}
      <div className="lg:hidden flex items-center gap-3 bg-white border-b border-gray-200 p-4 fixed top-0 left-0 right-0 z-20 shadow-sm">
        <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center shrink-0">
          <HeartPulse className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-bold text-lg text-black tracking-tight truncate leading-tight">{globalClinicName}</span>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden lg:flex flex-col fixed inset-y-0 left-0 z-20">
        <div className="h-16 px-6 border-b border-gray-200 flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-lg text-black tracking-tight truncate leading-tight">{globalClinicName}</span>
            {username && <span className="text-xs text-gray-500 font-medium truncate leading-tight">{username}</span>}
          </div>
          <span className="w-2 h-2 rounded-full bg-green-500 ml-auto shrink-0" title="Online"></span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors cursor-pointer ${
                  active ? 'bg-black text-white font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-black font-medium'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile/Tablet Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 pb-safe shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
        <nav className="flex justify-around items-center p-1.5">
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center p-2 min-w-[64px] transition-colors rounded-lg ${
                  active ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <div className={`p-1.5 rounded-full mb-0.5 transition-colors ${active ? 'bg-gray-100' : ''}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className={`text-[10px] font-medium tracking-wide ${active ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen pt-16 lg:pt-0 pb-20 lg:pb-0 min-w-0">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full lg:mt-6">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'patients' && <Patients />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'settings' && <Settings />}
        </main>
      </div>

    </div>
  );
}

export default function App() {
  const { token } = useAuth();

  return (
    <>
      {!token ? <AuthScreen /> : <MainLayout />}
    </>
  );
}
