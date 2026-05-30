import { describe, expect, it } from 'vitest';
import { cx } from '@/lib/cx';

describe('cx', () => {
  it('joins truthy class strings with a single space', () => {
    expect(cx('a', 'b', 'c')).toBe('a b c');
  });

  it('drops falsy values without leaving stray spaces', () => {
    expect(cx('a', false, 'b', null, undefined, '', 'c')).toBe('a b c');
  });

  it('returns an empty string when every value is falsy', () => {
    expect(cx(false, null, undefined, '')).toBe('');
  });

  it('coerces numbers to strings', () => {
    expect(cx('a', 1, 'b')).toBe('a 1 b');
  });

  it('treats 0 as falsy and skips it', () => {
    expect(cx('a', 0, 'b')).toBe('a b');
  });

  it('supports conditional class composition with short-circuit', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cx('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });
});
