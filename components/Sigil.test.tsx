import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sigil } from './Sigil';

describe('Sigil', () => {
  it('renders an accessible img with the house name as label by default', () => {
    render(<Sigil houseSlug="stark" houseName="Stark" />);
    const el = screen.getByRole('img', { name: /sigil of house stark/i });
    expect(el).toBeDefined();
  });

  it('positions the background to the cell for the given slug', () => {
    const { container } = render(<Sigil houseSlug="greyjoy" houseName="Greyjoy" />);
    const el = container.querySelector('.sigil') as HTMLElement;
    // greyjoy is index 4 → col 4, row 0 → 100% 0%
    expect(el.style.backgroundPosition).toBe('100% 0%');
  });

  it('renders nothing when the slug is unknown', () => {
    const { container } = render(<Sigil houseSlug="not-a-house" houseName="Mystery" />);
    expect(container.querySelector('.sigil')).toBeNull();
  });

  it('marks itself decorative with no `aria-label` and `aria-hidden` when `decorative` is set', () => {
    const { container } = render(
      <Sigil houseSlug="stark" houseName="Stark" decorative />,
    );
    const el = container.querySelector('.sigil') as HTMLElement;
    expect(el.getAttribute('aria-label')).toBeNull();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBe('presentation');
  });
});
