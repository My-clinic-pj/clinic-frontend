import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import type { PatientPayload, PatientRecord } from '../hooks/usePatients';
import { useUser } from '@clerk/clerk-react';



export interface AddPatientModalProps {
  onClose: () => void;
  onSubmit: (data: Partial<PatientPayload>) => Promise<any>;
  loading: boolean;
  existingPatient?: PatientRecord | null;
}

export function AddPatientModal({ onClose, onSubmit, loading, existingPatient }: AddPatientModalProps) {
  const { user, isLoaded } = useUser();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    address: '',
    allergies: '',
  });

  useEffect(() => {
    if (existingPatient) {
      setForm({
        name: existingPatient.name,
        phone: existingPatient.phone,
        age: String(existingPatient.age),
        address: existingPatient.address || '',
        allergies: existingPatient.allergies || '',
      });
    }
  }, [existingPatient]);

  if (!isLoaded) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<PatientPayload> = {
      status: 'Checking',
    };

    if (!existingPatient) {
      payload.name = form.name.trim();
      payload.phone = form.phone.trim();
      payload.age = Number(form.age);
      payload.address = form.address.trim();
      payload.allergies = form.allergies.trim();
      payload.userId = user?.id || '';
    }

    await onSubmit(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-md overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-black">{existingPatient ? 'Return Visit Check-in' : 'New Patient'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input required disabled={!!existingPatient} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-500" placeholder="e.g. Aung Aung" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
            <input required disabled={!!existingPatient} inputMode="numeric" pattern="[0-9]*" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-500" placeholder="09xxxxxxxxx" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age <span className="text-red-500">*</span></label>
              <input required disabled={!!existingPatient} type="number" min={0} max={150} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-500" placeholder="25" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input disabled={!!existingPatient} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-500" placeholder="Yangon, Myanmar" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allergies</label>
            <textarea disabled={!!existingPatient} rows={2} value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm resize-none disabled:bg-gray-100 disabled:text-gray-500" placeholder="e.g., Penicillin, Peanuts (Leave empty if none)" />
          </div>
          

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-sm font-semibold text-gray-600 hover:bg-gray-100 border border-transparent transition-colors cursor-pointer">Cancel</button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-black text-white text-sm font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {existingPatient ? 'Check-in Return Visit' : 'Save Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
