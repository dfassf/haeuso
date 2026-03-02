import { useEffect, useRef, useState } from 'react';
import {
  FLUSH_KNOB_SIZE,
  FLUSH_PROGRESS_PADDING,
  FLUSH_TRACK_PADDING,
  FLUSH_TRIGGER_RATIO,
  clamp,
} from '../constants';

export function useFlushSlider(disabled: boolean) {
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

  const flushMaxOffset = Math.max(0, flushTrackWidth - FLUSH_KNOB_SIZE - FLUSH_TRACK_PADDING * 2);
  const flushProgressWidth = Math.max(
    0,
    Math.min(
      flushTrackWidth - FLUSH_PROGRESS_PADDING,
      flushOffset + FLUSH_KNOB_SIZE + FLUSH_TRACK_PADDING * 2 - FLUSH_PROGRESS_PADDING,
    ),
  );
  const flushDisabled = disabled || flushSubmitting;
  const flushReady = flushOffset >= flushMaxOffset * FLUSH_TRIGGER_RATIO;

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

  function getFlushOffsetByClientX(clientX: number) {
    const { startX, startOffset } = flushDragRef.current;
    return Math.round(clamp(startOffset + (clientX - startX), 0, flushMaxOffset));
  }

  async function triggerRelease(onRelease: () => Promise<void>) {
    if (flushDisabled) return;

    setFlushSubmitting(true);
    setFlushOffset(flushMaxOffset);
    await onRelease();
    setFlushSubmitting(false);
    setFlushOffset(0);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
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

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!flushDragging || flushDragRef.current.pointerId !== event.pointerId) return;
    setFlushOffset(getFlushOffsetByClientX(event.clientX));
  }

  function finalizeFlushDrag(
    target: HTMLButtonElement,
    pointerId: number,
    finalOffset: number,
    onRelease: () => Promise<void>,
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

    void triggerRelease(onRelease);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>, onRelease: () => Promise<void>) {
    if (flushDragRef.current.pointerId !== event.pointerId) return;

    const finalOffset = getFlushOffsetByClientX(event.clientX);
    setFlushOffset(finalOffset);
    finalizeFlushDrag(event.currentTarget, event.pointerId, finalOffset, onRelease);
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLButtonElement>, onRelease: () => Promise<void>) {
    if (flushDragRef.current.pointerId !== event.pointerId) return;
    finalizeFlushDrag(event.currentTarget, event.pointerId, flushOffset, onRelease, true);
  }

  return {
    flushTrackRef,
    flushOffset,
    flushDragging,
    flushDisabled,
    flushReady,
    flushProgressWidth,
    triggerRelease,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  };
}
