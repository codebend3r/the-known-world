import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainMenu } from './MainMenu';

describe('MainMenu', () => {
  it('renders exactly three tiles in order: Map, Timeline, Encyclopedia', () => {
    render(<MainMenu />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);

    expect(links[0].textContent).toContain('Map');
    expect(links[0].getAttribute('href')).toBe('/map/');

    expect(links[1].textContent).toContain('Timeline');
    expect(links[1].getAttribute('href')).toBe('/timeline/');

    expect(links[2].textContent).toContain('Encyclopedia');
    expect(links[2].getAttribute('href')).toBe('/encyclopedia/');
  });

  it('marks all three tiles as coming soon', () => {
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
