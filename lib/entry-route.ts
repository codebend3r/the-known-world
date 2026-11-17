import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  slugFromParams,
  type SlugPageProps,
  type SlugParams,
} from "@/lib/route-params";

type Listable = { frontmatter: { slug: string; draft: boolean } };

type LoadBySlug<T> = (slug: string) => Promise<T>;

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

// Only a missing file means "no such entry"; a schema or YAML failure is a
// content bug and must fail the build rather than quietly 404.
async function loadEntryOrNull<T>({
  load,
  slug,
}: {
  load: LoadBySlug<T>;
  slug: string;
}): Promise<T | null> {
  try {
    return await load(slug);
  } catch (error) {
    if (isMissingFile(error)) return null;
    throw error;
  }
}

export async function publishedSlugParams<T extends Listable>({
  loadAll,
  isListed = (entry) => !entry.frontmatter.draft,
}: {
  loadAll: () => Promise<ReadonlyArray<T>>;
  isListed?: (entry: T) => boolean;
}): Promise<SlugParams[]> {
  const entries = await loadAll();
  return entries
    .filter(isListed)
    .map((entry) => ({ slug: entry.frontmatter.slug }));
}

export async function loadEntryOr404<T>({
  load,
  slug,
}: {
  load: LoadBySlug<T>;
  slug: string;
}): Promise<T> {
  const entry = await loadEntryOrNull({ load, slug });
  if (entry === null) notFound();
  return entry;
}

export async function entryMetadata<T>({
  params,
  load,
  metadata,
}: {
  params: SlugPageProps["params"];
  load: LoadBySlug<T>;
  metadata: (entry: T) => Metadata | Promise<Metadata>;
}): Promise<Metadata> {
  const slug = await slugFromParams(params);
  const entry = await loadEntryOrNull({ load, slug });
  if (entry === null) return { title: "Not found" };
  return metadata(entry);
}
