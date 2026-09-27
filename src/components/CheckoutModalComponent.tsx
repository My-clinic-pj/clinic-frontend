import React, { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import type { PatientRecord, PatientPayload } from '../hooks/usePatients';

export interface CheckoutModalProps {
  patient: PatientRecord;
  onClose: () => void;
  onSubmit: (id: string, payload: Partial<PatientPayload>) => Promise<any>;
  onSuccess: () => Promise<any>;
}

export function CheckoutModal({ patient, onClose, onSubmit, onSuccess }: CheckoutModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bloodPressure: patient.vitals?.bloodPressure || '',
    bodyTemperature: patient.vitals?.bodyTemperature || '',
    paymentType: 'Cash Payment',
    payAmount: '',
    nextAppointmentDate: '',
    nextAppointmentReason: '',
  });

  const handleSubmit = async () => {
    if (!form.bloodPressure || !form.bodyTemperature || !form.payAmount) return;

    if (!patient || !patient._id) {
      alert('Error: Patient ID is missing. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    const result = await onSubmit(patient._id, {
      status: 'Completed',
      bloodPressure: form.bloodPressure,
      bodyTemperature: form.bodyTemperature,
      paymentType: form.paymentType,
      paymentAmount: Number(form.payAmount),
      nextAppointmentDate: form.nextAppointmentDate || undefined,
      nextAppointmentReason: form.nextAppointmentReason || undefined,
    });

    if (result) {
      await onSuccess();
      setLoading(false);
      onClose();
    } else {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
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

        <div className="p-6 space-y-8 overflow-y-auto">
          <div>
            <h3 className="text-xs uppercase tracking-wider mb-4 text-gray-400">Patient Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-md border border-gray-200">
              <div>
                <p className="text-xs text-gray-500 mb-1">FULL NAME & AGE</p>
                <p className="text-sm font-medium text-black">{patient.name}, <span className="font-mono tabular-nums">{patient.age}</span> yrs</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">PHONE NUMBER</p>
                <p className="text-sm font-medium text-black font-mono tabular-nums">{patient.phone}</p>
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

          <div>
            <h3 className="text-xs uppercase tracking-wider mb-4 text-gray-400">Clinical Vitals & Payment Settlement</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-black mb-1">BLOOD PRESSURE *</label>
                <input required value={form.bloodPressure} onChange={e => setForm({...form, bloodPressure: e.target.value})} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="120/80 mmHg" />
                <p className="text-xs text-gray-500 mt-1">Systolic / Diastolic</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">BODY TEMPERATURE *</label>
                <input required value={form.bodyTemperature} onChange={e => setForm({...form, bodyTemperature: e.target.value})} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="98.6 °F" />
                <p className="text-xs text-gray-500 mt-1">Oral / Axillary reading</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">PAYMENT TYPE *</label>
                <select required value={form.paymentType} onChange={e => setForm({...form, paymentType: e.target.value})} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm bg-white">
                  <option value="Cash Payment">Cash Payment</option>
                  <option value="Digital/KPay">Digital/KPay</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">PAY AMOUNT (MMK) *</label>
                <input required type="number" value={form.payAmount} onChange={e => setForm({...form, payAmount: e.target.value})} className="w-full px-4 py-2 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" placeholder="20000" />
                <p className="text-xs text-gray-500 mt-1">Consultation & medicine fee</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-100 p-5 rounded-xl border border-blue-200 mt-6">
            <h3 className="text-xs uppercase tracking-wider mb-4 text-blue-900 font-bold">Next Appointment (Optional)</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">DATE</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={form.nextAppointmentDate} 
                  onChange={e => setForm({...form, nextAppointmentDate: e.target.value})} 
                  className="w-full px-4 py-2 rounded-md border border-blue-200 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 outline-none transition-all text-sm font-mono tabular-nums bg-white text-gray-900" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-1">REASON FOR RETURN</label>
                <textarea 
                  rows={2}
                  value={form.nextAppointmentReason} 
                  onChange={e => setForm({...form, nextAppointmentReason: e.target.value})} 
                  className="w-full px-4 py-2 rounded-md border border-blue-200 focus:border-blue-900 focus:ring-1 focus:ring-blue-900 outline-none transition-all text-sm bg-white resize-none text-gray-900" 
                  placeholder="Review blood test results" 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 rounded-md text-sm font-semibold text-black border border-gray-300 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading || !form.bloodPressure || !form.bodyTemperature || !form.payAmount} className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-black text-white text-sm font-bold hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {loading ? 'Processing...' : 'Check Out'}
          </button>
        </div>
      </div>
    </div>
  );
}
