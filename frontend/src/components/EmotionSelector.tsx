import { EMOTIONS } from '../constants';
import type { Emotion } from '../types';

type Props = {
  selected: Emotion;
  onSelect: (emotion: Emotion) => void;
};

export default function EmotionSelector({ selected, onSelect }: Props) {
  return (
    <>
      <label className="label">지금 감정</label>
      <div className="emotion-grid">
        {EMOTIONS.map((emotion) => (
          <button
            key={emotion.value}
            type="button"
            className={selected === emotion.value ? 'chip selected' : 'chip'}
            onClick={() => onSelect(emotion.value)}
          >
            {emotion.emoji} {emotion.label}
          </button>
        ))}
      </div>
    </>
  );
}
