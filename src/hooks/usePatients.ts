import { useState, useCallback } from 'react';
import api from '../lib/api';

/* ------------------------------------------------------------------ */
/*  Types — aligned with the MongoDB-backed Patient model              */
/* ------------------------------------------------------------------ */

export interface PatientPayload {
  phone: string;
  name: string;
  age: number;
  address?: string;
  allergies?: string;
  userId: string;
  status?: 'Checking' | 'Completed';
  vitals?: {
    bloodPressure: string;
    bodyTemperature: string;
  };
  payment?: {
    type: string;
    amount: number;
    settledAt?: string;
  };
  nextAppointmentDate?: string;
  nextAppointmentReason?: string;
  bloodPressure?: string;
  bodyTemperature?: string;
  paymentType?: string;
  paymentAmount?: number;
  visitHistory?: Array<{
    _id?: string;
    date: string;
    status: string;
    vitals?: {
      bloodPressure: string;
      bodyTemperature: string;
    };
    payment?: {
      type: string;
      amount: number;
    };
    paymentAmount?: number;
    paymentType?: string;
    bloodPressure?: string;
    bodyTemperature?: string;
  }>;
}

export interface PatientRecord extends PatientPayload {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

/** Shape of every API response from the backend */
interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data: T;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */
export const usePatients = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** GET /patients/doctor/:userId */
  const fetchPatients = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api({
        method: 'get',
        url: `/patients/doctor/${userId}`,
      });
      const data = (response.data as ApiResponse<PatientRecord[]>).data;
      setPatients(data);
      return data;
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? 'Failed to fetch patients';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /** POST /patients */
  const addPatient = useCallback(async (payload: PatientPayload) => {
    setLoading(true);
    setError(null);
    try {
      await api({ method: 'post', url: '/patients', data: payload });
      // Re-fetch to get the real MongoDB _id
      const refreshed = await api({
        method: 'get',
        url: `/patients/doctor/${payload.userId}`,
      });
      const freshList = (refreshed.data as ApiResponse<PatientRecord[]>).data;
      setPatients(freshList);
      return freshList.find(p => p.phone === payload.phone && p.name === payload.name) ?? null;
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? 'Failed to add patient';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** PUT /patients/:id */
  const updatePatient = useCallback(async (id: string, payload: Partial<PatientPayload>) => {
    setLoading(true);
    setError(null);
    try {
      console.log('[updatePatient] PUT /patients/' + id, payload);
      const response = await api({
        method: 'put',
        url: `/patients/${id}`,
        data: payload,
      });
      const patient = (response.data as ApiResponse<PatientRecord>).data;
      console.log('[updatePatient] Success:', patient);
      setPatients((prev) => prev.map((p) => (p._id === id ? patient : p)));
      return patient;
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? 'Failed to update patient';
      console.error('[updatePatient] FAILED:', err.response?.status, msg);
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** DELETE /patients/:id */
  const deletePatient = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api({ method: 'delete', url: `/patients/${id}` });
      setPatients((prev) => prev.filter((p) => p._id !== id));
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? 'Failed to delete patient';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    patients,
    loading,
    error,
    fetchPatients,
    addPatient,
    updatePatient,
    deletePatient,
  };
};
