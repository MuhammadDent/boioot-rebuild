type Primitive = string | number | boolean | null | undefined;
type Params = Record<string, Primitive | Primitive[]>;

/**
 * Builds a URL query string from a params object.
 * Skips null, undefined, and empty string values.
 * Supports arrays: { tags: ["a","b"] } → "tags=a&tags=b"
 *
 * @example
 * buildQueryString({ page: 1, city: "دمشق", type: undefined })
 * → "page=1&city=%D8%AF%D9%85%D8%B4%D9%82"
 */
export function buildQueryString(params: Params): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined && item !== "") {
          query.append(key, String(item));
        }
      }
    } else {
      query.set(key, String(value));
    }
  }

  const qs = query.toString();
  return qs ? `?${qs}` : "";
}
