export type NavItem = {
  href: string;
  label: string;
  visible: boolean;
};

// The primary nav in route order. Shared by the header rail (`SiteHeader`) and
// the drawer (`SiteMenu`) so the two never drift; icons stay with the drawer,
// which is the only consumer that draws them.
export const NAV_ITEMS: NavItem[] = [
  { href: "/maps/", label: "Maps", visible: true },
  { href: "/timeline/", label: "Timeline", visible: true },
  { href: "/houses/", label: "Houses", visible: true },
  { href: "/castles/", label: "Castles", visible: true },
  { href: "/characters/", label: "Characters", visible: true },
  { href: "/weapons/", label: "Weapons", visible: true },
  { href: "/battles/", label: "Battles", visible: true },
  { href: "/dragons/", label: "Dragons", visible: false },
  { href: "/events/", label: "Events", visible: true },
];

export function visibleNavItems(): NavItem[] {
  return NAV_ITEMS.filter((item) => item.visible);
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
