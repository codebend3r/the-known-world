type Load<T> = () => Promise<T>;
type LoadBySlug<T> = (slug: string) => Promise<T>;

// Both helpers cache the promise rather than the resolved value, so callers
// that arrive while a load is still in flight share it instead of racing a
// duplicate read.

export function memoize<T>({
  load,
  enabled,
}: {
  load: Load<T>;
  enabled: boolean;
}): Load<T> {
  let cached: Promise<T> | undefined;
  return () => {
    if (!enabled) return load();
    cached ??= load();
    return cached;
  };
}

export function memoizeBySlug<T>({
  load,
  enabled,
}: {
  load: LoadBySlug<T>;
  enabled: boolean;
}): LoadBySlug<T> {
  const cache = new Map<string, Promise<T>>();
  return (slug) => {
    if (!enabled) return load(slug);
    const cached = cache.get(slug);
    if (cached) return cached;
    const pending = load(slug);
    cache.set(slug, pending);
    return pending;
  };
}
