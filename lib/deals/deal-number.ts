const DEAL_NUMBER_PREFIX = "LTR";

export { DEAL_NUMBER_PREFIX };

export function formatDealNumberDatePart(date: Date): string {
  const isoDate = date.toISOString().slice(0, 10);
  const [year, month, day] = isoDate.split("-");
  return `${day}${month}${year.slice(-2)}`;
}

export function formatVinSegment(vin?: string | null): string {
  if (!vin) {
    return "0000";
  }

  const normalized = vin.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const lastFour = normalized.slice(-4);
  return lastFour.padStart(4, "0");
}

function deriveVinFromId(id?: string | null): string | null {
  if (!id) {
    return null;
  }

  const normalized = id.replace(/[^a-fA-F0-9]/g, "");
  if (!normalized) {
    return null;
  }

  const hexTail = normalized.slice(-4);
  const decimal = Number.parseInt(hexTail, 16);
  if (Number.isNaN(decimal)) {
    return hexTail.padStart(4, "0").slice(-4);
  }

  const decimalString = decimal.toString();
  return decimalString.slice(-4).padStart(4, "0");
}

export function buildDealNumberCandidate(
  date: Date,
  vin: string | null,
  attempt = 1,
): string {
  const datePart = formatDealNumberDatePart(date);
  const vinPart = formatVinSegment(vin);
  const suffix = attempt <= 1 ? "" : `-${attempt.toString().padStart(2, "0")}`;
  return `${DEAL_NUMBER_PREFIX}-${datePart}-${vinPart}${suffix}`;
}

export function formatFallbackDealNumber(options?: {
  createdAt?: string | Date | null;
  vin?: string | null;
  id?: string | null;
}): string {
  const createdAtInput = options?.createdAt
    ? options.createdAt instanceof Date
      ? options.createdAt
      : new Date(options.createdAt)
    : new Date();
  const vinCandidate = options?.vin ?? deriveVinFromId(options?.id ?? null);
  return buildDealNumberCandidate(createdAtInput, vinCandidate ?? null);
}
