export type Emotion =
  | 'calm'
  | 'sad'
  | 'angry'
  | 'anxious'
  | 'happy';

export type JournalEntry = {
  id: string;
  date: string;
  emotion: Emotion;
  createdAt: string;
  expiresAt: string;
};

export type ComfortResponse = {
  category: 'normal' | 'crisis';
  message: string;
  resources: string[];
};

export type InsightResponse = {
  periodDays: number;
  dominantEmotion: Emotion | 'none';
  emotionCounts: Record<Emotion, number>;
  comment: string;
};
