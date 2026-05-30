import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ViewToggle } from '@/components/ViewToggle';

describe('ViewToggle', () => {
  it('marks the selected button with aria-pressed="true"', () => {
    render(<ViewToggle value="grid" onChange={() => {}} />);
    expect(
      screen.getByRole('button', { name: /grid view/i }).getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: /list view/i }).getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('calls onChange when the unselected button is clicked', () => {
    const onChange = vi.fn();
    render(<ViewToggle value="grid" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(onChange).toHaveBeenCalledWith('list');
  });

  it('does not call onChange when the selected button is clicked', () => {
    const onChange = vi.fn();
    render(<ViewToggle value="list" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /list view/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('exposes a labelled group', () => {
    render(<ViewToggle value="grid" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: /view/i })).toBeDefined();
  });
});
