type ClassValue = string | number | false | null | undefined;

export function cx(...values: ClassValue[]): string {
  return values.filter((value) => !!value).join(" ");
}
