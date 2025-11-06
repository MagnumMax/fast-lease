export type EmiratesCode = "dubai" | "abu_dhabi";

export type LicensePlateInfo = {
  normalized: string | null;
  emirate: EmiratesCode | null;
  code: string | null;
  number: string | null;
  display: string | null;
  original: string | null;
};

const EMIRATE_LABEL: Record<EmiratesCode, string> = {
  dubai: "Dubai",
  abu_dhabi: "Abu Dhabi",
};

const REMOVE_WORDS_REGEX = /\b(DUBAI|ABU\s*DHABI|PRIVATE|PLATE|LICENSE|VEHICLE|CAR|NUMBER|NO|TBA)\b/g;
const NON_ALPHANUMERIC_REGEX = /[^A-Z0-9]/g;
const MULTIPLE_SPACES_REGEX = /\s+/g;
const ARABIC_DIGITS_REGEX = /[\u0660-\u0669]/g;

const ARABIC_DIGIT_MAP: Record<string, string> = {
  "\u0660": "0",
  "\u0661": "1",
  "\u0662": "2",
  "\u0663": "3",
  "\u0664": "4",
  "\u0665": "5",
  "\u0666": "6",
  "\u0667": "7",
  "\u0668": "8",
  "\u0669": "9",
};

function replaceArabicDigits(value: string): string {
  return value.replace(ARABIC_DIGITS_REGEX, (digit) => ARABIC_DIGIT_MAP[digit] ?? digit);
}

function normalizeWhitespace(value: string): string {
  return value.replace(MULTIPLE_SPACES_REGEX, " ").trim();
}

function sanitizePlate(value: string): { cleaned: string; emirateHint: EmiratesCode | null } {
  const upper = replaceArabicDigits(value.toUpperCase());

  let emirateHint: EmiratesCode | null = null;
  if (upper.includes("ABU")) {
    emirateHint = "abu_dhabi";
  } else if (upper.includes("DUBAI")) {
    emirateHint = "dubai";
  }

  const withoutWords = upper.replace(REMOVE_WORDS_REGEX, " ");
  const alphanumericOnly = withoutWords.replace(NON_ALPHANUMERIC_REGEX, " ");
  const cleaned = normalizeWhitespace(alphanumericOnly);

  return { cleaned, emirateHint };
}

function buildInfo({
  normalized,
  emirate,
  code,
  number,
  original,
}: {
  normalized: string | null;
  emirate: EmiratesCode | null;
  code: string | null;
  number: string | null;
  original: string | null;
}): LicensePlateInfo {
  const emirateLabel = emirate ? EMIRATE_LABEL[emirate] : null;
  const display =
    normalized && emirateLabel ? `${emirateLabel} • ${normalized}` : normalized ?? original;

  return {
    normalized,
    emirate,
    code,
    number,
    display: display ?? null,
    original: original ?? null,
  };
}

export function normalizeLicensePlate(value: string | null | undefined): LicensePlateInfo {
  const original = typeof value === "string" ? value.trim() : "";

  if (!original) {
    return buildInfo({ normalized: null, emirate: null, code: null, number: null, original: null });
  }

  const { cleaned, emirateHint } = sanitizePlate(original);

  if (!cleaned) {
    return buildInfo({
      normalized: null,
      emirate: emirateHint,
      code: null,
      number: null,
      original,
    });
  }

  const candidates = [
    cleaned,
    ...(/^\d{1,6}[A-Z]{1,3}$/.test(cleaned)
      ? [cleaned.replace(/^(\d{1,6})([A-Z]{1,3})$/, "$2 $1")]
      : []),
    ...(/^[A-Z]{1,3}\d{1,6}$/.test(cleaned)
      ? [cleaned.replace(/^([A-Z]{1,3})(\d{1,6})$/, "$1 $2")]
      : []),
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeWhitespace(candidate);
    const parts = normalizedCandidate.split(" ");

    if (parts.length !== 2) {
      continue;
    }

    const [first, second] = parts;
    const firstIsDigits = /^\d+$/.test(first);
    const secondIsDigits = /^\d+$/.test(second);
    const firstIsLetters = /^[A-Z]+$/.test(first);
    const secondIsLetters = /^[A-Z]+$/.test(second);

    if (firstIsLetters && secondIsDigits) {
      return buildInfo({
        normalized: `${first} ${second}`,
        emirate: "dubai",
        code: first,
        number: second,
        original,
      });
    }

    if (firstIsDigits && secondIsLetters) {
      return buildInfo({
        normalized: `${second} ${first}`,
        emirate: "dubai",
        code: second,
        number: first,
        original,
      });
    }

    if (firstIsDigits && secondIsDigits) {
      return buildInfo({
        normalized: `${first} ${second}`,
        emirate: emirateHint ?? "abu_dhabi",
        code: first,
        number: second,
        original,
      });
    }
  }

  return buildInfo({
    normalized: cleaned,
    emirate: emirateHint,
    code: null,
    number: null,
    original,
  });
}

export function formatLicensePlateDisplay(value: string | null | undefined): string | null {
  const info = normalizeLicensePlate(value);
  return info.display;
}
