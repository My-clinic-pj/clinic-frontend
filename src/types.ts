/**
 * Types and interfaces for the Clinic Patient Management System.
 * Purely offline-first with IndexedDB persistence via Dexie.js.
 */

export type PaymentMethod = 'Cash' | 'KPay' | 'WavePay';
export type VisitStatus = 'Checking' | 'Checkout';

export interface Patient {
  id?: number;
  phone: string;
  name: string;
  age: number;
  address: string;
  allergies: string;
  createdAt: string; // ISO 8601 timestamp
}

export interface Visit {
  id?: number;
  patientId: number;
  date: string; // YYYY-MM-DD
  status: VisitStatus;
  bloodPressure?: string;
  temperature?: string;
  paymentType?: PaymentMethod;
  payAmount?: number;
  nextAppointmentDate?: string;
  nextAppointmentReason?: string;
  appointmentFulfilled?: boolean;
  createdAt: string; // ISO 8601 timestamp
}

export interface VisitWithPatient extends Visit {
  patient?: Patient;
}

export interface DatabaseBackup {
  app: 'ClinicDB';
  version: number;
  exportedAt: string;
  patients: Patient[];
  visits: Visit[];
}

export type ActiveTab = 'dashboard' | 'patients' | 'reports' | 'settings';
