import type { Emotion } from './types';

export type EmotionOption = {
  value: Emotion;
  label: string;
  emoji: string;
};

export const EMOTIONS: EmotionOption[] = [
  { value: 'calm', label: '괜찮음', emoji: '😌' },
  { value: 'happy', label: '기쁨', emoji: '🙂' },
  { value: 'angry', label: '화남', emoji: '😠' },
  { value: 'anxious', label: '불안', emoji: '😟' },
  { value: 'sad', label: '슬픔', emoji: '😢' },
];

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const UNDO_TIMEOUT_MS = 5000;
export const FLUSH_KNOB_SIZE = 44;
export const FLUSH_TRACK_PADDING = 5;
export const FLUSH_PROGRESS_PADDING = 0;
export const FLUSH_TRIGGER_RATIO = 0.86;

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
