import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteFooter } from './SiteFooter';

describe('SiteFooter', () => {
  it('credits CJ Rivas', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/CJ Rivas/)).toBeTruthy();
  });

  it('links to the GitHub profile in a new tab', () => {
    render(<SiteFooter />);
    const link = screen.getByRole('link', { name: /github/i });
    expect(link.getAttribute('href')).toBe('https://github.com/codebend3r');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
