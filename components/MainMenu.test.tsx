import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainMenu } from './MainMenu';

describe('MainMenu', () => {
  it('renders four tiles in order: Maps, Timeline, Encyclopedia, Houses', () => {
    render(<MainMenu />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);

    expect(links[0].textContent).toContain('Maps');
    expect(links[0].getAttribute('href')).toBe('/maps/');

    expect(links[1].textContent).toContain('Timeline');
    expect(links[1].getAttribute('href')).toBe('/timeline/');

    expect(links[2].textContent).toContain('Encyclopedia');
    expect(links[2].getAttribute('href')).toBe('/encyclopedia/');

    expect(links[3].textContent).toContain('Houses');
    expect(links[3].getAttribute('href')).toBe('/houses/');
  });

  it('marks Maps, Timeline, and Encyclopedia as coming soon (Houses is live)', () => {
    render(<MainMenu />);
    const pills = screen.getAllByText(/coming soon/i);
    expect(pills).toHaveLength(3);
  });

  it('wraps tiles in a nav landmark labelled "Atlas sections"', () => {
    render(<MainMenu />);
    const nav = screen.getByRole('navigation', { name: /atlas sections/i });
    expect(nav).toBeDefined();
  });
});
