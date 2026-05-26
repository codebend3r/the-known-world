import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainMenuTile } from './MainMenuTile';

describe('MainMenuTile', () => {
  it('renders title, subtitle, and glyph inside one link', () => {
    render(
      <MainMenuTile
        title="Map"
        subtitle="Survey the realm."
        glyph={<svg data-testid="glyph" />}
        href="/map/"
      />
    );

    const link = screen.getByRole('link', { name: /map/i });
    expect(link.getAttribute('href')).toBe('/map/');
    expect(link.textContent).toContain('Map');
    expect(link.textContent).toContain('Survey the realm.');
    expect(screen.getByTestId('glyph')).toBeDefined();
  });

  it('shows a "Coming soon" pill only when status is coming-soon', () => {
    const { rerender } = render(
      <MainMenuTile
        title="Map"
        subtitle="Survey the realm."
        glyph={null}
        href="/map/"
      />
    );
    expect(screen.queryByText(/coming soon/i)).toBeNull();

    rerender(
      <MainMenuTile
        title="Map"
        subtitle="Survey the realm."
        glyph={null}
        href="/map/"
        status="coming-soon"
      />
    );
    expect(screen.getByText(/coming soon/i)).toBeDefined();
  });
});
