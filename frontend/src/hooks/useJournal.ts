import { useEffect, useMemo, useRef, useState } from 'react';
import { ONE_DAY_MS, UNDO_TIMEOUT_MS } from '../constants';
import { filterActiveJournalEntries, loadJournalEntries, saveJournalEntries } from '../journal-repository';
import type { Emotion, JournalEntry } from '../types';

export function useJournal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [undoEntry, setUndoEntry] = useState<JournalEntry | null>(null);
  const undoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setEntries(loadJournalEntries());
  }, []);

  useEffect(() => {
    saveJournalEntries(entries);
  }, [entries]);

  useEffect(() => {
    const activeEntries = filterActiveJournalEntries(entries);
    if (activeEntries.length !== entries.length) {
      setEntries(activeEntries);
      return undefined;
    }

    const nextExpiryAtMs = Math.min(
      ...entries
        .map((entry) => Date.parse(entry.expiresAt))
        .filter((expiresAtMs) => Number.isFinite(expiresAtMs)),
    );

    if (!Number.isFinite(nextExpiryAtMs)) {
      return undefined;
    }

    const waitMs = Math.max(nextExpiryAtMs - Date.now(), 0) + 25;
    const timeoutId = window.setTimeout(() => {
      setEntries((previousEntries) => {
        const prunedEntries = filterActiveJournalEntries(previousEntries);
        return prunedEntries.length === previousEntries.length ? previousEntries : prunedEntries;
      });
    }, waitMs);

    return () => window.clearTimeout(timeoutId);
  }, [entries]);

  useEffect(
    () => () => {
      if (undoTimerRef.current) {
        window.clearTimeout(undoTimerRef.current);
      }
    },
    [],
  );

  const recentEntries = useMemo(() => entries.slice(0, 10), [entries]);

  function closeUndoWindow() {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoEntry(null);
  }

  function startUndoWindow(entry: JournalEntry) {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
    }

    setUndoEntry(entry);
    undoTimerRef.current = window.setTimeout(() => {
      setUndoEntry(null);
      undoTimerRef.current = null;
    }, UNDO_TIMEOUT_MS);
  }

  function addEntry(emotion: Emotion): string {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    setEntries((prev) => [
      {
        id,
        date: createdAt.slice(0, 10),
        emotion,
        createdAt,
        expiresAt: new Date(Date.parse(createdAt) + ONE_DAY_MS).toISOString(),
      },
      ...prev,
    ]);
    return id;
  }

  function removeEntryWithUndo(id: string) {
    const entryToDelete = entries.find((entry) => entry.id === id);
    if (!entryToDelete) return;

    setEntries((previousEntries) => previousEntries.filter((entry) => entry.id !== id));
    startUndoWindow(entryToDelete);
  }

  function handleUndoDelete() {
    if (!undoEntry) return;

    const expiresAtMs = Date.parse(undoEntry.expiresAt);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      closeUndoWindow();
      return;
    }

    setEntries((previousEntries) => {
      if (previousEntries.some((entry) => entry.id === undoEntry.id)) {
        return previousEntries;
      }

      return [undoEntry, ...previousEntries].sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      );
    });
    closeUndoWindow();
  }

  return {
    entries,
    recentEntries,
    undoEntry,
    addEntry,
    removeEntryWithUndo,
    handleUndoDelete,
    closeUndoWindow,
  };
}
