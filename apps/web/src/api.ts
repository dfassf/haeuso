import type { ComfortResponse, InsightResponse, JournalEntry, Emotion } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

type ComfortRequest = {
  content: string;
  emotion?: Emotion;
};

type InsightRequest = {
  periodDays: 7 | 30;
  entries: Array<Pick<JournalEntry, 'date' | 'emotion'>>;
};

export async function requestComfort(payload: ComfortRequest): Promise<ComfortResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/comfort`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('공감 메시지를 불러오지 못했습니다.');
  }

  return response.json();
}

export async function requestInsight(payload: InsightRequest): Promise<InsightResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/insight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('기간 분석을 불러오지 못했습니다.');
  }

  return response.json();
}
