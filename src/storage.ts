import type { PatientInput, PatientRecord } from './rules/types';

const STORAGE_KEY = 'cataract-preop-records';

function generateId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function loadRecords(): PatientRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecord(input: PatientInput): PatientRecord {
  const record: PatientRecord = {
    ...input,
    id: generateId(),
    savedAt: Date.now(),
  };
  const records = [record, ...loadRecords()];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  return record;
}
