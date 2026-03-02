import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import TextInput from './TextInput';

describe('TextInput', () => {
  it('renders placeholder', () => {
    render(<TextInput content="" onChange={vi.fn()} privacyHint="테스트 힌트" />);
    expect(screen.getByPlaceholderText('여기에 적어주세요')).toBeInTheDocument();
  });

  it('renders privacy hint', () => {
    render(<TextInput content="" onChange={vi.fn()} privacyHint="입력한 글은 저장되지 않아요." />);
    expect(screen.getByText('입력한 글은 저장되지 않아요.')).toBeInTheDocument();
  });

  it('calls onChange on user input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextInput content="" onChange={onChange} privacyHint="힌트" />);

    const textarea = screen.getByPlaceholderText('여기에 적어주세요');
    await user.type(textarea, 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('displays current content', () => {
    render(<TextInput content="현재 내용" onChange={vi.fn()} privacyHint="힌트" />);
    expect(screen.getByDisplayValue('현재 내용')).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<TextInput content="" onChange={vi.fn()} privacyHint="힌트" />);
    expect(screen.getByText('비우고 싶은 마음')).toBeInTheDocument();
  });
});
