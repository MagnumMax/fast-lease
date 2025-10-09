export function formatCurrency(
  value: number | null | undefined,
  currency: string = "AED",
) {
  if (value == null) {
    return "—";
  }

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString("en-GB")} ${currency}`;
  }
}

export function formatDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
) {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

export function formatRelativeDays(value: string | null | undefined) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  const today = new Date();
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "сегодня";
  if (diffDays === 1) return "завтра";
  if (diffDays > 1) return `через ${diffDays} дн.`;
  if (diffDays === -1) return "вчера";
  return `${Math.abs(diffDays)} дн. назад`;
}

export function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
