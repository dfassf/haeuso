import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useFlushSlider } from './useFlushSlider';

describe('useFlushSlider', () => {
  it('starts with zero offset and not dragging', () => {
    const { result } = renderHook(() => useFlushSlider(false));

    expect(result.current.flushOffset).toBe(0);
    expect(result.current.flushDragging).toBe(false);
    // When trackWidth is 0, maxOffset is 0, so 0 >= 0*0.86 is true
    expect(result.current.flushReady).toBe(true);
  });

  it('is disabled when loading is true', () => {
    const { result } = renderHook(() => useFlushSlider(true));

    expect(result.current.flushDisabled).toBe(true);
  });

  it('is not disabled when loading is false', () => {
    const { result } = renderHook(() => useFlushSlider(false));

    expect(result.current.flushDisabled).toBe(false);
  });

  it('provides a ref for the track', () => {
    const { result } = renderHook(() => useFlushSlider(false));

    expect(result.current.flushTrackRef).toBeDefined();
    expect(result.current.flushTrackRef.current).toBeNull();
  });

  it('progressWidth starts at minimum value', () => {
    const { result } = renderHook(() => useFlushSlider(false));

    // With trackWidth=0, progressWidth should be bounded
    expect(result.current.flushProgressWidth).toBeGreaterThanOrEqual(0);
  });
});
