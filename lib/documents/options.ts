export function sortDocumentOptions<T extends { label: string; value: string }>(
  options: readonly T[],
  otherValue: string = "other",
  locale: string = "ru",
): T[] {
  return [...options].sort((a, b) => {
    const aIsOther = a.value === otherValue;
    const bIsOther = b.value === otherValue;
    if (aIsOther && !bIsOther) return 1;
    if (!aIsOther && bIsOther) return -1;
    return a.label.localeCompare(b.label, locale, { sensitivity: "base" });
  });
}
