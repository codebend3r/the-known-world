import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteHeader } from '@/components/SiteHeader';

vi.mock('next/navigation', () => ({
  usePathname: () => '/houses/',
}));

describe('SiteHeader', () => {
  it('renders the wordmark "The Known World" linking to /', () => {
    render(<SiteHeader />);
    const home = screen.getByRole('link', { name: /the known world/i });
    expect(home.getAttribute('href')).toBe('/');
  });

  it('exposes a collapsed menu trigger', () => {
    render(<SiteHeader />);
    const trigger = screen.getByRole('button', { name: /open menu/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
