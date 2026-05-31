type ClassValue = string | number | false | null | undefined;

export function cx(...values: ClassValue[]): string {
  let result = "";
  for (const value of values) {
    if (!value) continue;
    result = result ? `${result} ${value}` : String(value);
  }
  return result;
}
