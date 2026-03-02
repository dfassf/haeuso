import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ComfortModal from './ComfortModal';

describe('ComfortModal', () => {
  it('renders nothing when comfort is null', () => {
    const { container } = render(<ComfortModal comfort={null} onKeep={vi.fn()} onDelete={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders comfort message', () => {
    render(
      <ComfortModal
        comfort={{ category: 'normal', message: '잘 하고 계세요.', resources: [] }}
        onKeep={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('잘 하고 계세요.')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(
      <ComfortModal
        comfort={{ category: 'normal', message: '메시지', resources: [] }}
        onKeep={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('따뜻한 한마디')).toBeInTheDocument();
  });

  it('renders crisis resources when category is crisis', () => {
    render(
      <ComfortModal
        comfort={{
          category: 'crisis',
          message: '도움을 받으세요.',
          resources: ['상담전화 1393', '자살예방 1393'],
        }}
        onKeep={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByText('상담전화 1393')).toBeInTheDocument();
    expect(screen.getByText('자살예방 1393')).toBeInTheDocument();
  });

  it('calls onKeep when "잠시 두기" button is clicked', async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    render(
      <ComfortModal
        comfort={{ category: 'normal', message: '메시지', resources: [] }}
        onKeep={onKeep}
        onDelete={vi.fn()}
      />,
    );

    // Two "잠시 두기" elements: X button (aria-label) and text button
    const buttons = screen.getAllByRole('button', { name: /잠시 두기/ });
    await user.click(buttons[1]); // Text button "잠시 두기"
    expect(onKeep).toHaveBeenCalledOnce();
  });

  it('calls onDelete when "즉시 삭제" button is clicked', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <ComfortModal
        comfort={{ category: 'normal', message: '메시지', resources: [] }}
        onKeep={vi.fn()}
        onDelete={onDelete}
      />,
    );

    await user.click(screen.getByText('즉시 삭제'));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('calls onKeep when close button is clicked', async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    render(
      <ComfortModal
        comfort={{ category: 'normal', message: '메시지', resources: [] }}
        onKeep={onKeep}
        onDelete={vi.fn()}
      />,
    );

    // The X close button has aria-label "잠시 두기"
    const buttons = screen.getAllByRole('button', { name: '잠시 두기' });
    await user.click(buttons[0]); // First one is the X button
    expect(onKeep).toHaveBeenCalled();
  });
});
