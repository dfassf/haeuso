import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useComfort } from './useComfort';

vi.mock('../comfort-service', () => ({
  getComfortMessage: vi.fn(),
}));

import { getComfortMessage } from '../comfort-service';

const mockGetComfort = vi.mocked(getComfortMessage);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useComfort', () => {
  it('starts with no comfort and no loading', () => {
    const { result } = renderHook(() => useComfort());

    expect(result.current.comfort).toBeNull();
    expect(result.current.comfortLoading).toBe(false);
    expect(result.current.comfortError).toBe('');
  });

  it('sets error when content is empty', async () => {
    const { result } = renderHook(() => useComfort());
    const addEntry = vi.fn(() => 'entry-1');

    await act(async () => {
      await result.current.requestRelease('', 'calm', addEntry);
    });

    expect(result.current.comfortError).toBe('마음을 짧게라도 적어주세요.');
    expect(addEntry).not.toHaveBeenCalled();
  });

  it('sets error when content is only whitespace', async () => {
    const { result } = renderHook(() => useComfort());
    const addEntry = vi.fn(() => 'entry-1');

    await act(async () => {
      await result.current.requestRelease('   ', 'calm', addEntry);
    });

    expect(result.current.comfortError).toBe('마음을 짧게라도 적어주세요.');
  });

  it('calls getComfortMessage and sets comfort on success', async () => {
    const comfortResponse = {
      category: 'normal' as const,
      message: '잘 하고 계세요.',
      resources: [],
    };
    mockGetComfort.mockResolvedValue(comfortResponse);

    const { result } = renderHook(() => useComfort());
    const addEntry = vi.fn(() => 'entry-1');

    await act(async () => {
      await result.current.requestRelease('힘들었어요', 'sad', addEntry);
    });

    expect(addEntry).toHaveBeenCalledWith('sad');
    expect(result.current.comfort).toEqual(comfortResponse);
    expect(result.current.comfortLoading).toBe(false);
    expect(result.current.comfortError).toBe('');
  });

  it('sets error on API failure', async () => {
    mockGetComfort.mockRejectedValue(new Error('네트워크 오류'));

    const { result } = renderHook(() => useComfort());
    const addEntry = vi.fn(() => 'entry-1');

    await act(async () => {
      await result.current.requestRelease('힘들었어요', 'sad', addEntry);
    });

    expect(result.current.comfortError).toBe('네트워크 오류');
    expect(result.current.comfort).toBeNull();
  });

  it('handleKeepTemporarily clears comfort', async () => {
    mockGetComfort.mockResolvedValue({
      category: 'normal',
      message: '잘 하고 계세요.',
      resources: [],
    });

    const { result } = renderHook(() => useComfort());
    const addEntry = vi.fn(() => 'entry-1');

    await act(async () => {
      await result.current.requestRelease('힘들었어요', 'sad', addEntry);
    });

    expect(result.current.comfort).not.toBeNull();

    act(() => {
      result.current.handleKeepTemporarily();
    });

    expect(result.current.comfort).toBeNull();
  });

  it('handleDeleteNow calls removeEntryWithUndo and clears comfort', async () => {
    mockGetComfort.mockResolvedValue({
      category: 'normal',
      message: '잘 하고 계세요.',
      resources: [],
    });

    const { result } = renderHook(() => useComfort());
    const addEntry = vi.fn(() => 'entry-1');

    await act(async () => {
      await result.current.requestRelease('힘들었어요', 'sad', addEntry);
    });

    const removeEntryWithUndo = vi.fn();

    act(() => {
      result.current.handleDeleteNow(removeEntryWithUndo);
    });

    expect(removeEntryWithUndo).toHaveBeenCalledWith('entry-1');
    expect(result.current.comfort).toBeNull();
  });

  it('clearLastEntryId only clears if matching', async () => {
    mockGetComfort.mockResolvedValue({
      category: 'normal',
      message: '잘 하고 계세요.',
      resources: [],
    });

    const { result } = renderHook(() => useComfort());
    const addEntry = vi.fn(() => 'entry-1');

    await act(async () => {
      await result.current.requestRelease('힘들었어요', 'sad', addEntry);
    });

    const removeEntryWithUndo = vi.fn();

    act(() => {
      result.current.clearLastEntryId('other-id');
    });

    // Should not have cleared since 'other-id' doesn't match
    act(() => {
      result.current.handleDeleteNow(removeEntryWithUndo);
    });

    expect(removeEntryWithUndo).toHaveBeenCalledWith('entry-1');
  });
});
