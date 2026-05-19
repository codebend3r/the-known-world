import { describe, it, expect } from 'vitest';
import { loadCastle, loadAllCastles, renderMarkdown } from './content';

describe('loadCastle', () => {
  it('loads the sample castle fixture', async () => {
    const result = await loadCastle('_sample-for-test');
    expect(result.frontmatter.slug).toBe('sample-castle');
    expect(result.frontmatter.name).toBe('Sample Castle');
    expect(result.body).toContain('Sample Castle');
    expect(result.body).toContain('**body**');
  });

  it('throws on missing castle', async () => {
    await expect(loadCastle('does-not-exist')).rejects.toThrow();
  });
});

describe('loadAllCastles', () => {
  it('returns at least the sample fixture', async () => {
    const all = await loadAllCastles();
    const slugs = all.map((c) => c.frontmatter.slug);
    expect(slugs).toContain('sample-castle');
  });
});

describe('renderMarkdown', () => {
  it('converts Markdown body to HTML', async () => {
    const html = await renderMarkdown('# Hello\n\nA **bold** word.');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });
});
