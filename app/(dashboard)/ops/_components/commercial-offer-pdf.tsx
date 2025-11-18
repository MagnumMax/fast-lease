"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  Document,
  Page,
  Image,
  Font,
  StyleSheet,
  Text,
  View,
  Link,
  pdf,
} from "@react-pdf/renderer/lib/react-pdf.browser.js";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";

export type CommercialOfferData = {
  dealNumber?: string | null;
  clientName?: string | null;
  vehicleName?: string | null;
  vehicleVin?: string | null;
  priceVat?: string | null;
  termMonths?: string | null;
  downPayment?: string | null;
  interestRateAnnual?: string | null;
  insuranceRateAnnual?: string | null;
  comment?: string | null;
  preparedBy?: string | null;
  preparedByPhone?: string | null;
  preparedByEmail?: string | null;
  preparedAt?: string | null;
  companyName?: string | null;
  loginUrl?: string | null;
  qrSrc?: string | null;
};

// Register Cyrillic-friendly font once (local assets to avoid remote/CORS failures)
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  // Geist Sans is visually close to Inter; we keep Inter as a local, reliable fallback.
  const interSrc = "/fonts/InterVariable.ttf";
  Font.register({
    family: "Geist",
    fonts: [
      { src: interSrc, fontStyle: "normal", fontWeight: 400 },
      { src: interSrc, fontStyle: "normal", fontWeight: 500 },
      { src: interSrc, fontStyle: "normal", fontWeight: 600 },
      { src: interSrc, fontStyle: "normal", fontWeight: 700 },
    ],
  });
  fontsRegistered = true;
}

function normalizeMoney(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!digits) return null;
  const parsed = Number(digits);
  if (Number.isNaN(parsed)) return value.trim();
  return `AED ${parsed.toLocaleString("en-US")}`;
}

function normalizePercent(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number(digits);
  if (Number.isNaN(parsed)) return value.trim();
  return `${parsed}% годовых`;
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyAED(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) return null;
  return `AED ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function calculateMonthlyPayment(data: CommercialOfferData): string | null {
  const price = parseNumber(data.priceVat);
  const downPayment = parseNumber(data.downPayment) ?? 0;
  const termMonths = parseNumber(data.termMonths);
  const rateAnnual = parseNumber(data.interestRateAnnual);

  if (price === null || termMonths === null || termMonths <= 0) return null;
  const principal = Math.max(0, price - downPayment);
  const annualRate = rateAnnual ?? 0;
  // Равные платежи по простой (не аннуитетной) схеме: фиксированная доля тела + равномерно распределённые проценты.
  const totalInterest = principal * (annualRate / 100) * (termMonths / 12);
  const payment = (principal + totalInterest) / termMonths;

  if (!Number.isFinite(payment)) return null;
  return formatCurrencyAED(payment);
}

function resolveLoginUrl(explicit?: string | null): string {
  if (explicit && explicit.trim().length > 0) return explicit.trim();
  if (typeof window !== "undefined") {
    try {
      return new URL("/login", window.location.origin).toString();
    } catch {
      /* ignore */
    }
  }
  return "https://fastlease.app/login";
}

function formatPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getInitials(name?: string | null): string {
  if (!name) return "??";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] || "") + (parts[1][0] || "");
}

const geist = {
  background: "#ffffff",
  backgroundAlt: "#f7f7f7",
  stroke: "#eaeaea",
  strokeStrong: "#d4d4d4",
  textPrimary: "#111111",
  textSecondary: "#666666",
  accent: "#0f172a",
  link: "#0070f3",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    lineHeight: 1.35,
    color: geist.textPrimary,
    fontFamily: "Geist",
    backgroundColor: geist.background,
  },
  hero: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 12,
    border: `1 solid ${geist.stroke}`,
    backgroundColor: geist.backgroundAlt,
    marginBottom: 16,
    gap: 12,
  },
  heroCompany: {
    fontSize: 12,
    fontWeight: 700,
    color: geist.textPrimary,
    marginTop: 2,
  },
  kicker: {
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: geist.textSecondary,
  },
  headline: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: -0.2,
    color: geist.textPrimary,
    marginTop: 6,
  },
  metaLine: {
    marginTop: 4,
    fontSize: 9,
    color: geist.textSecondary,
  },
  heroAside: {
    minWidth: 170,
    padding: 12,
    borderRadius: 10,
    border: `1 solid ${geist.strokeStrong}`,
    backgroundColor: geist.background,
    gap: 6,
  },
  heroLabel: {
    fontSize: 9,
    color: geist.textSecondary,
    letterSpacing: 0.2,
  },
  heroValue: {
    fontSize: 16,
    fontWeight: 700,
    color: geist.accent,
  },
  card: {
    padding: 14,
    borderRadius: 10,
    border: `1 solid ${geist.stroke}`,
    backgroundColor: geist.background,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    color: geist.textPrimary,
  },
  gridTwo: {
    flexDirection: "row",
    gap: 10,
  },
  column: {
    flex: 1,
    gap: 8,
  },
  infoList: {
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingBottom: 2,
  },
  infoRowTight: {
    paddingBottom: 4,
  },
  infoRowLast: {
    borderBottom: "0 solid transparent",
  },
  infoLabel: {
    fontSize: 9,
    color: geist.textSecondary,
    letterSpacing: 0.2,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 700,
    color: geist.textPrimary,
  },
  mutedValue: {
    color: geist.textSecondary,
    fontWeight: 500,
  },
  highlightValue: {
    color: geist.link,
  },
  link: {
    color: geist.link,
    textDecoration: "underline",
    textDecorationColor: geist.link,
    fontWeight: 600,
  },
  commentBox: {
    backgroundColor: geist.backgroundAlt,
    border: `1 solid ${geist.stroke}`,
    borderRadius: 10,
    padding: 12,
    color: geist.textPrimary,
    minHeight: 82,
  },
  qrStrip: {
    border: `1 solid ${geist.stroke}`,
    borderRadius: 12,
    padding: 12,
    backgroundColor: geist.backgroundAlt,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    gap: 12,
  },
  signatureLine: {
    borderBottom: `1 solid ${geist.stroke}`,
    minWidth: 170,
    paddingBottom: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    border: `1 solid ${geist.stroke}`,
    backgroundColor: geist.background,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 700,
    color: geist.textPrimary,
  },
  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTop: `1 solid ${geist.stroke}`,
    color: geist.textSecondary,
    fontSize: 10,
  },
});

function CommercialOfferDocument({ data }: { data: CommercialOfferData }) {
  ensureFonts();

  const loginUrl = data.loginUrl ?? resolveLoginUrl(null);
  const preparedAtDisplay = data.preparedAt
    ? new Date(data.preparedAt).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <Document title={`Коммерческое предложение ${data.dealNumber ?? ""}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.hero}>
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            <View>
              <Text style={styles.kicker}>Коммерческое предложение</Text>
              <Text style={styles.heroCompany}>{data.companyName ?? "Fast Lease"}</Text>
              <Text style={styles.headline}>{data.vehicleName ?? "Лизинг автомобиля"}</Text>
            </View>
            <View style={{ gap: 2, marginTop: 8 }}>
              {data.clientName ? (
                <Text style={styles.metaLine}>Клиент {data.clientName}</Text>
              ) : null}
              {data.dealNumber ? <Text style={styles.metaLine}>Сделка {data.dealNumber}</Text> : null}
            </View>
          </View>
          <View style={styles.heroAside}>
            <View style={{ gap: 2 }}>
              <Text style={styles.heroLabel}>Ежемесячный платёж</Text>
              <Text style={styles.heroValue}>{calculateMonthlyPayment(data) ?? "—"}</Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <Text style={styles.heroLabel}>Срок · Аванс</Text>
              <Text style={styles.infoValue}>
                {data.termMonths ? `${data.termMonths} мес.` : "—"} · {normalizeMoney(data.downPayment) ?? "—"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.gridTwo}>
          <View style={[styles.card, styles.column]}>
            <Text style={styles.sectionTitle}>Автомобиль</Text>
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Модель</Text>
                <Text style={styles.infoValue}>{data.vehicleName ?? "—"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>VIN</Text>
                <Text style={styles.infoValue}>{data.vehicleVin ?? "—"}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.column]}>
            <Text style={styles.sectionTitle}>Финансы</Text>
            <View style={styles.infoList}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Цена с VAT</Text>
                <Text style={styles.infoValue}>{normalizeMoney(data.priceVat) ?? "—"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Аванс</Text>
                <Text style={styles.infoValue}>{normalizeMoney(data.downPayment) ?? "—"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Ставка финансирования</Text>
                <Text style={styles.infoValue}>{normalizePercent(data.interestRateAnnual) ?? "—"}</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowLast]}>
                <Text style={styles.infoLabel}>Ставка страховки</Text>
                <Text style={styles.infoValue}>{normalizePercent(data.insuranceRateAnnual) ?? "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.gridTwo}>
          <View style={[styles.card, styles.column]}>
            <Text style={styles.sectionTitle}>Комментарий</Text>
            <View style={styles.commentBox}>
              <Text>{data.comment?.trim().length ? data.comment : "—"}</Text>
            </View>
          </View>
          <View style={[styles.card, styles.column]}>
            <Text style={styles.sectionTitle}>Контакты</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(data.preparedBy ?? null)}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 12, fontWeight: 700, color: geist.textPrimary }}>
                  {data.preparedBy ?? "—"}
                </Text>
                <Text style={{ fontSize: 10, color: geist.textSecondary }}>
                  {formatPhone(data.preparedByPhone) ?? "—"}
                </Text>
                <Text style={{ fontSize: 10, color: geist.textSecondary }}>
                  {data.preparedByEmail ?? "Email не указан"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.qrStrip}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {data.qrSrc ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image
                src={data.qrSrc}
                style={{ width: 64, height: 64, border: `1 solid ${geist.stroke}`, borderRadius: 8 }}
              />
            ) : (
              <View
                style={{
                  width: 64,
                  height: 64,
                  border: `1 solid ${geist.stroke}`,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 9, color: geist.textSecondary }}>QR</Text>
              </View>
            )}
            <View>
              <Text style={{ fontSize: 10, fontWeight: 700, color: geist.textPrimary }}>
                Вход в личный кабинет
              </Text>
              <Text style={{ fontSize: 9, color: geist.textSecondary, maxWidth: 210 }}>
                Scan QR or open the{" "}
                <Link src={loginUrl} style={styles.link}>
                  link
                </Link>
                .
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
            <View style={styles.signatureLine}>
              <Text style={{ fontSize: 9, color: geist.textSecondary, textAlign: "right" }}>
                Подпись клиента
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Документ создан автоматически в системе Fast Lease.</Text>
          <Text style={{ marginTop: 2 }}>Подготовлено: {preparedAtDisplay}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function CommercialOfferDownloadButton({
  data,
  label = "Скачать КП (PDF)",
  iconOnly = false,
  ariaLabel,
  onGenerate,
}: {
  data: CommercialOfferData | null;
  label?: string;
  iconOnly?: boolean;
  ariaLabel?: string;
  onGenerate?: () => Promise<void> | void;
}) {
  const fileName = useMemo(() => {
    if (!data?.dealNumber || !data.dealNumber.trim()) {
      return "commercial-offer.pdf";
    }
    const normalized = data.dealNumber
      .trim()
      .replace(/[\s]+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    return (normalized.length ? normalized : "commercial-offer") + ".pdf";
  }, [data?.dealNumber]);

  const loginUrl = useMemo(() => resolveLoginUrl(data?.loginUrl ?? null), [data?.loginUrl]);
  const [qrSrc, setQrSrc] = useState<string | null>(data?.qrSrc ?? null);

  useEffect(() => {
    let canceled = false;
    async function generate() {
      try {
        const src = await QRCode.toDataURL(loginUrl, { margin: 1, scale: 4 });
        if (!canceled) setQrSrc(src);
      } catch (err) {
        console.warn("Failed to generate QR", err);
        if (!canceled) setQrSrc(null);
      }
    }
    generate();
    return () => {
      canceled = true;
    };
  }, [loginUrl]);

  const docNode = useMemo(() => {
    if (!data) return null;
    return <CommercialOfferDocument data={{ ...data, loginUrl, qrSrc }} />;
  }, [data, loginUrl, qrSrc]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (onGenerate) {
      try {
        await onGenerate();
      } catch (err) {
        console.warn("commercial-offer-pdf: pre-generate hook failed", err);
      }
    }

    if (!docNode) return;
    setLoading(true);
    setError(null);
    try {
      const instance = pdf(docNode);
      const blob = await instance.toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("commercial-offer-pdf: failed to generate PDF", err);
      setError("Не удалось сформировать PDF. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = !docNode || loading;
  const iconClass = iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4";
  const resolvedAria = ariaLabel ?? label ?? "Скачать КП (PDF)";
  const showLabel = !iconOnly && Boolean(label);

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={`rounded-lg ${iconOnly ? "px-2" : ""}`}
        disabled={isDisabled}
        aria-label={resolvedAria}
        onClick={handleDownload}
      >
        <>
          <Download className={iconClass} />
          {showLabel ? (loading ? "Генерируем..." : label) : null}
        </>
      </Button>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );

}
