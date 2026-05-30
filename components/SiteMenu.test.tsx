import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SiteMenu } from '@/components/SiteMenu';

vi.mock('next/navigation', () => ({
  usePathname: () => '/houses/',
}));

describe('SiteMenu', () => {
  it('renders the trigger collapsed by default', () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('hides the nav links from the accessibility tree when closed', () => {
    render(<SiteMenu />);
    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(0);
  });

  it('reveals the primary nav with Maps, Timeline, Houses, Characters when opened', () => {
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));

    const nav = screen.getByRole('navigation', { name: /primary/i });
    expect(nav).toBeDefined();

    const links = screen.getAllByRole('link');
    const navLinks = links.filter((l) =>
      ['/maps/', '/timeline/', '/houses/', '/characters/'].includes(
        l.getAttribute('href') ?? '',
      ),
    );
    expect(navLinks).toHaveLength(4);
    expect(navLinks.map((l) => l.textContent?.trim())).toEqual([
      'Maps',
      'Timeline',
      'Houses',
      'Characters',
    ]);
  });

  it('marks the current section with aria-current="page"', () => {
    render(<SiteMenu />);
    fireEvent.click(screen.getByRole('button', { name: /open menu/i }));
    const housesLink = screen.getByRole('link', { name: /houses/i });
    expect(housesLink.getAttribute('aria-current')).toBe('page');

    const mapsLink = screen.getByRole('link', { name: /maps/i });
    expect(mapsLink.getAttribute('aria-current')).toBeNull();
  });

  it('flips the trigger to aria-expanded="true" while open', () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('closes when the Escape key is pressed', () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when a nav link is activated', () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole('link', { name: /maps/i }));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('closes when the close button is pressed', () => {
    render(<SiteMenu />);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole('button', { name: /close menu/i }));
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
