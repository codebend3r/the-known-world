import { describe, it, expect } from "bun:test";
import { SlugParamsSchema, slugFromParams } from "@/lib/route-params";

const NOT_FOUND = "NEXT_HTTP_ERROR_FALLBACK;404";

describe("SlugParamsSchema", () => {
  it.each(["winterfell", "aegon-ii-targaryen", "battle-of-the-trident", "300"])(
    "accepts the kebab-case slug %p",
    (slug) => {
      expect(SlugParamsSchema.parse({ slug })).toEqual({ slug });
    },
  );

  it.each([
    "",
    "../secrets",
    "houses/stark",
    "Winterfell",
    "jon snow",
    "-stark",
    "stark-",
    "stark--bolton",
    "%2e%2e",
  ])("rejects %p", (slug) => {
    expect(SlugParamsSchema.safeParse({ slug }).success).toBe(false);
  });

  it("rejects params with no slug", () => {
    expect(SlugParamsSchema.safeParse({}).success).toBe(false);
    expect(SlugParamsSchema.safeParse(null).success).toBe(false);
  });
});

describe("slugFromParams", () => {
  it("resolves the validated slug", async () => {
    await expect(
      slugFromParams(Promise.resolve({ slug: "jon-snow" })),
    ).resolves.toBe("jon-snow");
  });

  it("throws Next's not-found error for an invalid slug", async () => {
    await expect(
      slugFromParams(Promise.resolve({ slug: "../../package" })),
    ).rejects.toThrow(NOT_FOUND);
  });

  it("throws Next's not-found error when the slug is missing", async () => {
    await expect(slugFromParams(Promise.resolve({}))).rejects.toThrow(
      NOT_FOUND,
    );
  });
});
