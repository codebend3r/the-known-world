import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainMenu } from './MainMenu';

describe('MainMenu', () => {
  it('renders three tiles in order: Maps, Timeline, Houses', () => {
    render(<MainMenu />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);

    expect(links[0].textContent).toContain('Maps');
    expect(links[0].getAttribute('href')).toBe('/maps/');

    expect(links[1].textContent).toContain('Timeline');
    expect(links[1].getAttribute('href')).toBe('/timeline/');

    expect(links[2].textContent).toContain('Houses');
    expect(links[2].getAttribute('href')).toBe('/houses/');
  });

  it('marks Maps and Timeline as coming soon (Houses is live)', () => {
    render(<MainMenu />);
    const pills = screen.getAllByText(/coming soon/i);
    expect(pills).toHaveLength(2);
  });

  it('wraps tiles in a nav landmark labelled "Atlas sections"', () => {
    render(<MainMenu />);
    const nav = screen.getByRole('navigation', { name: /atlas sections/i });
    expect(nav).toBeDefined();
  });
});
