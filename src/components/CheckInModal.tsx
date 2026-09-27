import React, { useState } from 'react';
import { db } from '../db/db';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input, Textarea } from './ui/Input';
import { UserCheck, AlertCircle } from 'lucide-react';
import type { Patient, Visit } from '../types';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (visitId: number) => void;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<string>('');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick lookup of existing patient when typing phone
  const handlePhoneChange = async (newPhone: string) => {
    setPhone(newPhone);
    const cleaned = newPhone.trim();
    if (cleaned.length >= 7) {
      try {
        const existing = await db.patients.where('phone').equals(cleaned).first();
        if (existing) {
          if (!name) setName(existing.name);
          if (!age) setAge(String(existing.age));
          if (!address) setAddress(existing.address);
          if (!allergies) setAllergies(existing.allergies || 'None');
        }
      } catch (err) {
        // silent search
      }
    }
  };

  const handleReset = () => {
    setName('');
    setPhone('');
    setAge('');
    setAddress('');
    setAllergies('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const parsedAge = parseInt(age, 10);
    const trimmedAddress = address.trim();
    const trimmedAllergies = allergies.trim() || 'None';

    if (!trimmedName) {
      setError('Patient name is required.');
      return;
    }
    if (!trimmedPhone) {
      setError('Phone number is required.');
      return;
    }
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      setError('Please provide a valid age between 0 and 130.');
      return;
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // Check if patient already exists by phone
      const existingPatient = await db.patients.where('phone').equals(trimmedPhone).first();
      let patientId: number;

      if (existingPatient && existingPatient.id) {
        patientId = existingPatient.id;
        // Update existing patient data with latest info
        await db.patients.update(patientId, {
          name: trimmedName,
          age: parsedAge,
          address: trimmedAddress || existingPatient.address,
          allergies: trimmedAllergies || existingPatient.allergies,
        });
      } else {
        // Create new patient
        const newPatient: Omit<Patient, 'id'> = {
          name: trimmedName,
          phone: trimmedPhone,
          age: parsedAge,
          address: trimmedAddress || 'Not specified',
          allergies: trimmedAllergies,
          createdAt: now.toISOString(),
        };
        const rawId = await db.patients.add(newPatient as Patient);
        patientId = Number(rawId);
      }

      // Create new visit with status='Checking'
      const newVisit: Omit<Visit, 'id'> = {
        patientId,
        date: todayStr,
        status: 'Checking',
        createdAt: now.toISOString(),
      };

      const visitId = await db.visits.add(newVisit as Visit);

      handleReset();
      onClose();
      if (onSuccess) onSuccess(Number(visitId));
    } catch (err) {
      console.error('Failed to check in patient:', err);
      setError('Could not complete check-in. Please verify the input values.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title="Check In Patient"
      subtitle="Register arrival and admit patient to the Checking Stage"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-neutral-50 border border-black text-black text-xs rounded flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Patient Name */}
        <Input
          label="Full Patient Name"
          required
          placeholder="e.g., Daw Khin Myo / U Tin Win"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {/* Phone & Age grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone Number"
            required
            type="tel"
            placeholder="e.g., 0950123456"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            helperText="Auto-fills existing records if phone matches"
          />

          <Input
            label="Age (Years)"
            required
            type="number"
            min={0}
            max={130}
            placeholder="e.g., 45"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>

        {/* Address */}
        <Input
          label="Residential Address"
          placeholder="e.g., No. 24, Bogyoke Road, Bahan, Yangon"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        {/* Allergies */}
        <Textarea
          label="Known Allergies & Drug Sensitivities"
          placeholder="e.g., Penicillin, Sulfa drugs, Aspirin, or 'None'"
          rows={2}
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          helperText="Important for physician checking and triage"
        />

        {/* Modal Buttons: Cancel and Check In */}
        <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              handleReset();
              onClose();
            }}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            icon={<UserCheck className="w-4 h-4" />}
            isLoading={isSubmitting}
          >
            Check In
          </Button>
        </div>
      </form>
    </Modal>
  );
};
