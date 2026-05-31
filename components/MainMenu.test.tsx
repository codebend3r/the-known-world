import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainMenu } from '@/components/MainMenu';

describe('MainMenu', () => {
  it('renders five tiles in order: Maps, Timeline, Houses, Weapons, Dragons', () => {
    render(<MainMenu />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);

    expect(links[0].textContent).toContain('Maps');
    expect(links[0].getAttribute('href')).toBe('/maps/');

    expect(links[1].textContent).toContain('Timeline');
    expect(links[1].getAttribute('href')).toBe('/timeline/');

    expect(links[2].textContent).toContain('Houses');
    expect(links[2].getAttribute('href')).toBe('/houses/');

    expect(links[3].textContent).toContain('Weapons');
    expect(links[3].getAttribute('href')).toBe('/weapons/');

    expect(links[4].textContent).toContain('Dragons');
    expect(links[4].getAttribute('href')).toBe('/dragons/');
  });

  it('marks Maps and Timeline as coming soon', () => {
    render(<MainMenu />);
    const pills = screen.getAllByText(/coming soon/i);
    expect(pills).toHaveLength(2);
  });

  it('wraps tiles in a nav landmark labelled "Atlas sections"', () => {
    render(<MainMenu />);
    expect(screen.getByRole('navigation', { name: /atlas sections/i })).toBeDefined();
  });
});
