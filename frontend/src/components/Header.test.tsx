import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Header from './Header';

describe('Header', () => {
  it('renders brand name', () => {
    render(<Header />);
    expect(screen.getByText('Haeuso')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<Header />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('쓰고, 놓고, 비우는 시간');
  });
});
