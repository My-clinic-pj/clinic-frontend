import { useState, useCallback, useRef } from 'react';
import { useAxios } from '../lib/api';

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

export function usePatients() {
  const axios = useAxios();

  // Store axios in a ref so callbacks never need it as a dependency.
  // useAxios already returns a stable instance, but this is extra safety.
  const axiosRef = useRef(axios);
  axiosRef.current = axios;

  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** GET /patients/doctor/:userId */
  const fetchPatients = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosRef.current.get<ApiResponse<PatientRecord[]>>(
        `/patients/doctor/${userId}`
      );
      const patients = response.data.data;
      setPatients(patients);
      return patients;
    } catch (err: any) {
      const msg =
        err.response?.data?.message ?? err.message ?? 'Failed to fetch patients';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []); // ← no deps — axiosRef.current is always fresh

  /** POST /patients */
  const addPatient = useCallback(async (payload: PatientPayload) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axiosRef.current.post<ApiResponse<PatientRecord>>('/patients', payload);
      const patient = response.data.data;
      setPatients((prev) => [patient, ...prev]);
      return patient;
    } catch (err: any) {
      const msg =
        err.response?.data?.message ?? err.message ?? 'Failed to add patient';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /** PUT /patients/:id */
  const updatePatient = useCallback(
    async (id: string, payload: Partial<PatientPayload>) => {
      setLoading(true);
      setError(null);
      try {
        const response = await axiosRef.current.put<ApiResponse<PatientRecord>>(
          `/patients/${id}`,
          payload
        );
        const patient = response.data.data;
        setPatients((prev) => prev.map((p) => (p._id === id ? patient : p)));
        return patient;
      } catch (err: any) {
        const msg =
          err.response?.data?.message ?? err.message ?? 'Failed to update patient';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /** DELETE /patients/:id */
  const deletePatient = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await axiosRef.current.delete(`/patients/${id}`);
      setPatients((prev) => prev.filter((p) => p._id !== id));
      return true;
    } catch (err: any) {
      const msg =
        err.response?.data?.message ?? err.message ?? 'Failed to delete patient';
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
}
