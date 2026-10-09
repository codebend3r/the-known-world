import { notFound } from "next/navigation";
import { z } from "zod";

// The slug becomes a filename under `content/`, so anything outside kebab-case
// (a `..` segment, a slash, an encoded character) is rejected before any read.
export const SlugParamsSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});

export type SlugParams = z.infer<typeof SlugParamsSchema>;

// `params` stays `unknown` until `slugFromParams` parses it: the URL is
// untrusted, and Next's generated `PageProps` only exists after `next typegen`,
// which the standalone `typecheck` script never runs.
export type SlugPageProps = { params: Promise<unknown> };

export async function slugFromParams(
  params: SlugPageProps["params"],
): Promise<SlugParams["slug"]> {
  const result = SlugParamsSchema.safeParse(await params);
  if (!result.success) notFound();
  return result.data.slug;
}
