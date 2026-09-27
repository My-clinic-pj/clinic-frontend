import Dexie, { type Table } from 'dexie';
import type { Patient, Visit, DatabaseBackup } from '../types';

/**
 * Dexie.js database instance for offline-first clinical administration.
 * Database name: 'ClinicDB'
 * Stores:
 * 1. patients: '++id, phone, name, age, address, allergies, createdAt'
 * 2. visits: '++id, patientId, date, status, bloodPressure, temperature, paymentType, payAmount, createdAt'
 */
export class ClinicDatabase extends Dexie {
  patients!: Table<Patient, number>;
  visits!: Table<Visit, number>;

  constructor() {
    super('ClinicDB');
    this.version(1).stores({
      patients: '++id, phone, name, age, address, createdAt',
      visits: '++id, patientId, date, symptoms, totalAmount, paymentMethod, createdAt',
    });
    this.version(2).stores({
      patients: '++id, phone, name, age, address, createdAt',
      records: '++id, patientId, date, weight, diseaseType, medicineDetails, totalAmount, paymentMethod, createdAt',
    });
    this.version(3).stores({
      patients: '++id, phone, name, age, address, allergies, createdAt',
      visits: '++id, patientId, date, status, bloodPressure, temperature, paymentType, payAmount, createdAt',
    });
    this.version(4).stores({
      patients: '++id, phone, name, age, address, allergies, createdAt',
      visits: '++id, patientId, date, status, bloodPressure, temperature, paymentType, payAmount, nextAppointmentDate, nextAppointmentReason, createdAt',
    });
  }
}

export const db = new ClinicDatabase();

/**
 * Exports the full database content as a structured JSON file.
 */
export async function exportDatabaseToJson(): Promise<string> {
  const allPatients = await db.patients.toArray();
  const allVisits = await db.visits.toArray();

  const backup: DatabaseBackup = {
    app: 'ClinicDB',
    version: 3,
    exportedAt: new Date().toISOString(),
    patients: allPatients,
    visits: allVisits,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Imports database content from a JSON backup.
 */
export async function importDatabaseFromJson(
  jsonContent: string,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ patientsCount: number; visitsCount: number }> {
  const parsed = JSON.parse(jsonContent);

  if (!parsed || parsed.app !== 'ClinicDB') {
    throw new Error('Invalid ClinicDB backup format. Please select a valid ClinicDB JSON backup file.');
  }

  const patientsToImport: Patient[] = Array.isArray(parsed.patients) ? parsed.patients : [];
  let visitsToImport: Visit[] = [];

  if (Array.isArray(parsed.visits)) {
    visitsToImport = parsed.visits;
  } else if (Array.isArray(parsed.records)) {
    // Migration helper if someone loads legacy 'records' backup
    visitsToImport = parsed.records.map((r: any) => ({
      id: r.id,
      patientId: r.patientId,
      date: r.date,
      status: 'Checkout',
      bloodPressure: '120/80 mmHg',
      temperature: '98.6 °F',
      paymentType: r.paymentMethod || 'Cash',
      payAmount: r.totalAmount || 0,
      createdAt: r.createdAt || new Date().toISOString(),
    }));
  }

  await db.transaction('rw', db.patients, db.visits, async () => {
    if (mode === 'replace') {
      await db.patients.clear();
      await db.visits.clear();
      if (patientsToImport.length > 0) {
        await db.patients.bulkAdd(patientsToImport);
      }
      if (visitsToImport.length > 0) {
        await db.visits.bulkAdd(visitsToImport);
      }
    } else {
      // Merge mode
      for (const p of patientsToImport) {
        const { id, ...patientData } = p;
        await db.patients.add(patientData as Patient);
      }
      for (const v of visitsToImport) {
        const { id, ...visitData } = v;
        await db.visits.add(visitData as Visit);
      }
    }
  });

  return {
    patientsCount: patientsToImport.length,
    visitsCount: visitsToImport.length,
  };
}

/**
 * Clears all data in the database.
 */
export async function clearDatabase(): Promise<void> {
  await db.transaction('rw', db.patients, db.visits, async () => {
    await db.patients.clear();
    await db.visits.clear();
  });
  try {
    localStorage.setItem('clinicdb_cleared_by_user', 'true');
  } catch {
    // ignore
  }
}

/**
 * Seeds realistic mock data on initialization:
 * Exactly 15 patients, 5 in 'Checking' status, 20 in 'Checkout' status across various dates.
 */
export async function seedSampleData(force = false): Promise<void> {
  if (!force) {
    try {
      if (localStorage.getItem('clinicdb_cleared_by_user') === 'true') {
        return;
      }
    } catch {
      // ignore
    }
  }

  const patientCount = await db.patients.count();
  const visitCount = await db.visits.count();

  // If already seeded with enough data and not forced, keep user data intact
  if (!force && patientCount >= 10 && visitCount >= 15) {
    return;
  }

  if (force || patientCount < 10 || visitCount < 15) {
    await db.patients.clear();
    await db.visits.clear();
  }

  const now = new Date();
  const getDateStr = (daysAgo: number) => {
    const d = new Date(now.getTime() - daysAgo * 86400000);
    return d.toISOString().split('T')[0];
  };

  // 15 Realistic Clinic Patients
  const samplePatients: Omit<Patient, 'id'>[] = [
    {
      name: 'Daw Khin Myo',
      phone: '0950123456',
      age: 48,
      address: 'No. 24, Bogyoke Road, Bahan, Yangon',
      allergies: 'Penicillin, Amoxicillin',
      createdAt: new Date(now.getTime() - 86400000 * 12).toISOString(),
    },
    {
      name: 'U Aung Kyaw',
      phone: '09791234567',
      age: 56,
      address: '78th St, Between 31st & 32nd, Chanayethazan, Mandalay',
      allergies: 'None',
      createdAt: new Date(now.getTime() - 86400000 * 11).toISOString(),
    },
    {
      name: 'Ma Thiri San',
      phone: '09450098765',
      age: 27,
      address: 'Room 402, Pearl Condo, Bahan, Yangon',
      allergies: 'Sulfa antibiotics',
      createdAt: new Date(now.getTime() - 86400000 * 10).toISOString(),
    },
    {
      name: 'U Tin Win',
      phone: '09421098765',
      age: 63,
      address: 'No. 115, Insein Road, Kamayut, Yangon',
      allergies: 'Aspirin, NSAIDs',
      createdAt: new Date(now.getTime() - 86400000 * 9).toISOString(),
    },
    {
      name: 'Daw Hnin Wai',
      phone: '09977654321',
      age: 34,
      address: 'Pyay Road, 8 Mile, Mayangone, Yangon',
      allergies: 'None',
      createdAt: new Date(now.getTime() - 86400000 * 8).toISOString(),
    },
    {
      name: 'Ko Min Thu',
      phone: '09250112233',
      age: 31,
      address: 'No. 88, Upper Pazundaung Road, Yangon',
      allergies: 'None',
      createdAt: new Date(now.getTime() - 86400000 * 7).toISOString(),
    },
    {
      name: 'Daw Aye Aye Myint',
      phone: '09789334455',
      age: 52,
      address: 'Kyimyindaing Strand Road, Yangon',
      allergies: 'Ciprofloxacin',
      createdAt: new Date(now.getTime() - 86400000 * 6).toISOString(),
    },
    {
      name: 'U Than Htike',
      phone: '09443221199',
      age: 60,
      address: 'No. 54, Sanchaung Street, Sanchaung, Yangon',
      allergies: 'None',
      createdAt: new Date(now.getTime() - 86400000 * 5).toISOString(),
    },
    {
      name: 'Ma May Thet',
      phone: '09778899001',
      age: 23,
      address: 'No. 12, Hledan 1st Street, Kamayut, Yangon',
      allergies: 'Peanuts, Shellfish',
      createdAt: new Date(now.getTime() - 86400000 * 4).toISOString(),
    },
    {
      name: 'Ko Kyaw Zayar',
      phone: '09965432100',
      age: 39,
      address: 'No. 70, Latha Street, Downtown, Yangon',
      allergies: 'None',
      createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
    },
    {
      name: 'Daw Mya Mya Sein',
      phone: '09432001122',
      age: 67,
      address: 'Yankin Center Area, Yankin, Yangon',
      allergies: 'Ibuprofen',
      createdAt: new Date(now.getTime() - 86400000 * 3).toISOString(),
    },
    {
      name: 'U Soe Naing',
      phone: '09261122334',
      age: 45,
      address: 'No. 18, Merchant Road, Kyauktada, Yangon',
      allergies: 'None',
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
    },
    {
      name: 'Ma Su Mon',
      phone: '09795566778',
      age: 29,
      address: 'Shwe Gon Dine Road, Bahan, Yangon',
      allergies: 'Latex',
      createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
    },
    {
      name: 'Ko Zaw Lin',
      phone: '09458899112',
      age: 36,
      address: 'North Dagon, Ward 32, Yangon',
      allergies: 'None',
      createdAt: new Date(now.getTime() - 86400000 * 1).toISOString(),
    },
    {
      name: 'Daw Nu Nu Win',
      phone: '09951122334',
      age: 58,
      address: 'South Okkalapa, 7th Ward, Yangon',
      allergies: 'Codeine',
      createdAt: new Date(now.getTime()).toISOString(),
    },
  ];

  const rawIds = await db.patients.bulkAdd(samplePatients as Patient[], { allKeys: true });
  const pIds = rawIds.map((id) => Number(id));

  // 5 Visits in 'Checking' status (all waiting today in clinic triage)
  const checkingVisits: Omit<Visit, 'id'>[] = [
    {
      patientId: pIds[0],
      date: getDateStr(0),
      status: 'Checking',
      createdAt: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
    },
    {
      patientId: pIds[1],
      date: getDateStr(0),
      status: 'Checking',
      createdAt: new Date(now.getTime() - 1000 * 60 * 35).toISOString(),
    },
    {
      patientId: pIds[2],
      date: getDateStr(0),
      status: 'Checking',
      createdAt: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
    },
    {
      patientId: pIds[3],
      date: getDateStr(0),
      status: 'Checking',
      createdAt: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
    },
    {
      patientId: pIds[4],
      date: getDateStr(0),
      status: 'Checking',
      createdAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
    },
  ];

  // 20 Visits in 'Checkout' status spread across the last 7 days (Day 0 to Day 6)
  const checkoutVisits: Omit<Visit, 'id'>[] = [
    // Today (Day 0) - 3 completed checkouts
    {
      patientId: pIds[5],
      date: getDateStr(0),
      status: 'Checkout',
      bloodPressure: '120/80 mmHg',
      temperature: '98.6 °F',
      paymentType: 'Cash',
      payAmount: 25000,
      createdAt: new Date(now.getTime() - 1000 * 60 * 180).toISOString(),
    },
    {
      patientId: pIds[6],
      date: getDateStr(0),
      status: 'Checkout',
      bloodPressure: '135/88 mmHg',
      temperature: '98.4 °F',
      paymentType: 'KPay',
      payAmount: 30000,
      createdAt: new Date(now.getTime() - 1000 * 60 * 140).toISOString(),
    },
    {
      patientId: pIds[7],
      date: getDateStr(0),
      status: 'Checkout',
      bloodPressure: '118/76 mmHg',
      temperature: '99.2 °F',
      paymentType: 'WavePay',
      payAmount: 22000,
      createdAt: new Date(now.getTime() - 1000 * 60 * 90).toISOString(),
    },

    // 1 Day Ago - 3 checkouts
    {
      patientId: pIds[8],
      date: getDateStr(1),
      status: 'Checkout',
      bloodPressure: '124/82 mmHg',
      temperature: '98.6 °F',
      paymentType: 'Cash',
      payAmount: 28000,
      createdAt: new Date(now.getTime() - 86400000 * 1 - 1000 * 60 * 120).toISOString(),
    },
    {
      patientId: pIds[9],
      date: getDateStr(1),
      status: 'Checkout',
      bloodPressure: '130/85 mmHg',
      temperature: '98.8 °F',
      paymentType: 'KPay',
      payAmount: 35000,
      createdAt: new Date(now.getTime() - 86400000 * 1 - 1000 * 60 * 200).toISOString(),
    },
    {
      patientId: pIds[10],
      date: getDateStr(1),
      status: 'Checkout',
      bloodPressure: '142/90 mmHg',
      temperature: '98.2 °F',
      paymentType: 'Cash',
      payAmount: 20000,
      createdAt: new Date(now.getTime() - 86400000 * 1 - 1000 * 60 * 300).toISOString(),
    },

    // 2 Days Ago - 3 checkouts
    {
      patientId: pIds[11],
      date: getDateStr(2),
      status: 'Checkout',
      bloodPressure: '116/74 mmHg',
      temperature: '98.4 °F',
      paymentType: 'WavePay',
      payAmount: 18000,
      createdAt: new Date(now.getTime() - 86400000 * 2 - 1000 * 60 * 100).toISOString(),
    },
    {
      patientId: pIds[12],
      date: getDateStr(2),
      status: 'Checkout',
      bloodPressure: '122/80 mmHg',
      temperature: '99.0 °F',
      paymentType: 'KPay',
      payAmount: 32000,
      createdAt: new Date(now.getTime() - 86400000 * 2 - 1000 * 60 * 180).toISOString(),
    },
    {
      patientId: pIds[13],
      date: getDateStr(2),
      status: 'Checkout',
      bloodPressure: '128/84 mmHg',
      temperature: '98.6 °F',
      paymentType: 'Cash',
      payAmount: 26000,
      createdAt: new Date(now.getTime() - 86400000 * 2 - 1000 * 60 * 240).toISOString(),
    },

    // 3 Days Ago - 3 checkouts
    {
      patientId: pIds[14],
      date: getDateStr(3),
      status: 'Checkout',
      bloodPressure: '138/86 mmHg',
      temperature: '98.5 °F',
      paymentType: 'Cash',
      payAmount: 40000,
      createdAt: new Date(now.getTime() - 86400000 * 3 - 1000 * 60 * 150).toISOString(),
    },
    {
      patientId: pIds[0],
      date: getDateStr(3),
      status: 'Checkout',
      bloodPressure: '132/84 mmHg',
      temperature: '98.7 °F',
      paymentType: 'KPay',
      payAmount: 24000,
      createdAt: new Date(now.getTime() - 86400000 * 3 - 1000 * 60 * 220).toISOString(),
    },
    {
      patientId: pIds[1],
      date: getDateStr(3),
      status: 'Checkout',
      bloodPressure: '120/78 mmHg',
      temperature: '98.6 °F',
      paymentType: 'WavePay',
      payAmount: 19000,
      createdAt: new Date(now.getTime() - 86400000 * 3 - 1000 * 60 * 310).toISOString(),
    },

    // 4 Days Ago - 3 checkouts
    {
      patientId: pIds[2],
      date: getDateStr(4),
      status: 'Checkout',
      bloodPressure: '115/75 mmHg',
      temperature: '98.6 °F',
      paymentType: 'Cash',
      payAmount: 30000,
      createdAt: new Date(now.getTime() - 86400000 * 4 - 1000 * 60 * 120).toISOString(),
    },
    {
      patientId: pIds[3],
      date: getDateStr(4),
      status: 'Checkout',
      bloodPressure: '145/92 mmHg',
      temperature: '99.4 °F',
      paymentType: 'KPay',
      payAmount: 45000,
      createdAt: new Date(now.getTime() - 86400000 * 4 - 1000 * 60 * 200).toISOString(),
    },
    {
      patientId: pIds[4],
      date: getDateStr(4),
      status: 'Checkout',
      bloodPressure: '125/82 mmHg',
      temperature: '98.4 °F',
      paymentType: 'WavePay',
      payAmount: 21000,
      createdAt: new Date(now.getTime() - 86400000 * 4 - 1000 * 60 * 260).toISOString(),
    },

    // 5 Days Ago - 3 checkouts
    {
      patientId: pIds[5],
      date: getDateStr(5),
      status: 'Checkout',
      bloodPressure: '118/76 mmHg',
      temperature: '98.6 °F',
      paymentType: 'Cash',
      payAmount: 25000,
      createdAt: new Date(now.getTime() - 86400000 * 5 - 1000 * 60 * 140).toISOString(),
    },
    {
      patientId: pIds[6],
      date: getDateStr(5),
      status: 'Checkout',
      bloodPressure: '136/88 mmHg',
      temperature: '98.8 °F',
      paymentType: 'KPay',
      payAmount: 38000,
      createdAt: new Date(now.getTime() - 86400000 * 5 - 1000 * 60 * 220).toISOString(),
    },
    {
      patientId: pIds[7],
      date: getDateStr(5),
      status: 'Checkout',
      bloodPressure: '120/80 mmHg',
      temperature: '98.5 °F',
      paymentType: 'Cash',
      payAmount: 22000,
      createdAt: new Date(now.getTime() - 86400000 * 5 - 1000 * 60 * 300).toISOString(),
    },

    // 6 Days Ago - 2 checkouts
    {
      patientId: pIds[8],
      date: getDateStr(6),
      status: 'Checkout',
      bloodPressure: '122/78 mmHg',
      temperature: '98.6 °F',
      paymentType: 'Cash',
      payAmount: 27000,
      createdAt: new Date(now.getTime() - 86400000 * 6 - 1000 * 60 * 160).toISOString(),
    },
    {
      patientId: pIds[9],
      date: getDateStr(6),
      status: 'Checkout',
      bloodPressure: '130/85 mmHg',
      temperature: '99.1 °F',
      paymentType: 'WavePay',
      payAmount: 32000,
      createdAt: new Date(now.getTime() - 86400000 * 6 - 1000 * 60 * 250).toISOString(),
    },
  ];

  await db.visits.bulkAdd([...checkingVisits, ...checkoutVisits] as Visit[]);
}
