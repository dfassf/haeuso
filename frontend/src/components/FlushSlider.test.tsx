import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import FlushSlider from './FlushSlider';

function renderSlider(overrides: Partial<React.ComponentProps<typeof FlushSlider>> = {}) {
  const defaultProps: React.ComponentProps<typeof FlushSlider> = {
    flushTrackRef: createRef<HTMLDivElement>(),
    flushOffset: 0,
    flushDragging: false,
    flushDisabled: false,
    flushReady: false,
    flushProgressWidth: 0,
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerUp: vi.fn(),
    handlePointerCancel: vi.fn(),
    triggerRelease: vi.fn(),
    onRelease: vi.fn(),
  };
  return render(<FlushSlider {...defaultProps} {...overrides} />);
}

describe('FlushSlider', () => {
  it('shows default label when not disabled', () => {
    renderSlider();
    expect(screen.getByText('오른쪽으로 밀어서 비우기')).toBeInTheDocument();
  });

  it('shows loading label when disabled', () => {
    renderSlider({ flushDisabled: true });
    expect(screen.getByText('한마디를 준비하는 중...')).toBeInTheDocument();
  });

  it('renders knob button with aria-label', () => {
    renderSlider();
    expect(screen.getByRole('button', { name: '밀어서 놓아주기' })).toBeInTheDocument();
  });

  it('disables knob when flushDisabled is true', () => {
    renderSlider({ flushDisabled: true });
    expect(screen.getByRole('button', { name: '밀어서 놓아주기' })).toBeDisabled();
  });

  it('renders track with aria-label', () => {
    renderSlider();
    expect(screen.getByLabelText('놓아주기 슬라이더')).toBeInTheDocument();
  });
});
