const UUID_SUFFIX_REGEX =
  /([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export { UUID_SUFFIX_REGEX };

export function slugify(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildSlugWithId(
  source: string | null | undefined,
  id: string | null | undefined,
): string {
  const safeId = typeof id === "string" ? id.trim() : "";
  if (!safeId) {
    return "";
  }

  const base = slugify(source);
  return base ? `${base}-${safeId}` : safeId;
}

export function extractIdFromSlug(
  value: string | null | undefined,
): { id: string | null; slug: string } {
  const input = (value ?? "").trim();
  if (!input) {
    return { id: null, slug: "" };
  }

  const match = input.match(UUID_SUFFIX_REGEX);
  if (!match) {
    return { id: null, slug: input };
  }

  const id = match[1];
  const slugPart = input.slice(0, match.index ?? input.length).replace(/[-_]+$/, "");

  return { id, slug: slugPart };
}

export function stripIdFromSlug(value: string | null | undefined): string {
  return extractIdFromSlug(value).slug;
}

export function hasUuidSuffix(value: string | null | undefined): boolean {
  return extractIdFromSlug(value).id !== null;
}
