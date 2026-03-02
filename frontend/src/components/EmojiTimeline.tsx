import { EMOTIONS } from '../constants';
import type { JournalEntry } from '../types';

type Props = {
  entries: JournalEntry[];
  totalCount: number;
  onDelete: (id: string) => void;
};

export default function EmojiTimeline({ entries, totalCount, onDelete }: Props) {
  return (
    <section className="entry-list compact">
      <h2>최근 감정 {totalCount}개</h2>
      <p className="hint">내용은 바로 지워지고, 감정만 24시간 남습니다.</p>
      {entries.length === 0 ? (
        <p className="hint">아직 남아있는 감정 기록이 없습니다.</p>
      ) : (
        <div className="emoji-timeline" aria-label="최근 감정 기록">
          {entries.map((entry) => {
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
                    onDelete(entry.id);
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
  );
}
