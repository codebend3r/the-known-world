export function titleCase(text: string): string {
  return text
    .split(" ")
    .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

export function humanizeSlug(slug: string): string {
  return titleCase(slug.replace(/-/g, " "));
}

export function shortHouseName(fullName: string): string {
  return fullName.replace(/^House\s+/i, "");
}

export function houseLabel({
  slug,
  housesBySlug,
}: {
  slug: string;
  housesBySlug: Map<string, { name: string }>;
}): string {
  return housesBySlug.get(slug)?.name ?? `House ${humanizeSlug(slug)}`;
}
