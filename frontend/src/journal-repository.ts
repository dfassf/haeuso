import type { Emotion, JournalEntry } from './types';

const STORAGE_KEY = 'haeuso_journal_v1';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type JournalStore = 'local' | 'memory';

const journalStore: JournalStore = import.meta.env.VITE_JOURNAL_STORE === 'memory' ? 'memory' : 'local';

let inMemoryEntries: JournalEntry[] = [];

function isEmotion(value: unknown): value is Emotion {
  return value === 'calm' || value === 'happy' || value === 'angry' || value === 'anxious' || value === 'sad';
}

function normalizeEmotion(value: unknown): Emotion {
  if (isEmotion(value)) return value;
  if (value === 'tired') return 'sad';
  if (value === 'grateful' || value === 'relieved') return 'calm';
  return 'calm';
}

function normalizeDateTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function normalizeLegacyDate(dateValue: unknown): string | null {
  if (typeof dateValue !== 'string') return null;
  const parsed = Date.parse(`${dateValue}T00:00:00`);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString();
}

function normalizeJournalEntry(entry: Partial<JournalEntry>): JournalEntry {
  const normalizedCreatedAt =
    normalizeDateTime(entry.createdAt) ?? normalizeLegacyDate(entry.date) ?? new Date().toISOString();
  const createdAtMs = Date.parse(normalizedCreatedAt);
  const normalizedExpiresAt =
    normalizeDateTime(entry.expiresAt) ?? new Date(createdAtMs + ONE_DAY_MS).toISOString();
  const normalizedDate = typeof entry.date === 'string' ? entry.date : normalizedCreatedAt.slice(0, 10);

  return {
    id: typeof entry.id === 'string' ? entry.id : crypto.randomUUID(),
    date: normalizedDate,
    emotion: normalizeEmotion(entry.emotion),
    createdAt: normalizedCreatedAt,
    expiresAt: normalizedExpiresAt,
  };
}

export function filterActiveJournalEntries(entries: JournalEntry[]): JournalEntry[] {
  const nowMs = Date.now();
  return entries.filter((entry) => {
    const expiresAtMs = Date.parse(entry.expiresAt);
    return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
  });
}

export function loadJournalEntries(): JournalEntry[] {
  if (journalStore === 'memory') {
    const active = filterActiveJournalEntries([...inMemoryEntries]);
    inMemoryEntries = active;
    return active;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalizedEntries = parsed
      .filter((entry): entry is Partial<JournalEntry> => typeof entry === 'object' && entry !== null)
      .map((entry) => normalizeJournalEntry(entry));
    const activeEntries = filterActiveJournalEntries(normalizedEntries);

    if (activeEntries.length !== normalizedEntries.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeEntries));
    }

    return activeEntries;
  } catch {
    return [];
  }
}

export function saveJournalEntries(entries: JournalEntry[]) {
  const activeEntries = filterActiveJournalEntries(entries);

  if (journalStore === 'memory') {
    inMemoryEntries = [...activeEntries];
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(activeEntries));
}

export function getJournalStore() {
  return journalStore;
}
