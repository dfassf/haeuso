import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { JournalEntry } from '../types';
import EmojiTimeline from './EmojiTimeline';

const mockEntry: JournalEntry = {
  id: 'entry-1',
  date: '2026-02-28',
  emotion: 'happy',
  createdAt: '2026-02-28T10:00:00.000Z',
  expiresAt: '2026-03-01T10:00:00.000Z',
};

describe('EmojiTimeline', () => {
  it('shows empty message when no entries', () => {
    render(<EmojiTimeline entries={[]} totalCount={0} onDelete={vi.fn()} />);
    expect(screen.getByText('아직 남아있는 감정 기록이 없습니다.')).toBeInTheDocument();
  });

  it('shows total count', () => {
    render(<EmojiTimeline entries={[mockEntry]} totalCount={5} onDelete={vi.fn()} />);
    expect(screen.getByText(/최근 감정 5개/)).toBeInTheDocument();
  });

  it('renders entry with emoji and date', () => {
    render(<EmojiTimeline entries={[mockEntry]} totalCount={1} onDelete={vi.fn()} />);
    expect(screen.getByText('02-28')).toBeInTheDocument();
  });

  it('calls onDelete when remove button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<EmojiTimeline entries={[mockEntry]} totalCount={1} onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: /감정 기록 삭제/ }));
    expect(onDelete).toHaveBeenCalledWith('entry-1');
  });

  it('shows hint about 24-hour retention', () => {
    render(<EmojiTimeline entries={[]} totalCount={0} onDelete={vi.fn()} />);
    expect(screen.getByText(/감정만 24시간 남습니다/)).toBeInTheDocument();
  });
});
