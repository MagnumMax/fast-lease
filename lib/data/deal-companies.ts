export const DEAL_COMPANY_CODES = ["FLS", "SND", "ENT"] as const;

export type DealCompanyCode = (typeof DEAL_COMPANY_CODES)[number];

export type DealCompany = {
  code: DealCompanyCode;
  name: string;
  prefix: string;
};

export const DEAL_COMPANIES: DealCompany[] = [
  { code: "FLS", name: "FastLease", prefix: "FLS" },
  { code: "SND", name: "Sunday", prefix: "SND" },
  { code: "ENT", name: "Entire", prefix: "ENT" },
];

export const DEFAULT_DEAL_COMPANY_CODE: DealCompanyCode = "FLS";

const dealCompanyMap = new Map<DealCompanyCode, DealCompany>(
  DEAL_COMPANIES.map((company) => [company.code, company]),
);

export const DEAL_COMPANY_SELECT_OPTIONS = DEAL_COMPANIES.map((company) => ({
  value: company.code,
  label: `${company.name} (${company.prefix})`,
}));

export function isDealCompanyCode(value: unknown): value is DealCompanyCode {
  if (typeof value !== "string") {
    return false;
  }
  return DEAL_COMPANY_CODES.includes(value.toUpperCase() as DealCompanyCode);
}

export function toDealCompanyCode(value?: string | null): DealCompanyCode | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return isDealCompanyCode(normalized) ? (normalized as DealCompanyCode) : null;
}

export function resolveDealCompanyCode(value?: string | null): DealCompanyCode {
  return toDealCompanyCode(value) ?? DEFAULT_DEAL_COMPANY_CODE;
}

export function getDealCompany(code?: string | null): DealCompany {
  const normalized = resolveDealCompanyCode(code);
  return dealCompanyMap.get(normalized) ?? dealCompanyMap.get(DEFAULT_DEAL_COMPANY_CODE)!;
}

export function getDealCompanyPrefix(code?: string | null): string {
  return getDealCompany(code).prefix;
}

export function getDealCompanyName(code?: string | null): string {
  return getDealCompany(code).name;
}
