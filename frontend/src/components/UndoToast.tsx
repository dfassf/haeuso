type Props = {
  visible: boolean;
  onUndo: () => void;
};

export default function UndoToast({ visible, onUndo }: Props) {
  if (!visible) return null;

  return (
    <aside className="undo-toast" role="status" aria-live="polite">
      <p className="undo-text">감정을 삭제했어요.</p>
      <button type="button" className="undo-action" onClick={onUndo}>
        되돌리기
      </button>
    </aside>
  );
}
