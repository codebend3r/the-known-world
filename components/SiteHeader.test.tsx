import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteHeader } from './SiteHeader';

vi.mock('next/navigation', () => ({
  usePathname: () => '/houses/',
}));

describe('SiteHeader', () => {
  it('renders the wordmark "The Known World" linking to /', () => {
    render(<SiteHeader />);
    const home = screen.getByRole('link', { name: /the known world/i });
    expect(home.getAttribute('href')).toBe('/');
  });

  it('exposes a primary nav with Maps, Timeline, Houses, and Characters', () => {
    render(<SiteHeader />);
    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(nav).toBeDefined();

    const links = screen.getAllByRole('link');
    const navLinks = links.filter((l) =>
      ['/maps/', '/timeline/', '/houses/', '/characters/'].includes(l.getAttribute('href') ?? ''),
    );
    expect(navLinks).toHaveLength(4);

    const labels = navLinks.map((l) => l.textContent?.trim());
    expect(labels).toEqual(['Maps', 'Timeline', 'Houses', 'Characters']);
  });

  it('marks the current section with aria-current="page"', () => {
    render(<SiteHeader />);
    const housesLink = screen.getByRole('link', { name: /houses/i });
    expect(housesLink.getAttribute('aria-current')).toBe('page');

    const mapsLink = screen.getByRole('link', { name: /maps/i });
    expect(mapsLink.getAttribute('aria-current')).toBeNull();
  });
});
