import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EmotionSelector from './EmotionSelector';

describe('EmotionSelector', () => {
  it('renders all 5 emotion chips', () => {
    render(<EmotionSelector selected="calm" onSelect={vi.fn()} />);
    expect(screen.getByText(/괜찮음/)).toBeInTheDocument();
    expect(screen.getByText(/기쁨/)).toBeInTheDocument();
    expect(screen.getByText(/화남/)).toBeInTheDocument();
    expect(screen.getByText(/불안/)).toBeInTheDocument();
    expect(screen.getByText(/슬픔/)).toBeInTheDocument();
  });

  it('highlights the selected emotion', () => {
    render(<EmotionSelector selected="happy" onSelect={vi.fn()} />);
    const happyChip = screen.getByText(/기쁨/).closest('button');
    expect(happyChip).toHaveClass('selected');
  });

  it('calls onSelect when a chip is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EmotionSelector selected="calm" onSelect={onSelect} />);

    await user.click(screen.getByText(/슬픔/));
    expect(onSelect).toHaveBeenCalledWith('sad');
  });

  it('renders the label', () => {
    render(<EmotionSelector selected="calm" onSelect={vi.fn()} />);
    expect(screen.getByText('지금 감정')).toBeInTheDocument();
  });
});
