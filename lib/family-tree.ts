import type { Loaded } from "@/lib/content";
import type { Character } from "@/lib/schemas";

export type TreeSpouse = {
  slug: string | null;
  name: string;
  alias: string | null;
  sex: Character["sex"];
  isPlaceholder: boolean;
  isInHouse: boolean;
  titles: string[];
};

export type TreeNode = {
  slug: string;
  name: string;
  alias: string | null;
  sex: Character["sex"];
  isPlaceholder: boolean;
  isExternal: boolean;
  born: number | null;
  died: number | null;
  titles: string[];
  spouses: TreeSpouse[];
  children: TreeNode[];
};

function birthYear(p: Character): number | null {
  return p.born ? p.born.year : null;
}

function deathYear(p: Character): number | null {
  return p.died ? p.died.year : null;
}

function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function compareRoots(a: Character, b: Character): number {
  if (a.placeholder !== b.placeholder) return a.placeholder ? 1 : -1;
  const ay = birthYear(a);
  const by = birthYear(b);
  if (ay !== null && by !== null) return ay - by;
  if (ay !== null) return -1;
  if (by !== null) return 1;
  return a.name.localeCompare(b.name);
}

export function buildFamilyTree({
  houseSlug,
  people,
}: {
  houseSlug: string;
  people: Array<Loaded<Character>>;
}): TreeNode[] {
  const peopleBySlug = new Map(
    people.map((p) => [p.frontmatter.slug, p.frontmatter]),
  );
  const housePeople = people
    .map((p) => p.frontmatter)
    .filter((p) => p["primary-house"] === houseSlug && !p["exclude-from-tree"]);
  const houseSlugs = new Set(housePeople.map((p) => p.slug));

  const roots = housePeople
    .filter((p) => p.parents.every((parent) => !houseSlugs.has(parent)))
    .sort(compareRoots);

  const visited = new Set<string>();

  const buildNode = (slug: string): TreeNode | null => {
    const person = peopleBySlug.get(slug);
    if (!person) return null;
    if (visited.has(slug)) return null;
    visited.add(slug);

    const isExternal = person["primary-house"] !== houseSlug;

    if (isExternal) {
      return {
        slug,
        name: person.name,
        alias: person.aliases[0] ?? null,
        sex: person.sex,
        isPlaceholder: person.placeholder,
        isExternal: true,
        born: birthYear(person),
        died: deathYear(person),
        titles: person.titles,
        spouses: [],
        children: [],
      };
    }

    const spouses: TreeSpouse[] = person.spouses.map((spouseSlug) => {
      const spouse = peopleBySlug.get(spouseSlug);
      const isInHouse = houseSlugs.has(spouseSlug);
      if (!spouse) {
        return {
          slug: spouseSlug,
          name: spouseSlug,
          alias: null,
          sex: null,
          isPlaceholder: true,
          isInHouse: false,
          titles: [],
        };
      }
      if (isInHouse && !visited.has(spouseSlug)) {
        visited.add(spouseSlug);
      }
      return {
        slug: spouseSlug,
        name: spouse.name,
        alias: spouse.aliases[0] ?? null,
        sex: spouse.sex,
        isPlaceholder: spouse.placeholder,
        isInHouse,
        titles: spouse.titles,
      };
    });

    const inHouseSpouseChildren = spouses
      .filter(
        (s): s is TreeSpouse & { slug: string } => s.isInHouse && !!s.slug,
      )
      .flatMap((s) => peopleBySlug.get(s.slug)?.children ?? []);
    const childSlugs = uniq([...person.children, ...inHouseSpouseChildren]);

    const children = childSlugs
      .map((c) => buildNode(c))
      .filter((c): c is TreeNode => c !== null);

    return {
      slug,
      name: person.name,
      alias: person.aliases[0] ?? null,
      sex: person.sex,
      isPlaceholder: person.placeholder,
      isExternal: false,
      born: birthYear(person),
      died: deathYear(person),
      titles: person.titles,
      spouses,
      children,
    };
  };

  return roots
    .map((root) => buildNode(root.slug))
    .filter((node): node is TreeNode => node !== null);
}
