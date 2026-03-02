import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import UndoToast from './UndoToast';

describe('UndoToast', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<UndoToast visible={false} onUndo={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders message when visible', () => {
    render(<UndoToast visible={true} onUndo={vi.fn()} />);
    expect(screen.getByText('감정을 삭제했어요.')).toBeInTheDocument();
  });

  it('renders undo button when visible', () => {
    render(<UndoToast visible={true} onUndo={vi.fn()} />);
    expect(screen.getByText('되돌리기')).toBeInTheDocument();
  });

  it('calls onUndo when button is clicked', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<UndoToast visible={true} onUndo={onUndo} />);

    await user.click(screen.getByText('되돌리기'));
    expect(onUndo).toHaveBeenCalledOnce();
  });
});
