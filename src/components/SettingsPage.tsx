import React, { useState, useRef } from 'react';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import {
  Save,
  CheckCircle2,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  DatabaseZap,
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { useSettings } from '../hooks/useSettings';
import { DEFAULT_CLINIC_NAME } from '../lib/defaults';
import {
  exportDatabaseToJson,
  importDatabaseFromJson,
  clearDatabase,
} from '../db/db';

export const SettingsPage: React.FC = () => {
  const { clinicName, doctorName, clinicAddress, clinicPhone, doctorSignature, saveSettings } = useSettings();
  const [localClinicName, setLocalClinicName] = useState(clinicName);
  const [localDoctorName, setLocalDoctorName] = useState(doctorName);
  const [localClinicAddress, setLocalClinicAddress] = useState(clinicAddress);
  const [localClinicPhone, setLocalClinicPhone] = useState(clinicPhone);
  const [localDoctorSignature, setLocalDoctorSignature] = useState(doctorSignature);
  const [isSaved, setIsSaved] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(!doctorSignature);
  const sigCanvas = React.useRef<SignatureCanvas>(null);

  // Data Management state
  const [dbNotification, setDbNotification] = useState<string | null>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedClinic = localClinicName.trim() || DEFAULT_CLINIC_NAME;
    const trimmedDoctor = localDoctorName.trim();
    const trimmedAddress = localClinicAddress.trim();
    const trimmedPhone = localClinicPhone.trim();

    let signatureToSave = localDoctorSignature;
    if (isDrawingMode && sigCanvas.current) {
      if (!sigCanvas.current.isEmpty()) {
        signatureToSave = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
        setLocalDoctorSignature(signatureToSave);
      } else {
        signatureToSave = '';
        setLocalDoctorSignature('');
      }
    }
    saveSettings(trimmedClinic, trimmedDoctor, trimmedAddress, trimmedPhone, localDoctorSignature);
    setLocalClinicName(trimmedClinic);
    setLocalDoctorName(trimmedDoctor);
    setLocalClinicAddress(trimmedAddress);
    setLocalClinicPhone(trimmedPhone);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  // --- Data Management Handlers ---

  const showDbNotification = (msg: string, duration = 4000) => {
    setDbNotification(msg);
    setTimeout(() => setDbNotification(null), duration);
  };

  // Backup JSON
  const handleBackupJSON = async () => {
    try {
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ClinicDB-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showDbNotification('Database backup successfully exported as JSON.');
    } catch (err) {
      console.error('Backup failed:', err);
      showDbNotification('Backup failed. Please check browser permissions.');
    }
  };

  // Restore JSON — triggers hidden file input
  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRestoring(true);
    try {
      const text = await file.text();
      const result = await importDatabaseFromJson(text, 'replace');
      showDbNotification(
        `Restored successfully: ${result.patientsCount} patients and ${result.visitsCount} visits.`,
        5000
      );
    } catch (err: any) {
      console.error('Restore failed:', err);
      showDbNotification(`Restore failed: ${err.message || 'Invalid backup file'}`, 5000);
    } finally {
      setIsRestoring(false);
    }
  };

  // Clear All Data
  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await clearDatabase();
      setIsConfirmClearOpen(false);
      showDbNotification('All patient and visit records have been cleared. Starting fresh.', 5000);
    } catch (err) {
      console.error('Failed to clear database:', err);
      showDbNotification('Failed to clear database. Please try again.', 5000);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      {/* Hidden file input for Restore JSON */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-bold text-neutral-500">
              Configuration
            </span>
          </div>
          <h1 className="text-2xl font-black text-black tracking-tight mt-0.5">
            Settings
          </h1>
        </div>
      </div>

      <Card
        title="Clinic Profile"
        subtitle="Update your clinic and doctor details"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Clinic Name"
              placeholder="e.g., My Clinic"
              value={localClinicName}
              onChange={(e) => {
                setLocalClinicName(e.target.value);
                setIsSaved(false);
              }}
              required
            />
            <Input
              label="Doctor Name"
              placeholder="e.g., John Doe"
              value={localDoctorName}
              onChange={(e) => {
                setLocalDoctorName(e.target.value);
                setIsSaved(false);
              }}
              helperText="Optional. Will be displayed as Dr. John Doe"
            />
            <Input
              label="Clinic Address"
              placeholder="e.g., 123 Main St, Yangon"
              value={localClinicAddress}
              onChange={(e) => {
                setLocalClinicAddress(e.target.value);
                setIsSaved(false);
              }}
            />
            <Input
              label="Clinic Phone Number"
              placeholder="e.g., 09-123456789"
              value={localClinicPhone}
              onChange={(e) => {
                setLocalClinicPhone(e.target.value);
                setIsSaved(false);
              }}
            />
          </div>

          <div className="col-span-1 sm:col-span-2 mt-4">
            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">Doctor's Digital Signature</label>
            {!isDrawingMode && localDoctorSignature ? (
              <div className="border border-neutral-200 rounded p-4 bg-white flex flex-col items-start gap-3">
                <img src={localDoctorSignature} alt="Doctor's Signature" className="h-16 object-contain" />
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setIsDrawingMode(true)}
                >
                  Redraw Signature
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="border border-gray-300 rounded-md bg-gray-50 w-full h-40 overflow-hidden relative">
                  <SignatureCanvas 
                    ref={sigCanvas}
                    canvasProps={{ className: 'w-full h-full block' }}
                    backgroundColor="transparent"
                  />
                </div>
                <div className="flex justify-start items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => sigCanvas.current?.clear()} 
                    className="text-xs font-semibold text-black px-2 py-1 hover:bg-neutral-100 rounded transition"
                  >
                    Clear Signature
                  </button>
                  {localDoctorSignature && (
                    <button 
                      type="button" 
                      onClick={() => setIsDrawingMode(false)} 
                      className="text-xs font-semibold text-neutral-500 px-2 py-1 hover:bg-neutral-100 rounded transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-3">
            {isSaved && (
              <span className="text-xs font-bold text-green-600 flex items-center gap-1 animate-in fade-in slide-in-from-right-4 duration-300">
                <CheckCircle2 className="w-4 h-4" />
                Saved successfully
              </span>
            )}
            <Button
              type="submit"
              variant="primary"
              icon={<Save className="w-4 h-4" />}
            >
              Save Settings
            </Button>
          </div>
        </form>
      </Card>

      {/* ── Data Management Card ── */}
      <Card
        title="Data Management"
        subtitle="Manage your local offline database. Backup your records regularly."
      >
        <div className="space-y-5">

          {/* Notification banner */}
          {dbNotification && (
            <div className="flex items-center justify-between gap-2 p-3 bg-black text-white text-xs font-medium rounded">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{dbNotification}</span>
              </div>
              <button
                type="button"
                onClick={() => setDbNotification(null)}
                className="text-neutral-400 hover:text-white transition shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* Description */}
          <div className="flex items-start gap-3 p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg">
            <DatabaseZap className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-600 leading-relaxed">
              <span className="font-bold text-black block mb-0.5">Offline IndexedDB (Dexie)</span>
              All patient and visit data is stored locally in your browser. Use{' '}
              <strong>Backup App Data</strong> to export a snapshot, and{' '}
              <strong>Restore App Data</strong> to re-import a previous backup. Backups are not synced to any cloud.
            </div>
          </div>

          {/* Backup & Restore buttons (grouped) */}
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-neutral-500 mb-2.5">
              Backup &amp; Restore
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                icon={<Download className="w-4 h-4" />}
                onClick={handleBackupJSON}
              >
                Backup App Data
              </Button>

              <Button
                variant="secondary"
                icon={
                  isRestoring ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )
                }
                onClick={handleRestoreClick}
                disabled={isRestoring}
              >
                {isRestoring ? 'Restoring…' : 'Restore App Data'}
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-200" />

          {/* Danger zone: Clear All Data */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-red-600 mb-0.5">
                Danger Zone
              </p>
              <p className="text-xs text-neutral-500">
                Permanently wipe all patient records and visits. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded border border-red-600 text-red-600 bg-white hover:bg-red-50 active:bg-red-100 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Clear All Data
            </button>
          </div>
        </div>
      </Card>

      {/* Confirmation Modal for Clearing All Data */}
      <Modal
        isOpen={isConfirmClearOpen}
        onClose={() => {
          if (!isClearing) setIsConfirmClearOpen(false);
        }}
        title="Clear All Clinical Data?"
        subtitle="Permanently erase all patient profiles and visit records"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-red-50 border border-red-200 rounded text-xs text-red-800 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-red-900 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Warning: Irreversible Action</span>
            </div>
            <p className="leading-relaxed">
              This will permanently delete all records from the{' '}
              <span className="font-bold font-mono">patients</span> and{' '}
              <span className="font-bold font-mono">visits</span> Dexie stores in your browser&apos;s IndexedDB.
            </p>
            <p className="leading-relaxed font-medium text-red-950">
              All triage queues, checking admissions, checkout logs, and patient records will be wiped clean.
            </p>
          </div>

          <p className="text-xs text-neutral-600">
            Tip: Click <strong>Cancel</strong> and use <strong>Backup App Data</strong> to export your data first.
          </p>

          <div className="pt-3 border-t border-neutral-200 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsConfirmClearOpen(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>

            <button
              type="button"
              onClick={handleConfirmClear}
              disabled={isClearing}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition cursor-pointer"
            >
              {isClearing ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>Yes, Clear All Data</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
