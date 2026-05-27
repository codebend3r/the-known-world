import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sigil } from './Sigil';

describe('Sigil', () => {
  it('renders an accessible img with the house name as label by default', () => {
    render(<Sigil houseSlug="stark" houseName="Stark" />);
    const img = screen.getByRole('img', { name: /sigil of house stark/i });
    expect(img).toBeDefined();
  });

  it('positions the sprite at the cell for the given slug', () => {
    const { container } = render(<Sigil houseSlug="greyjoy" houseName="Greyjoy" />);
    const el = container.querySelector('.sigil') as HTMLElement;
    expect(el.style.backgroundPosition).toBe('100% 0%');
  });

  it('renders nothing when the slug is unknown', () => {
    const { container } = render(<Sigil houseSlug="not-a-house" houseName="Mystery" />);
    expect(container.querySelector('.sigil')).toBeNull();
  });

  it('marks itself decorative with `aria-hidden` when `decorative` is set', () => {
    const { container } = render(
      <Sigil houseSlug="stark" houseName="Stark" decorative />,
    );
    const el = container.querySelector('.sigil') as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBe('presentation');
    expect(el.getAttribute('aria-label')).toBeNull();
  });
});
