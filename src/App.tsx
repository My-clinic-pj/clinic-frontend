import { useState, useEffect } from 'react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from '@clerk/clerk-react';
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
  Settings,
  Clock,
  CheckCircle,
  DollarSign,
  Check
} from 'lucide-react';
import { usePatients, type PatientPayload, type PatientRecord } from './hooks/usePatients';



function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full mx-4 text-center space-y-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-black">
          <HeartPulse className="w-8 h-8 text-white" />
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-black">
            My Clinic
          </h1>
          <p className="text-lg text-gray-500 max-w-sm mx-auto">
            A minimalist, professional patient management system.
          </p>
        </div>
        <SignInButton mode="modal">
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-md bg-black text-white font-medium hover:bg-gray-800 transition-colors cursor-pointer">
            <ShieldCheck className="w-5 h-5" />
            Sign in to Continue
          </button>
        </SignInButton>
        <p className="text-xs text-gray-400">
          Protected by Clerk
        </p>
      </div>
    </div>
  );
}

interface AddPatientModalProps {
  onClose: () => void;
  onSubmit: (data: PatientPayload) => Promise<any>;
  loading: boolean;
  userId: string;
}

function AddPatientModal({ onClose, onSubmit, loading, userId }: AddPatientModalProps) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    address: '',
    allergies: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim(),
      age: Number(form.age),
      address: form.address.trim(),
      allergies: form.allergies.trim(),
      userId,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md overflow-hidden animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-black">New Patient</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="e.g. Aung Aung" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="09xxxxxxxxx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Age <span className="text-red-500">*</span></label>
            <input required type="number" min={0} max={150} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="25" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="Yangon, Myanmar" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
            <input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="None" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 border border-transparent transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CheckoutModalProps {
  patient: PatientRecord;
  onClose: () => void;
  onSubmit: (id: string, payload: Partial<PatientPayload>) => Promise<any>;
  onSuccess: () => Promise<any>;
}

function CheckoutModal({ patient, onClose, onSubmit, onSuccess }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bloodPressure: '',
    bodyTemperature: '',
    paymentType: 'Cash Payment',
    payAmount: '',
  });

  const handleSubmit = async () => {
    if (!form.bloodPressure || !form.bodyTemperature || !form.payAmount) return;

    setLoading(true);
    await onSubmit(patient._id, {
      status: 'Completed',
      vitals: {
        bloodPressure: form.bloodPressure,
        bodyTemperature: form.bodyTemperature,
      },
      payment: {
        type: form.paymentType,
        amount: Number(form.payAmount),
      },
    });

    // Re-fetch patients to get the latest updated data from the backend
    await onSuccess();

    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-2xl overflow-hidden animate-fadeIn">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-black tracking-tight">Patient Check Out</h2>
              <p className="text-sm text-gray-500 mt-1">Complete clinical vitals and finalize payment settlement</p>
            </div>
            <button onClick={onClose} disabled={loading} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer disabled:opacity-50">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Read-only Info */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Patient Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md border border-gray-200">
              <div>
                <p className="text-xs text-gray-500 mb-1">FULL NAME & AGE</p>
                <p className="text-sm font-medium text-black">{patient.name}, {patient.age} yrs</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">PHONE NUMBER</p>
                <p className="text-sm font-medium text-black">{patient.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">RESIDENTIAL ADDRESS</p>
                <p className="text-sm font-medium text-black">{patient.address || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">KNOWN ALLERGIES</p>
                <p className="text-sm font-medium text-black">{patient.allergies || 'None'}</p>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Clinical Vitals & Payment Settlement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-1">BLOOD PRESSURE *</label>
                <input required value={form.bloodPressure} onChange={e => setForm({ ...form, bloodPressure: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="120/80 mmHg" />
                <p className="text-xs text-gray-500 mt-1">Systolic / Diastolic</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">BODY TEMPERATURE *</label>
                <input required value={form.bodyTemperature} onChange={e => setForm({ ...form, bodyTemperature: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="98.6 °F" />
                <p className="text-xs text-gray-500 mt-1">Oral / Axillary reading</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">PAYMENT TYPE *</label>
                <select required value={form.paymentType} onChange={e => setForm({ ...form, paymentType: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white">
                  <option value="Cash Payment">Cash Payment</option>
                  <option value="Digital/KPay">Digital/KPay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">PAY AMOUNT (MMK) *</label>
                <input required type="number" value={form.payAmount} onChange={e => setForm({ ...form, payAmount: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="20000" />
                <p className="text-xs text-gray-500 mt-1">Consultation & medicine fee</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded-md text-sm font-medium text-black border border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading || !form.bloodPressure || !form.bodyTemperature || !form.payAmount} className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {loading ? 'Processing...' : 'Check Out'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardView() {
  const { user } = useUser();
  const { patients, loading, error, fetchPatients, addPatient, updatePatient } = usePatients();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [activeTableTab, setActiveTableTab] = useState<'checking' | 'checkout'>('checking');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedPatientForCheckout, setSelectedPatientForCheckout] = useState<PatientRecord | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchPatients(user.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Derive separated lists
  const checkingPatients = patients.filter(p => !p.status || p.status === 'Checking');
  const completedPatients = patients.filter(p => p.status === 'Completed');

  // Calculate today's revenue from completed patients
  const completedToday = completedPatients.filter(p => {
    const settledAt = p.payment?.settledAt;
    if (!settledAt) return false;
    return new Date(settledAt).toDateString() === new Date().toDateString();
  });

  const todayRevenue = completedToday.reduce((sum, p) => sum + (p.payment?.amount || 0), 0);

  // Filter the currently active tab by search
  const displayPatients = activeTableTab === 'checking' ? checkingPatients : completedPatients;
  const filtered = displayPatients.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black tracking-tight">Dashboard</h1>
        <button onClick={() => setShowAddModal(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors cursor-pointer">
          <Plus className="w-4 h-4" /> Check-in Patient
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'IN CHECKING STAGE', value: checkingPatients.length, icon: Clock },
          { label: 'COMPLETED TODAY', value: completedToday.length, icon: CheckCircle },
          { label: '$ TODAY\'S REVENUE', value: `${todayRevenue.toLocaleString()} MMK`, icon: DollarSign },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 p-6 rounded-lg flex items-center gap-4">
            <div className="w-12 h-12 rounded-md bg-gray-50 flex items-center justify-center border border-gray-200 shrink-0">
              <stat.icon className="w-6 h-6 text-black" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{stat.label}</p>
              <p className="text-2xl font-bold text-black tracking-tight mt-1">{stat.value}</p>
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
              className={`pb-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${activeTableTab === 'checking'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
                } -mb-px`}
            >
              CHECKING STAGE ({checkingPatients.length})
            </button>
            <button
              onClick={() => setActiveTableTab('checkout')}
              className={`pb-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${activeTableTab === 'checkout'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
                } -mb-px`}
            >
              CHECKOUT STAGE ({completedPatients.length})
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
                  <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider hidden sm:table-cell">Age</th>
                  <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider hidden md:table-cell">Address</th>
                  <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider hidden lg:table-cell">Allergies</th>
                  <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider">Check-in Time</th>
                  <th className="px-6 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-black whitespace-nowrap">{p.name}</td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {p.phone}
                    </td>
                    <td className="px-6 py-4 text-gray-600 hidden sm:table-cell">{p.age}</td>
                    <td className="px-6 py-4 text-gray-600 hidden md:table-cell truncate max-w-[150px]">
                      {p.address || '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 hidden lg:table-cell">
                      {p.allergies && p.allergies.toLowerCase() !== 'none' ? (
                        <span className="text-black font-medium">{p.allergies}</span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {activeTableTab === 'checking' ? (
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedPatientForCheckout(p);
                              setIsCheckoutModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center px-4 py-1.5 rounded-md bg-black text-white text-xs font-medium hover:bg-gray-800 transition-colors cursor-pointer"
                          >
                            Check Out
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center justify-end gap-2">
                          <span className="text-gray-400 text-xs px-2">Completed</span>
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

      {showAddModal && user?.id && <AddPatientModal onClose={() => setShowAddModal(false)} onSubmit={addPatient} loading={loading} userId={user.id} />}

      {isCheckoutModalOpen && selectedPatientForCheckout && (
        <CheckoutModal
          patient={selectedPatientForCheckout}
          onClose={() => {
            setIsCheckoutModalOpen(false);
            setSelectedPatientForCheckout(null);
          }}
          onSubmit={updatePatient}
          onSuccess={() => { if (user?.id) fetchPatients(user.id); }}
        />
      )}
    </div>
  );
}

function MainLayout() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-20">
        <div className="h-16 px-6 border-b border-gray-200 flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-black tracking-tight truncate">My Clinic</span>
          <span className="w-2 h-2 rounded-full bg-green-500 ml-auto shrink-0" title="Online"></span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${active ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-black'
                  }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 sticky top-0 z-10">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'w-8 h-8 ring-1 ring-gray-200',
              },
            }}
          />
        </header>
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab !== 'dashboard' && (
            <div className="flex flex-col items-center justify-center py-32 text-gray-400">
              <span className="text-sm capitalize">{activeTab} view coming soon.</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <MainLayout />
      </SignedIn>
    </>
  );
}
