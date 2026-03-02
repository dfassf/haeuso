import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useJournal } from './useJournal';

vi.mock('../journal-repository', () => ({
  loadJournalEntries: vi.fn(() => []),
  saveJournalEntries: vi.fn(),
  filterActiveJournalEntries: vi.fn((entries: unknown[]) => entries),
}));

import { filterActiveJournalEntries, loadJournalEntries, saveJournalEntries } from '../journal-repository';

const mockLoad = vi.mocked(loadJournalEntries);
const mockSave = vi.mocked(saveJournalEntries);
const mockFilter = vi.mocked(filterActiveJournalEntries);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1' });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('useJournal', () => {
  it('loads entries on mount', () => {
    mockLoad.mockReturnValue([]);
    const { result } = renderHook(() => useJournal());
    expect(result.current.entries).toEqual([]);
    expect(mockLoad).toHaveBeenCalledOnce();
  });

  it('saves entries when they change', () => {
    const { result } = renderHook(() => useJournal());
    expect(mockSave).toHaveBeenCalled();

    act(() => {
      result.current.addEntry('happy');
    });

    expect(mockSave).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ emotion: 'happy' })]),
    );
  });

  it('addEntry creates a new journal entry', () => {
    const { result } = renderHook(() => useJournal());

    let entryId: string;
    act(() => {
      entryId = result.current.addEntry('sad');
    });

    expect(entryId!).toBe('test-uuid-1');
    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0]).toMatchObject({
      id: 'test-uuid-1',
      emotion: 'sad',
    });
  });

  it('recentEntries returns at most 10 entries', () => {
    mockLoad.mockReturnValue([]);
    let uuidCounter = 0;
    vi.stubGlobal('crypto', { randomUUID: () => `uuid-${++uuidCounter}` });

    const { result } = renderHook(() => useJournal());

    act(() => {
      for (let i = 0; i < 12; i++) {
        result.current.addEntry('calm');
      }
    });

    expect(result.current.entries).toHaveLength(12);
    expect(result.current.recentEntries).toHaveLength(10);
  });

  it('removeEntryWithUndo removes entry and sets undoEntry', () => {
    mockLoad.mockReturnValue([]);
    const { result } = renderHook(() => useJournal());

    act(() => {
      result.current.addEntry('angry');
    });

    const entryId = result.current.entries[0].id;

    act(() => {
      result.current.removeEntryWithUndo(entryId);
    });

    expect(result.current.entries).toHaveLength(0);
    expect(result.current.undoEntry).not.toBeNull();
    expect(result.current.undoEntry?.id).toBe(entryId);
  });

  it('handleUndoDelete restores the deleted entry', () => {
    mockLoad.mockReturnValue([]);
    const { result } = renderHook(() => useJournal());

    act(() => {
      result.current.addEntry('angry');
    });

    const entryId = result.current.entries[0].id;

    act(() => {
      result.current.removeEntryWithUndo(entryId);
    });

    expect(result.current.entries).toHaveLength(0);

    act(() => {
      result.current.handleUndoDelete();
    });

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.entries[0].id).toBe(entryId);
    expect(result.current.undoEntry).toBeNull();
  });

  it('undo window clears after timeout', () => {
    mockLoad.mockReturnValue([]);
    const { result } = renderHook(() => useJournal());

    act(() => {
      result.current.addEntry('calm');
    });

    const entryId = result.current.entries[0].id;

    act(() => {
      result.current.removeEntryWithUndo(entryId);
    });

    expect(result.current.undoEntry).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.undoEntry).toBeNull();
  });

  it('closeUndoWindow clears undo state', () => {
    mockLoad.mockReturnValue([]);
    const { result } = renderHook(() => useJournal());

    act(() => {
      result.current.addEntry('calm');
    });

    act(() => {
      result.current.removeEntryWithUndo(result.current.entries[0].id);
    });

    expect(result.current.undoEntry).not.toBeNull();

    act(() => {
      result.current.closeUndoWindow();
    });

    expect(result.current.undoEntry).toBeNull();
  });

  it('expired entries are pruned', () => {
    const expiredEntry = {
      id: 'expired-1',
      date: '2024-01-01',
      emotion: 'calm' as const,
      createdAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-01T00:00:00.000Z',
    };
    mockLoad.mockReturnValue([expiredEntry]);
    mockFilter.mockReturnValue([]);

    const { result } = renderHook(() => useJournal());

    expect(result.current.entries).toHaveLength(0);
  });
});
