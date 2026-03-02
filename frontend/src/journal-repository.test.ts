import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockStorage = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => mockStorage.set(key, value)),
  removeItem: vi.fn((key: string) => mockStorage.delete(key)),
  clear: vi.fn(() => mockStorage.clear()),
  get length() {
    return mockStorage.size;
  },
  key: vi.fn((index: number) => [...mockStorage.keys()][index] ?? null),
};

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

describe('journal-repository', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-28T12:00:00.000Z'));
    mockStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.resetModules();
    mockStorage.clear();
  });

  describe('filterActiveJournalEntries', () => {
    it('filters out expired entries', async () => {
      vi.stubEnv('VITE_JOURNAL_STORE', 'local');
      const { filterActiveJournalEntries } = await import('./journal-repository');

      const entries = [
        {
          id: '1',
          date: '2026-02-27',
          emotion: 'calm' as const,
          createdAt: '2026-02-27T10:00:00.000Z',
          expiresAt: '2026-02-28T10:00:00.000Z',
        },
        {
          id: '2',
          date: '2026-02-28',
          emotion: 'happy' as const,
          createdAt: '2026-02-28T10:00:00.000Z',
          expiresAt: '2026-03-01T10:00:00.000Z',
        },
      ];

      const active = filterActiveJournalEntries(entries);
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe('2');
    });

    it('keeps entries that have not expired', async () => {
      vi.stubEnv('VITE_JOURNAL_STORE', 'local');
      const { filterActiveJournalEntries } = await import('./journal-repository');

      const entries = [
        {
          id: '1',
          date: '2026-02-28',
          emotion: 'calm' as const,
          createdAt: '2026-02-28T11:00:00.000Z',
          expiresAt: '2026-03-01T11:00:00.000Z',
        },
      ];

      const active = filterActiveJournalEntries(entries);
      expect(active).toHaveLength(1);
    });
  });

  describe('loadJournalEntries (local store)', () => {
    it('returns empty array when no data', async () => {
      vi.stubEnv('VITE_JOURNAL_STORE', 'local');
      const { loadJournalEntries } = await import('./journal-repository');
      expect(loadJournalEntries()).toEqual([]);
    });

    it('loads and normalizes entries from localStorage', async () => {
      vi.stubEnv('VITE_JOURNAL_STORE', 'local');
      const entry = {
        id: 'test-1',
        date: '2026-02-28',
        emotion: 'happy',
        createdAt: '2026-02-28T11:00:00.000Z',
        expiresAt: '2026-03-01T11:00:00.000Z',
      };
      mockStorage.set('haeuso_journal_v1', JSON.stringify([entry]));

      const { loadJournalEntries } = await import('./journal-repository');
      const entries = loadJournalEntries();
      expect(entries).toHaveLength(1);
      expect(entries[0].emotion).toBe('happy');
    });

    it('normalizes legacy emotions (tired → sad)', async () => {
      vi.stubEnv('VITE_JOURNAL_STORE', 'local');
      const entry = {
        id: 'test-1',
        date: '2026-02-28',
        emotion: 'tired',
        createdAt: '2026-02-28T11:00:00.000Z',
        expiresAt: '2026-03-01T11:00:00.000Z',
      };
      mockStorage.set('haeuso_journal_v1', JSON.stringify([entry]));

      const { loadJournalEntries } = await import('./journal-repository');
      const entries = loadJournalEntries();
      expect(entries[0].emotion).toBe('sad');
    });

    it('returns empty array for invalid JSON', async () => {
      vi.stubEnv('VITE_JOURNAL_STORE', 'local');
      mockStorage.set('haeuso_journal_v1', 'not-json');

      const { loadJournalEntries } = await import('./journal-repository');
      expect(loadJournalEntries()).toEqual([]);
    });
  });

  describe('saveJournalEntries (local store)', () => {
    it('saves entries to localStorage', async () => {
      vi.stubEnv('VITE_JOURNAL_STORE', 'local');
      const { saveJournalEntries } = await import('./journal-repository');

      const entries = [
        {
          id: 'test-1',
          date: '2026-02-28',
          emotion: 'calm' as const,
          createdAt: '2026-02-28T11:00:00.000Z',
          expiresAt: '2026-03-01T11:00:00.000Z',
        },
      ];

      saveJournalEntries(entries);
      const stored = JSON.parse(mockStorage.get('haeuso_journal_v1')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('test-1');
    });

    it('filters out expired entries on save', async () => {
      vi.stubEnv('VITE_JOURNAL_STORE', 'local');
      const { saveJournalEntries } = await import('./journal-repository');

      const entries = [
        {
          id: 'expired',
          date: '2026-02-27',
          emotion: 'calm' as const,
          createdAt: '2026-02-27T10:00:00.000Z',
          expiresAt: '2026-02-28T10:00:00.000Z',
        },
        {
          id: 'active',
          date: '2026-02-28',
          emotion: 'happy' as const,
          createdAt: '2026-02-28T11:00:00.000Z',
          expiresAt: '2026-03-01T11:00:00.000Z',
        },
      ];

      saveJournalEntries(entries);
      const stored = JSON.parse(mockStorage.get('haeuso_journal_v1')!);
      expect(stored).toHaveLength(1);
      expect(stored[0].id).toBe('active');
    });
  });

  describe('memory store', () => {
    it('works with memory store', async () => {
      vi.stubEnv('VITE_JOURNAL_STORE', 'memory');
      const { loadJournalEntries, saveJournalEntries } = await import('./journal-repository');

      expect(loadJournalEntries()).toEqual([]);

      const entries = [
        {
          id: 'mem-1',
          date: '2026-02-28',
          emotion: 'calm' as const,
          createdAt: '2026-02-28T11:00:00.000Z',
          expiresAt: '2026-03-01T11:00:00.000Z',
        },
      ];

      saveJournalEntries(entries);
      const loaded = loadJournalEntries();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('mem-1');
    });
  });
});
