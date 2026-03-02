import { useState } from 'react';
import { getComfortMessage } from '../comfort-service';
import type { ComfortResponse, Emotion } from '../types';

export function useComfort() {
  const [comfort, setComfort] = useState<ComfortResponse | null>(null);
  const [lastEntryIdFromComfort, setLastEntryIdFromComfort] = useState<string | null>(null);
  const [comfortLoading, setComfortLoading] = useState(false);
  const [comfortError, setComfortError] = useState('');

  async function requestRelease(
    content: string,
    emotion: Emotion,
    addEntry: (emotion: Emotion) => string,
  ) {
    if (!content.trim()) {
      setComfortError('마음을 짧게라도 적어주세요.');
      return;
    }

    setComfortLoading(true);
    setComfortError('');

    try {
      const createdEntryId = addEntry(emotion);
      const result = await getComfortMessage({
        content: content.trim(),
        emotion,
      });
      setComfort(result);
      setLastEntryIdFromComfort(createdEntryId);
    } catch (error) {
      setComfortError(error instanceof Error ? error.message : '오류가 발생했습니다.');
    } finally {
      setComfortLoading(false);
    }
  }

  function handleKeepTemporarily() {
    setComfort(null);
    setLastEntryIdFromComfort(null);
  }

  function handleDeleteNow(removeEntryWithUndo: (id: string) => void) {
    if (lastEntryIdFromComfort) {
      removeEntryWithUndo(lastEntryIdFromComfort);
    }
    setComfort(null);
    setLastEntryIdFromComfort(null);
  }

  function clearLastEntryId(id: string) {
    if (lastEntryIdFromComfort === id) {
      setLastEntryIdFromComfort(null);
    }
  }

  return {
    comfort,
    comfortLoading,
    comfortError,
    requestRelease,
    handleKeepTemporarily,
    handleDeleteNow,
    clearLastEntryId,
  };
}
