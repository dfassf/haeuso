import type { ComfortResponse } from '../types';

type Props = {
  comfort: ComfortResponse | null;
  onKeep: () => void;
  onDelete: () => void;
};

export default function ComfortModal({ comfort, onKeep, onDelete }: Props) {
  if (!comfort) return null;

  return (
    <div className="modal-backdrop" onClick={onKeep}>
      <div className="modal-stack" onClick={(event) => event.stopPropagation()}>
        <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="comfort-modal-title">
          <header className="modal-header">
            <p id="comfort-modal-title" className="comfort-title">
              따뜻한 한마디
            </p>
            <button type="button" className="modal-close" onClick={onKeep} aria-label="잠시 두기">
              ×
            </button>
          </header>

          <p className="modal-message">{comfort.message}</p>
          {comfort.category === 'crisis' && comfort.resources.length > 0 ? (
            <ul className="resources">
              {comfort.resources.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}

          <button type="button" className="secondary modal-main-action" onClick={onKeep}>
            잠시 두기
          </button>
          <p className="modal-hint">바깥 영역이나 X를 누르면 잠시 두기로 처리됩니다.</p>
        </section>

        <button type="button" className="modal-delete-link" onClick={onDelete}>
          즉시 삭제
        </button>
      </div>
    </div>
  );
}
