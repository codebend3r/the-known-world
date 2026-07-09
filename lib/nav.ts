export function isActive({
  pathname,
  href,
}: {
  pathname: string | null;
  href: string;
}): boolean {
  if (!pathname) return false;
  const normalised = pathname.endsWith("/") ? pathname : `${pathname}/`;
  return normalised === href || normalised.startsWith(href);
}
