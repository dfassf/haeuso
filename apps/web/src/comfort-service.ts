import { requestComfort } from './api';
import type { ComfortResponse, Emotion } from './types';

type ComfortSource = 'api' | 'local';

const comfortSource: ComfortSource = import.meta.env.VITE_COMFORT_SOURCE === 'local' ? 'local' : 'api';

const LOCAL_COMFORT_MESSAGES: Record<Emotion, string[]> = {
  calm: [
    '조용히 버텨낸 하루였네요. 지금의 차분함을 그대로 지켜가셔도 충분합니다.',
    '지금 느끼는 안정감은 스스로 지켜낸 결과예요. 오늘도 잘 해내셨습니다.',
  ],
  happy: [
    '좋은 감정이 스쳐 지나가더라도 충분히 누리셔도 됩니다. 그 자체로 소중합니다.',
    '기쁜 마음을 느낄 수 있었다는 것만으로도 오늘은 의미가 큰 하루예요.',
  ],
  angry: [
    '화가 나는 건 당연한 반응입니다. 지금 느끼는 감정을 억지로 누르지 않으셔도 괜찮습니다.',
    '답답하고 화나는 순간을 견디셨네요. 지금 이곳에서 잠시 내려놓아도 됩니다.',
  ],
  anxious: [
    '불안한 마음이 올라오는 날에도 버티고 계신 게 이미 큰 힘입니다.',
    '걱정이 많았던 하루였겠지만, 지금 이렇게 적어낸 것만으로도 충분히 잘하고 계십니다.',
  ],
  sad: [
    '슬픔이 남아 있는 날은 속도를 늦춰도 괜찮습니다. 오늘의 마음을 존중해 주세요.',
    '마음이 무거웠던 하루를 잘 지나오셨습니다. 지금은 잠시 쉬어가셔도 됩니다.',
  ],
};

function pickLocalMessage(emotion: Emotion, content: string) {
  const candidates = LOCAL_COMFORT_MESSAGES[emotion];
  if (candidates.length === 1) return candidates[0];

  let hash = 0;
  const seed = `${emotion}:${content.length}`;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 2147483647;
  }

  return candidates[Math.abs(hash) % candidates.length];
}

export async function getComfortMessage(payload: {
  content: string;
  emotion: Emotion;
}): Promise<ComfortResponse> {
  if (comfortSource === 'local') {
    return {
      category: 'normal',
      message: pickLocalMessage(payload.emotion, payload.content),
      resources: [],
    };
  }

  return requestComfort(payload);
}

export function getComfortSource() {
  return comfortSource;
}
