// Default clinic settings — must stay in sync with backend defaults for new users.
export const DEFAULT_CLINIC_NAME = 'My clinic';
export const DEFAULT_CLINIC_ADDRESS = '';

// Legacy, non-user-scoped localStorage keys written by older builds (useSettings hook).
// These can leak a previous account's clinic info into a new account, so we purge them.
export const LEGACY_SETTINGS_KEYS = [
  'clinicName',
  'doctorName',
  'clinicAddress',
  'clinicPhone',
  'doctorSignature',
] as const;

export const clearLegacySettingsCache = () => {
  LEGACY_SETTINGS_KEYS.forEach((key) => localStorage.removeItem(key));
};
