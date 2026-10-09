/**
 * Pins a literal list to every member of the union `T`: a typo or a missing
 * member fails to compile, and the error names the member left out.
 *
 * Client components import some of these lists, so they can't be read off a
 * schema's `.options` without pulling `zod` into the browser bundle. This keeps
 * the copy zod-free while the compiler holds it to the schema-inferred union.
 */
export function exhaustiveList<T extends string>() {
  return <const L extends readonly T[]>(
    list: L &
      ([Exclude<T, L[number]>] extends [never]
        ? unknown
        : { missing: Exclude<T, L[number]> }),
  ): L => list;
}
