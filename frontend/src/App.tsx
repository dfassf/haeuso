import { useEffect, useMemo, useRef, useState } from 'react';
import { getComfortMessage, getComfortSource } from './comfort-service';
import { filterActiveJournalEntries, loadJournalEntries, saveJournalEntries } from './journal-repository';
import type { ComfortResponse, Emotion, JournalEntry } from './types';

type EmotionOption = {
  value: Emotion;
  label: string;
  emoji: string;
};

const EMOTIONS: EmotionOption[] = [
  { value: 'calm', label: '괜찮음', emoji: '😌' },
  { value: 'happy', label: '기쁨', emoji: '🙂' },
  { value: 'angry', label: '화남', emoji: '😠' },
  { value: 'anxious', label: '불안', emoji: '😟' },
  { value: 'sad', label: '슬픔', emoji: '😢' },
];
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const UNDO_TIMEOUT_MS = 5000;
const FLUSH_KNOB_SIZE = 44;
const FLUSH_TRACK_PADDING = 5;
const FLUSH_PROGRESS_PADDING = 0;
const FLUSH_TRIGGER_RATIO = 0.86;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function App() {
  const [content, setContent] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion>('calm');
  const [comfort, setComfort] = useState<ComfortResponse | null>(null);
  const [lastEntryIdFromComfort, setLastEntryIdFromComfort] = useState<string | null>(null);
  const [comfortLoading, setComfortLoading] = useState(false);
  const [comfortError, setComfortError] = useState('');

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [undoEntry, setUndoEntry] = useState<JournalEntry | null>(null);
  const undoTimerRef = useRef<number | null>(null);
  const flushTrackRef = useRef<HTMLDivElement | null>(null);
  const flushDragRef = useRef<{ pointerId: number | null; startX: number; startOffset: number }>({
    pointerId: null,
    startX: 0,
    startOffset: 0,
  });
  const [flushTrackWidth, setFlushTrackWidth] = useState(0);
  const [flushOffset, setFlushOffset] = useState(0);
  const [flushDragging, setFlushDragging] = useState(false);
  const [flushSubmitting, setFlushSubmitting] = useState(false);
  const comfortSource = getComfortSource();
  const privacyHint =
    comfortSource === 'api'
      ? '입력한 글은 저장되지 않고 바로 사라져요.'
      : '입력한 글은 저장되지 않고, 이 기기 안에서만 잠깐 처리돼요.';
  const flushMaxOffset = Math.max(0, flushTrackWidth - FLUSH_KNOB_SIZE - FLUSH_TRACK_PADDING * 2);
  const flushProgressWidth = Math.max(
    0,
    Math.min(
      flushTrackWidth - FLUSH_PROGRESS_PADDING,
      flushOffset + FLUSH_KNOB_SIZE + FLUSH_TRACK_PADDING * 2 - FLUSH_PROGRESS_PADDING,
    ),
  );
  const flushDisabled = comfortLoading || flushSubmitting;
  const flushReady = flushOffset >= flushMaxOffset * FLUSH_TRIGGER_RATIO;

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

  useEffect(() => {
    const target = flushTrackRef.current;
    if (!target) return undefined;

    const syncTrackWidth = () => setFlushTrackWidth(target.clientWidth);
    syncTrackWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncTrackWidth);
      return () => window.removeEventListener('resize', syncTrackWidth);
    }

    const observer = new ResizeObserver(syncTrackWidth);
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setFlushOffset((previousOffset) => Math.min(previousOffset, flushMaxOffset));
  }, [flushMaxOffset]);

  const recentEntries = useMemo(() => entries.slice(0, 10), [entries]);

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

  function closeUndoWindow() {
    if (undoTimerRef.current) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoEntry(null);
  }

  function removeEntryWithUndo(id: string) {
    const entryToDelete = entries.find((entry) => entry.id === id);
    if (!entryToDelete) return;

    setEntries((previousEntries) => previousEntries.filter((entry) => entry.id !== id));
    startUndoWindow(entryToDelete);
  }

  async function handleRelease() {
    if (!content.trim()) {
      setComfortError('마음을 짧게라도 적어주세요.');
      return;
    }

    setComfortLoading(true);
    setComfortError('');

    try {
      const createdEntryId = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const result = await getComfortMessage({
        content: content.trim(),
        emotion: selectedEmotion,
      });
      setComfort(result);
      setLastEntryIdFromComfort(createdEntryId);
      setEntries((prev) => [
        {
          id: createdEntryId,
          date: createdAt.slice(0, 10),
          emotion: selectedEmotion,
          createdAt,
          expiresAt: new Date(Date.parse(createdAt) + ONE_DAY_MS).toISOString(),
        },
        ...prev,
      ]);
      setContent('');
    } catch (error) {
      setComfortError(error instanceof Error ? error.message : '오류가 발생했습니다.');
    } finally {
      setComfortLoading(false);
    }
  }

  function getFlushOffsetByClientX(clientX: number) {
    const { startX, startOffset } = flushDragRef.current;
    return Math.round(clamp(startOffset + (clientX - startX), 0, flushMaxOffset));
  }

  async function triggerFlushRelease() {
    if (flushDisabled) return;

    setFlushSubmitting(true);
    setFlushOffset(flushMaxOffset);
    await handleRelease();
    setFlushSubmitting(false);
    setFlushOffset(0);
  }

  function handleFlushPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (flushDisabled || flushMaxOffset <= 0) return;

    event.preventDefault();
    flushDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: flushOffset,
    };
    setFlushDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleFlushPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!flushDragging || flushDragRef.current.pointerId !== event.pointerId) return;
    setFlushOffset(getFlushOffsetByClientX(event.clientX));
  }

  function finalizeFlushDrag(
    target: HTMLButtonElement,
    pointerId: number,
    finalOffset: number,
    canceled = false,
  ) {
    if (target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }
    flushDragRef.current.pointerId = null;
    setFlushDragging(false);

    if (canceled || finalOffset < flushMaxOffset * FLUSH_TRIGGER_RATIO) {
      setFlushOffset(0);
      return;
    }

    void triggerFlushRelease();
  }

  function handleFlushPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (flushDragRef.current.pointerId !== event.pointerId) return;

    const finalOffset = getFlushOffsetByClientX(event.clientX);
    setFlushOffset(finalOffset);
    finalizeFlushDrag(event.currentTarget, event.pointerId, finalOffset);
  }

  function handleFlushPointerCancel(event: React.PointerEvent<HTMLButtonElement>) {
    if (flushDragRef.current.pointerId !== event.pointerId) return;
    finalizeFlushDrag(event.currentTarget, event.pointerId, flushOffset, true);
  }

  function handleKeepTemporarily() {
    setComfort(null);
    setLastEntryIdFromComfort(null);
  }

  function handleDeleteNow() {
    if (lastEntryIdFromComfort) {
      removeEntryWithUndo(lastEntryIdFromComfort);
    }
    setComfort(null);
    setLastEntryIdFromComfort(null);
  }

  function handleDeleteEntry(id: string) {
    removeEntryWithUndo(id);
    if (lastEntryIdFromComfort === id) {
      setLastEntryIdFromComfort(null);
    }
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

  return (
    <main className="page">
      <section className="card">
        <header className="top">
          <p className="brand">Haeuso</p>
          <h1>쓰고, 놓고, 비우는 시간</h1>
        </header>

        <section className="section">
          <label className="label">지금 감정</label>
          <div className="emotion-grid">
            {EMOTIONS.map((emotion) => (
              <button
                key={emotion.value}
                type="button"
                className={selectedEmotion === emotion.value ? 'chip selected' : 'chip'}
                onClick={() => setSelectedEmotion(emotion.value)}
              >
                {emotion.emoji} {emotion.label}
              </button>
            ))}
          </div>

          <label className="label" htmlFor="release-input">
            비우고 싶은 마음
          </label>
          <textarea
            id="release-input"
            className="input"
            placeholder="여기에 적어주세요"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={1000}
          />
          <p className="hint input-hint">{privacyHint}</p>

          <div className="flush-slider">
            <div
              ref={flushTrackRef}
              className={flushDisabled ? 'flush-track disabled' : flushReady ? 'flush-track ready' : 'flush-track'}
              aria-label="놓아주기 슬라이더"
            >
              <div
                className={flushDragging ? 'flush-progress dragging' : 'flush-progress'}
                style={{ width: `${flushProgressWidth}px` }}
              />
              <p className="flush-label">{flushDisabled ? '한마디를 준비하는 중...' : '오른쪽으로 밀어서 비우기'}</p>
              <span className="flush-chevrons" aria-hidden="true">
                ›››
              </span>
              <button
                type="button"
                className={flushDragging ? 'flush-knob dragging' : 'flush-knob'}
                style={{ transform: `translateX(${flushOffset}px)` }}
                onPointerDown={handleFlushPointerDown}
                onPointerMove={handleFlushPointerMove}
                onPointerUp={handleFlushPointerUp}
                onPointerCancel={handleFlushPointerCancel}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    void triggerFlushRelease();
                  }
                }}
                aria-label="밀어서 놓아주기"
                disabled={flushDisabled}
              >
                <span className="flush-knob-icon">→</span>
              </button>
            </div>
          </div>

          {comfortError ? <p className="error">{comfortError}</p> : null}

          <section className="entry-list compact">
            <h2>최근 감정 {entries.length}개</h2>
            <p className="hint">내용은 바로 지워지고, 감정만 24시간 남습니다.</p>
            {recentEntries.length === 0 ? (
              <p className="hint">아직 남아있는 감정 기록이 없습니다.</p>
            ) : (
              <div className="emoji-timeline" aria-label="최근 감정 기록">
                {recentEntries.map((entry) => {
                  const matchedEmotion = EMOTIONS.find((emotion) => emotion.value === entry.emotion);
                  return (
                    <div
                      key={entry.id}
                      className="emoji-pill"
                      title={`${entry.date} ${matchedEmotion?.label ?? entry.emotion}`}
                    >
                      <span className="emoji-pill-main">
                        <span className="emoji-mark">{matchedEmotion?.emoji ?? '🙂'}</span>
                        <span className="emoji-date">{entry.date.slice(5)}</span>
                      </span>
                      <button
                        type="button"
                        className="emoji-remove"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteEntry(entry.id);
                        }}
                        aria-label={`${entry.date} 감정 기록 삭제`}
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </section>

      {comfort ? (
        <div className="modal-backdrop" onClick={handleKeepTemporarily}>
          <div className="modal-stack" onClick={(event) => event.stopPropagation()}>
            <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="comfort-modal-title">
              <header className="modal-header">
                <p id="comfort-modal-title" className="comfort-title">
                  따뜻한 한마디
                </p>
                <button type="button" className="modal-close" onClick={handleKeepTemporarily} aria-label="잠시 두기">
                  ×
                </button>
              </header>

              <p className="modal-message">{comfort.message}</p>
              {comfort.category === 'crisis' && comfort.resources.length > 0 ? (
                <ul className="resources">
                  {comfort.resources.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}

              <button type="button" className="secondary modal-main-action" onClick={handleKeepTemporarily}>
                잠시 두기
              </button>
              <p className="modal-hint">바깥 영역이나 X를 누르면 잠시 두기로 처리됩니다.</p>
            </section>

            <button type="button" className="modal-delete-link" onClick={handleDeleteNow}>
              즉시 삭제
            </button>
          </div>
        </div>
      ) : null}

      {undoEntry ? (
        <aside className="undo-toast" role="status" aria-live="polite">
          <p className="undo-text">감정을 삭제했어요.</p>
          <button type="button" className="undo-action" onClick={handleUndoDelete}>
            되돌리기
          </button>
        </aside>
      ) : null}
    </main>
  );
}
