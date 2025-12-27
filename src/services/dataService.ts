import { WeightEntry, TargetData } from '../types';

// Mock data based on the Google Sheets
// In production, this would fetch from Google Sheets API
export const mockWeightData: WeightEntry[] = [
  { date: '2025-09-28', weekDay: 'Sunday', weight: 112.35, changePercent: 0, changeKg: 0, dailyChange: 0 },
  { date: '2025-10-04', weekDay: 'Saturday', weight: 112.00, changePercent: -0.31, changeKg: -0.35, dailyChange: -0.06 },
  { date: '2025-10-11', weekDay: 'Saturday', weight: 109.30, changePercent: -2.41, changeKg: -2.70, dailyChange: -0.39 },
  { date: '2025-10-18', weekDay: 'Saturday', weight: 108.45, changePercent: -0.78, changeKg: -0.85, dailyChange: -0.12 },
  { date: '2025-10-25', weekDay: 'Saturday', weight: 105.85, changePercent: -2.40, changeKg: -2.60, dailyChange: -0.37 },
  { date: '2025-11-01', weekDay: 'Saturday', weight: 104.45, changePercent: -1.32, changeKg: -1.40, dailyChange: -0.20 },
  { date: '2025-11-08', weekDay: 'Saturday', weight: 104.00, changePercent: -0.43, changeKg: -0.45, dailyChange: -0.06 },
  { date: '2025-11-15', weekDay: 'Saturday', weight: 102.80, changePercent: -1.15, changeKg: -1.20, dailyChange: -0.17 },
  { date: '2025-11-19', weekDay: 'Wednesday', weight: 102.00, changePercent: -0.78, changeKg: -0.80, dailyChange: -0.20 },
  { date: '2025-11-22', weekDay: 'Saturday', weight: 101.85, changePercent: -0.15, changeKg: -0.15, dailyChange: -0.05 },
  { date: '2025-11-24', weekDay: 'Monday', weight: 101.70, changePercent: -0.15, changeKg: -0.15, dailyChange: -0.07 },
  { date: '2025-11-27', weekDay: 'Thursday', weight: 101.00, changePercent: -0.69, changeKg: -0.70, dailyChange: -0.23 },
  { date: '2025-11-29', weekDay: 'Saturday', weight: 100.30, changePercent: -0.69, changeKg: -0.70, dailyChange: -0.35 },
  { date: '2025-12-03', weekDay: 'Wednesday', weight: 99.70, changePercent: -0.60, changeKg: -0.60, dailyChange: -0.15 },
  { date: '2025-12-06', weekDay: 'Saturday', weight: 98.90, changePercent: -0.80, changeKg: -0.80, dailyChange: -0.27 },
  { date: '2025-12-13', weekDay: 'Saturday', weight: 97.90, changePercent: -1.01, changeKg: -1.00, dailyChange: -0.14 },
  { date: '2025-12-17', weekDay: 'Wednesday', weight: 97.55, changePercent: -0.36, changeKg: -0.35, dailyChange: -0.09 },
  { date: '2025-12-20', weekDay: 'Saturday', weight: 97.10, changePercent: -0.46, changeKg: -0.45, dailyChange: -0.15 },
  { date: '2025-12-22', weekDay: 'Monday', weight: 96.55, changePercent: -0.57, changeKg: -0.55, dailyChange: -0.27 },
  { date: '2025-12-27', weekDay: 'Saturday', weight: 96.65, changePercent: 0.10, changeKg: 0.10, dailyChange: 0.02 },
];

export const mockTargetData: TargetData = {
  startDate: '2025-09-28',
  startWeight: 112.35,
  endDate: '2026-07-31',
  endWeight: 75,
  totalDuration: 307,
  totalKg: 37.35,
  height: 170,
};

// LocalStorage keys
const STORAGE_KEYS = {
  WEIGHT_ENTRIES: 'weightwatch-entries',
  TARGET_DATA: 'weightwatch-target',
};

// Calculate derived fields for weight entry
function calculateDerivedFields(
  entry: WeightEntry,
  previousEntry: WeightEntry | null
): WeightEntry {
  if (!previousEntry) {
    return {
      ...entry,
      changePercent: 0,
      changeKg: 0,
      dailyChange: 0,
    };
  }

  const changeKg = entry.weight - previousEntry.weight;
  const changePercent = (changeKg / previousEntry.weight) * 100;

  // Calculate days between entries
  const currentDate = new Date(entry.date);
  const prevDate = new Date(previousEntry.date);
  const daysDiff = Math.max(1, Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)));

  const dailyChange = changeKg / daysDiff;

  return {
    ...entry,
    changePercent,
    changeKg,
    dailyChange,
  };
}

// Recalculate all derived fields for all entries
function recalculateEntries(entries: WeightEntry[]): WeightEntry[] {
  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return sorted.map((entry, index) => {
    const previousEntry = index > 0 ? sorted[index - 1] : null;
    return calculateDerivedFields(entry, previousEntry);
  });
}

// Get entries from localStorage or return mock data
function getStoredEntries(): WeightEntry[] {
  const stored = localStorage.getItem(STORAGE_KEYS.WEIGHT_ENTRIES);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return mockWeightData;
    }
  }
  // Initialize with mock data if not found
  localStorage.setItem(STORAGE_KEYS.WEIGHT_ENTRIES, JSON.stringify(mockWeightData));
  return mockWeightData;
}

// Get target data from localStorage or return mock data
function getStoredTargetData(): TargetData {
  const stored = localStorage.getItem(STORAGE_KEYS.TARGET_DATA);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return mockTargetData;
    }
  }
  // Initialize with mock data if not found
  localStorage.setItem(STORAGE_KEYS.TARGET_DATA, JSON.stringify(mockTargetData));
  return mockTargetData;
}

export async function fetchWeightData(): Promise<WeightEntry[]> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return getStoredEntries();
}

export async function fetchTargetData(): Promise<TargetData> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return getStoredTargetData();
}

// Add a new weight entry
export async function addWeightEntry(entry: Partial<WeightEntry>): Promise<WeightEntry[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const entries = getStoredEntries();

  // Check if entry with this date already exists
  const existingIndex = entries.findIndex(e => e.date === entry.date);
  if (existingIndex !== -1) {
    throw new Error('An entry for this date already exists');
  }

  const newEntry: WeightEntry = {
    date: entry.date!,
    weekDay: entry.weekDay!,
    weight: entry.weight!,
    changePercent: 0,
    changeKg: 0,
    dailyChange: 0,
  };

  entries.push(newEntry);

  // Recalculate all derived fields
  const updatedEntries = recalculateEntries(entries);

  localStorage.setItem(STORAGE_KEYS.WEIGHT_ENTRIES, JSON.stringify(updatedEntries));
  return updatedEntries;
}

// Update an existing weight entry
export async function updateWeightEntry(date: string, updates: Partial<WeightEntry>): Promise<WeightEntry[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const entries = getStoredEntries();
  const index = entries.findIndex(e => e.date === date);

  if (index === -1) {
    throw new Error('Entry not found');
  }

  // Update the entry
  entries[index] = {
    ...entries[index],
    ...updates,
  };

  // Recalculate all derived fields
  const updatedEntries = recalculateEntries(entries);

  localStorage.setItem(STORAGE_KEYS.WEIGHT_ENTRIES, JSON.stringify(updatedEntries));
  return updatedEntries;
}

// Delete a weight entry
export async function deleteWeightEntry(date: string): Promise<WeightEntry[]> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const entries = getStoredEntries();
  const filtered = entries.filter(e => e.date !== date);

  if (filtered.length === entries.length) {
    throw new Error('Entry not found');
  }

  // Recalculate all derived fields
  const updatedEntries = recalculateEntries(filtered);

  localStorage.setItem(STORAGE_KEYS.WEIGHT_ENTRIES, JSON.stringify(updatedEntries));
  return updatedEntries;
}

// Update target data
export async function updateTargetData(updates: Partial<TargetData>): Promise<TargetData> {
  await new Promise(resolve => setTimeout(resolve, 300));

  const currentTarget = getStoredTargetData();
  const updatedTarget = { ...currentTarget, ...updates };

  localStorage.setItem(STORAGE_KEYS.TARGET_DATA, JSON.stringify(updatedTarget));
  return updatedTarget;
}

// Future: Google Sheets API integration
// export async function fetchFromGoogleSheets(): Promise<{ entries: WeightEntry[], target: TargetData }> {
//   const SHEET_ID = '1te4QfcgjiMIHYAmRar0EdFyiVeOs2D-lj8lXGE0lqmk';
//   const API_KEY = 'your-api-key';
//   // Implementation here
// }
