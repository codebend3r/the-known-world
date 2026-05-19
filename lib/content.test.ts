import { describe, it, expect } from 'vitest';
import { loadCastle, loadAllCastles, renderMarkdown } from './content';

describe('loadCastle', () => {
  it('loads Winterfell', async () => {
    const result = await loadCastle('winterfell');
    expect(result.frontmatter.slug).toBe('winterfell');
    expect(result.frontmatter.name).toBe('Winterfell');
    expect(result.body).toContain('Ancient seat');
  });

  it('throws on missing castle', async () => {
    await expect(loadCastle('does-not-exist')).rejects.toThrow();
  });
});

describe('loadAllCastles', () => {
  it('returns Winterfell', async () => {
    const all = await loadAllCastles();
    const slugs = all.map((c) => c.frontmatter.slug);
    expect(slugs).toContain('winterfell');
  });
});

describe('renderMarkdown', () => {
  it('converts Markdown body to HTML', async () => {
    const html = await renderMarkdown('# Hello\n\nA **bold** word.');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });
});
