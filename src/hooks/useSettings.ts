import { useState, useEffect } from 'react';
import { DEFAULT_CLINIC_NAME, DEFAULT_CLINIC_ADDRESS } from '../lib/defaults';

export function useSettings() {
  const [clinicName, setClinicName] = useState(() => localStorage.getItem('clinicName') || DEFAULT_CLINIC_NAME);
  const [doctorName, setDoctorName] = useState(() => localStorage.getItem('doctorName') || '');
  const [clinicAddress, setClinicAddress] = useState(() => localStorage.getItem('clinicAddress') || DEFAULT_CLINIC_ADDRESS);
  const [clinicPhone, setClinicPhone] = useState(() => localStorage.getItem('clinicPhone') || '');
  const [doctorSignature, setDoctorSignature] = useState(() => localStorage.getItem('doctorSignature') || '');

  useEffect(() => {
    const handleStorageChange = () => {
      setClinicName(localStorage.getItem('clinicName') || DEFAULT_CLINIC_NAME);
      setDoctorName(localStorage.getItem('doctorName') || '');
      setClinicAddress(localStorage.getItem('clinicAddress') || DEFAULT_CLINIC_ADDRESS);
      setClinicPhone(localStorage.getItem('clinicPhone') || '');
      setDoctorSignature(localStorage.getItem('doctorSignature') || '');
    };
    window.addEventListener('settingsUpdated', handleStorageChange);
    return () => window.removeEventListener('settingsUpdated', handleStorageChange);
  }, []);

  const saveSettings = (clinic: string, doctor: string, address: string, phone: string, signature: string) => {
    localStorage.setItem('clinicName', clinic);
    localStorage.setItem('doctorName', doctor);
    localStorage.setItem('clinicAddress', address);
    localStorage.setItem('clinicPhone', phone);
    localStorage.setItem('doctorSignature', signature);
    setClinicName(clinic);
    setDoctorName(doctor);
    setClinicAddress(address);
    setClinicPhone(phone);
    setDoctorSignature(signature);
    window.dispatchEvent(new Event('settingsUpdated'));
  };

  return { clinicName, doctorName, clinicAddress, clinicPhone, doctorSignature, saveSettings };
}
