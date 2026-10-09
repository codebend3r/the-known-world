export type NavItem = {
  href: string;
  label: string;
  isVisible: boolean;
};

// The primary nav in route order. Shared by the header rail (`SiteHeader`) and
// the drawer (`SiteMenu`) so the two never drift; icons stay with the drawer,
// which is the only consumer that draws them.
export const NAV_ITEMS: NavItem[] = [
  { href: "/maps/", label: "Maps", isVisible: true },
  { href: "/timeline/", label: "Timeline", isVisible: true },
  { href: "/houses/", label: "Houses", isVisible: true },
  { href: "/castles/", label: "Castles", isVisible: true },
  { href: "/characters/", label: "Characters", isVisible: true },
  { href: "/weapons/", label: "Weapons", isVisible: true },
  { href: "/battles/", label: "Battles", isVisible: true },
  { href: "/dragons/", label: "Dragons", isVisible: false },
  { href: "/events/", label: "Events", isVisible: true },
];

export function visibleNavItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => item.isVisible);
}

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
