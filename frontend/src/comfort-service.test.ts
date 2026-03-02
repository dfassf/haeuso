import { afterEach, describe, expect, it, vi } from 'vitest';

describe('comfort-service', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  describe('local mode', () => {
    it('returns a local comfort message for each emotion', async () => {
      vi.stubEnv('VITE_COMFORT_SOURCE', 'local');
      const { getComfortMessage } = await import('./comfort-service');

      const emotions = ['calm', 'happy', 'angry', 'anxious', 'sad'] as const;

      for (const emotion of emotions) {
        const result = await getComfortMessage({ content: '테스트', emotion });
        expect(result.category).toBe('normal');
        expect(result.message).toBeTruthy();
        expect(result.resources).toEqual([]);
      }
    });

    it('returns deterministic message for same input', async () => {
      vi.stubEnv('VITE_COMFORT_SOURCE', 'local');
      const { getComfortMessage } = await import('./comfort-service');

      const result1 = await getComfortMessage({ content: '같은 내용', emotion: 'calm' });
      const result2 = await getComfortMessage({ content: '같은 내용', emotion: 'calm' });
      expect(result1.message).toBe(result2.message);
    });
  });

  describe('getComfortSource', () => {
    it('returns "local" when VITE_COMFORT_SOURCE is "local"', async () => {
      vi.stubEnv('VITE_COMFORT_SOURCE', 'local');
      const { getComfortSource } = await import('./comfort-service');
      expect(getComfortSource()).toBe('local');
    });

    it('returns "api" when VITE_COMFORT_SOURCE is not "local"', async () => {
      vi.stubEnv('VITE_COMFORT_SOURCE', '');
      const { getComfortSource } = await import('./comfort-service');
      expect(getComfortSource()).toBe('api');
    });
  });
});
