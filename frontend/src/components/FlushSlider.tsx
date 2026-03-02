type Props = {
  flushTrackRef: React.Ref<HTMLDivElement>;
  flushOffset: number;
  flushDragging: boolean;
  flushDisabled: boolean;
  flushReady: boolean;
  flushProgressWidth: number;
  handlePointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  handlePointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void;
  handlePointerUp: (event: React.PointerEvent<HTMLButtonElement>, onRelease: () => Promise<void>) => void;
  handlePointerCancel: (event: React.PointerEvent<HTMLButtonElement>, onRelease: () => Promise<void>) => void;
  triggerRelease: (onRelease: () => Promise<void>) => void;
  onRelease: () => Promise<void>;
};

export default function FlushSlider({
  flushTrackRef,
  flushOffset,
  flushDragging,
  flushDisabled,
  flushReady,
  flushProgressWidth,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handlePointerCancel,
  triggerRelease,
  onRelease,
}: Props) {
  return (
    <div className="flush-slider">
      <div
        ref={flushTrackRef}
        className={flushDisabled ? 'flush-track disabled' : flushReady ? 'flush-track ready' : 'flush-track'}
        aria-label="놓아주기 슬라이더"
      >
        <div
          className={flushDragging ? 'flush-progress dragging' : 'flush-progress'}
          style={{ width: `${flushProgressWidth}px` }}
        />
        <p className="flush-label">{flushDisabled ? '한마디를 준비하는 중...' : '오른쪽으로 밀어서 비우기'}</p>
        <span className="flush-chevrons" aria-hidden="true">
          ›››
        </span>
        <button
          type="button"
          className={flushDragging ? 'flush-knob dragging' : 'flush-knob'}
          style={{ transform: `translateX(${flushOffset}px)` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => handlePointerUp(e, onRelease)}
          onPointerCancel={(e) => handlePointerCancel(e, onRelease)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              void triggerRelease(onRelease);
            }
          }}
          aria-label="밀어서 놓아주기"
          disabled={flushDisabled}
        >
          <span className="flush-knob-icon">→</span>
        </button>
      </div>
    </div>
  );
}
