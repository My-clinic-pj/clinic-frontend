import React, { useState } from 'react';
import { db } from '../db/db';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { CheckCircle2, User, Phone, MapPin, AlertTriangle, Activity, Thermometer } from 'lucide-react';
import type { Visit, Patient, PaymentMethod } from '../types';

interface CheckOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: Visit | null;
  patient: Patient | null;
  onSuccess?: () => void;
}

export const CheckOutModal: React.FC<CheckOutModalProps> = ({
  isOpen,
  onClose,
  visit,
  patient,
  onSuccess,
}) => {
  const [bloodPressure, setBloodPressure] = useState('');
  const [temperature, setTemperature] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentMethod>('Cash');
  const [payAmount, setPayAmount] = useState<string>('');

  const [nextAppointmentDate, setNextAppointmentDate] = useState('');
  const [nextAppointmentReason, setNextAppointmentReason] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visit || !visit.id) {
      setError('No active visit selected.');
      return;
    }

    const trimmedBp = bloodPressure.trim();
    const trimmedTemp = temperature.trim();
    const parsedAmount = parseFloat(payAmount);

    if (!trimmedBp) {
      setError('Please provide Blood Pressure reading.');
      return;
    }
    if (!trimmedTemp) {
      setError('Please provide Body Temperature reading.');
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setError('Please provide a valid payment amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await db.visits.update(visit.id, {
        status: 'Checkout',
        bloodPressure: trimmedBp,
        temperature: trimmedTemp,
        paymentType,
        payAmount: parsedAmount,
        nextAppointmentDate: nextAppointmentDate || undefined,
        nextAppointmentReason: nextAppointmentReason.trim() || undefined,
      });

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to checkout visit:', err);
      setError('Failed to record checkout. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedCheckinTime = visit
    ? new Date(visit.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Patient Check Out"
      subtitle="Complete clinical vitals and finalize payment settlement"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-neutral-50 border border-black text-black text-xs rounded">
            {error}
          </div>
        )}

        {/* Read-Only Patient Data at the Top */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
            <span className="text-[11px] uppercase tracking-wider font-bold text-neutral-500">
              Patient Information (Read-Only)
            </span>
            <span className="text-xs font-mono text-neutral-500">
              Checked In at {formattedCheckinTime}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">
                Full Name &amp; Age
              </span>
              <span className="font-bold text-black text-sm">
                {patient ? `${patient.name} (${patient.age} yrs)` : '—'}
              </span>
            </div>

            <div>
              <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">
                Phone Number
              </span>
              <span className="font-mono font-semibold text-black">
                {patient ? patient.phone : '—'}
              </span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">
                Residential Address
              </span>
              <span className="text-neutral-800">
                {patient?.address || 'Not specified'}
              </span>
            </div>

            <div className="sm:col-span-2">
              <span className="text-neutral-500 block text-[10px] uppercase tracking-wider">
                Known Allergies
              </span>
              <span className={`font-semibold ${patient?.allergies && patient.allergies.toLowerCase() !== 'none' ? 'text-black underline' : 'text-neutral-700'}`}>
                {patient?.allergies || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Checkout Form Fields */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-black">
            Clinical Vitals &amp; Payment Settlement
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Blood Pressure */}
            <Input
              label="Blood Pressure"
              required
              placeholder="e.g., 120/80 mmHg"
              value={bloodPressure}
              onChange={(e) => setBloodPressure(e.target.value)}
              helperText="Systolic / Diastolic"
            />

            {/* Body Temperature */}
            <Input
              label="Body Temperature"
              required
              placeholder="e.g., 98.6 °F or 37.0 °C"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              helperText="Oral / Axillary reading"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Type Dropdown */}
            <Select
              label="Payment Type"
              required
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as PaymentMethod)}
              options={[
                { value: 'Cash', label: 'Cash Payment' },
                { value: 'KPay', label: 'KBZPay (KPay)' },
                { value: 'WavePay', label: 'WavePay' },
              ]}
            />

            {/* Pay Amount */}
            <Input
              label="Pay Amount (MMK)"
              required
              type="number"
              min={0}
              step={500}
              placeholder="e.g., 25000"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              helperText="Consultation &amp; medicine fee"
            />
          </div>

          <div className="bg-gray-100 p-4 sm:p-5 rounded-md border border-neutral-200 mt-6 flex flex-col gap-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-black">
              Next Appointment Details
            </h4>
            
            {/* Next Appointment Date */}
            <Input
              label="Next Appointment Date"
              type="date"
              min={today}
              value={nextAppointmentDate}
              onChange={(e) => setNextAppointmentDate(e.target.value)}
              helperText="Optional"
            />

            {/* Next Appointment Reason */}
            <Textarea
              label="Reason for Next Appointment"
              placeholder="e.g., Follow-up check, Blood test"
              rows={3}
              value={nextAppointmentReason}
              onChange={(e) => setNextAppointmentReason(e.target.value)}
              helperText="Optional"
            />
          </div>
        </div>

        {/* Action Buttons: Cancel and Check Out */}
        <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2.5">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            icon={<CheckCircle2 className="w-4 h-4" />}
            isLoading={isSubmitting}
          >
            Check Out
          </Button>
        </div>
      </form>
    </Modal>
  );
};
