import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { LogOut, Save, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { DEFAULT_CLINIC_NAME, DEFAULT_CLINIC_ADDRESS } from '../lib/defaults';

export default function Settings() {
  const { logout, setGlobalClinicName } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const [form, setForm] = useState({
    clinicName: DEFAULT_CLINIC_NAME,
    address: DEFAULT_CLINIC_ADDRESS,
  });
  
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  // Saved signature from the backend. Kept in state because the canvas isn't
  // mounted yet while the loading spinner is shown.
  const [savedSignature, setSavedSignature] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        if (data.success && data.data) {
          setForm({
            clinicName: data.data.clinicName || DEFAULT_CLINIC_NAME,
            address: data.data.address ?? DEFAULT_CLINIC_ADDRESS,
          });
          setSavedSignature(data.data.signature || '');
        }
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setFetching(false);
      }
    };
    fetchSettings();
  }, []);

  // Draw the saved signature only once loading has finished and the canvas
  // is mounted in the DOM with real layout dimensions.
  useEffect(() => {
    if (fetching || !savedSignature) return;

    let cancelled = false;
    let frameId = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 60; // ~1s of animation frames

    const draw = () => {
      if (cancelled) return;
      const pad = sigCanvasRef.current;
      const canvas = pad?.getCanvas();

      // Wait until the canvas exists and has been laid out
      if (!pad || !canvas || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
        if (++attempts < MAX_ATTEMPTS) frameId = requestAnimationFrame(draw);
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (cancelled || !sigCanvasRef.current) return;
        // Keep the aspect ratio and fit it inside the box. The trimmed PNG was
        // captured at devicePixelRatio, so convert it back to CSS pixels first.
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const naturalW = img.naturalWidth / ratio;
        const naturalH = img.naturalHeight / ratio;
        const scale = Math.min(1, canvas.offsetWidth / naturalW, canvas.offsetHeight / naturalH);
        sigCanvasRef.current.fromDataURL(savedSignature, {
          width: naturalW * scale,
          height: naturalH * scale,
        });
      };
      img.src = savedSignature;
    };

    frameId = requestAnimationFrame(draw);

    // react-signature-canvas clears the canvas on window resize, which would
    // otherwise make Save wipe the stored signature. Redraw it afterwards.
    const handleResize = () => {
      cancelAnimationFrame(frameId);
      attempts = 0;
      frameId = requestAnimationFrame(draw);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [fetching, savedSignature]);

  const clearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
    // Stop the resize handler from bringing back a signature the user cleared
    setSavedSignature('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const signatureDataUrl = sigCanvasRef.current?.isEmpty() 
        ? '' 
        : sigCanvasRef.current?.getTrimmedCanvas().toDataURL('image/png');
        
      const payload = {
        ...form,
        signature: signatureDataUrl
      };
      
      const { data } = await api.post('/settings', payload);
      if (data.success) {
        setGlobalClinicName(form.clinicName);
        setSavedSignature(signatureDataUrl || '');
        alert("Settings saved successfully!");
      }
    } catch (error) {
      console.error("Failed to save settings", error);
      alert("Error saving settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-black" />
        <p className="text-sm">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-black tracking-tight">Clinic Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your clinic profile and digital signature</p>
      </div>

      <form onSubmit={handleSave} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">Clinic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Clinic Name</label>
            <input 
              required 
              value={form.clinicName} 
              onChange={e => setForm({...form, clinicName: e.target.value})} 
              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" 
              placeholder="e.g. HealthCare Plus" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-1">Clinic Address</label>
            <input 
              required 
              value={form.address} 
              onChange={e => setForm({...form, address: e.target.value})} 
              className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" 
              placeholder="123 Medical Avenue, City" 
            />
          </div>
        </div>

        <div className="pt-4">
          <label className="block text-sm font-medium text-black mb-2">Digital Signature</label>
          <div className="border border-gray-300 rounded-md bg-gray-50 overflow-hidden" style={{ height: '160px' }}>
            <SignatureCanvas 
              ref={sigCanvasRef}
              canvasProps={{ className: 'w-full h-full' }}
            />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500">Sign in the box above. This will be used on printed reports.</p>
            <button 
              type="button" 
              onClick={clearSignature}
              className="text-xs font-medium text-gray-600 hover:text-black transition-colors cursor-pointer"
            >
              Clear Signature
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button 
            type="submit" 
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Danger Zone: Log Out */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">Account Security</h2>
        <div className="bg-white border border-red-100 rounded-lg p-6 flex items-center justify-between">
          <div>
            <h3 className="text-base font-medium text-black mb-1">Log Out</h3>
            <p className="text-sm text-gray-500">Securely sign out of your session on this device.</p>
          </div>
          <button 
            onClick={() => setShowLogoutModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-sm font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg border border-gray-200 w-full max-w-sm overflow-hidden animate-fadeIn">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-black mb-1">Ready to leave?</h3>
              <p className="text-sm text-gray-500 mb-6">Are you sure you want to log out of your account?</p>
              
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-2 rounded-md text-sm font-medium text-black border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={logout}
                  className="flex-1 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
