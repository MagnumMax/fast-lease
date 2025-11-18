"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer/lib/react-pdf.browser.js";
import QRCode from "qrcode";

import type { CommercialOfferData } from "./commercial-offer-pdf";
import { Button } from "@/components/ui/button";


const RENTY_LOGO_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH4AAAAcCAYAAACnHwvZAAAABmJLR0QA/wD/AP+gvaeTAAAGyUlEQVRo3u1aeWyURRRvuZFCOQUPVEQEqVWhgmy7hSpYDgNRlEMMgcRECAGiAdRANCqakHCkBhGxkhgTo1ALnigRqW13N1YRgopQPEDO0u63LeXQtsD6e+xsnM6++a6lKmUn+f3R7715X3d+M++aLykpMa7MEbY3zgKHAD/wAjAosXJXBvHcKAEGXEa/8xXgSxkJ4t2PWsB7mfzOz9R/PkF8fKMS6Jkg/vInfiej0wJIA1YB9cyclRbv6AIMA6YAE4DBQDuLOdcBN0voKcnaAFnANGA6MBK4Kh7i8Wcr5X2EXjbWrz0zr63d9c8uqbrGWxocleUzpnhLQ094faFp3tKqjIwd4dZOuYSNNNgYT3Yy/cbDnkBw6KSN4ZauiVf0ZzBzKoBkRjcX2KzZLNVAPpCueU+Zol8A9ADygJOMvVPAMiJCstEf2CFQw8zZoeA3xpu1tViPpczv6mA2Z3hxZT8QswJEHQTCGpyAztKcosoUM1tjt4TbZvlCi6C/V2PnmLfUWAk7veIlPhk4wMy7XjkF79oMFQ3AAhvEfw8ctGGPCEwRNgY5DFsLmGdTTdaiNXBU0V9ufipDs0FGvQnhKn73BCpv4W1V9Yd8l007IU9JcKRr4sWc7cy8dMllfu4iV5hvQbyTsd4l8Z2F52hUvZisw6OK7nly9RbueJgD0qPYk7Yn3Ea2Q5shyxesdGjnLLn/eIjfzcy7ScgWMTI6qbOAu0WsJx1D0fkL6GeT+J+BjaIsq2Pk54C+Tl29eO8aRu8OzTr4FL2P7cXi0EeCiNPAJsT1ZyNxOfQ0ZNt50kKzpRcn41lA1cksNbYhPDxCOUKmP3gfsAbPGxS9vTlF4VZuXP1Q4IIyxxAhgJKu44qsHEhl7NwgcgN5vGVB/BlgomJnIPNOGgvdZPV4fKs4ufJYy+jdybwz1w7xnkAoHQS8dM83RidODsLmx5DqD34tufgJzOZ4g08egw9CdqGxrdBU28QLYscBR5g5rwudSYxsvMkmelzRpVPZ2oT4hRo7cxjdd9yWcxB9wSSOqYrOm4rOfqp+LlGplYyTu18htlYKFxsU2WlP4HB7nTkQvVkhfnOSJtveKKEQ2AYc1rhdyrB7m7jJV0W2zWGdSa5QxsTPLialnzoK4iB+HGNvriSnXOC0Ip/nlN/hxUZvEDGZXDxc/TMy8HyfQu45ififFNkheIRlOkD+laJ/JN4Gzp/AGGlBCi9BQ2iUhvgqE6JaMnYK4yCevNs+Jq9IFvInmQ5mql3CPQEjEzG7SHXBVpCIP+UiQZRRHw/xuyhZUxbsg0tAfI5T4jVJqmvihf48xua9mk2x2n6T5WJ8bnBDmER8XZzEn3FLPNXetzGLlcfozqRT7ACd/ifEd2QqgQLRlJLHBbuXVdSNw6IfV0g4CXe8BE2WMZSNR0EZup740C+K7Dh1/+wiu6R6BLdgfwAZChYzekRMK2WxHmL0Vlk1hGx27uIl/lNGp42FzTxmw/uVZzG3fNQmxQJPR4KWh3g9J5p4RVx8TJk2S1PvF5qc+HxVBtujrRJGqwUr18S8LYzuc4peO+AYo/c815sX/fYfAc+/QPz7jM5ouVfP2OzLlHbqmMCQtqkxMcGd1Folchi3O1mdT+1Vr8+oMSE+pglE+kgSH+A2IW0u6HznCZzs6oh4oXct03ShEzDERi8/2s+nNu5ykf1/q/QBbm9i4p/S9PepslgrPjTpw9j9xIR0aky1VC5dBnNxlWrnSLctRlZORNKJFH33sUxG34h4GggN72ni9254mvUim38bOCDJArlbKzo4Il7oPqbporVX9Na6yBt+jdbwTUR8V033rpFnYuzeb6K/MLZmNnJ5QoJzxWkt1mXadpO7SL4QSnXQp5c2oLHOMfFCfwMzZwUTGpZo2qk6b+BtyhMvdCZqbgrlzcfdMv6g+Rytm6o7tKy2G+Omz1G3LlK71/TB30ctCKrj4nhsSKjuHBtWTOHL9Fdc7Zb47kyL9Hy0DGNi5IvAHuY9lA3vFBskpaljvKRHFzcfMpuSbtlelr2ONGc2Yz/fpBc/DotcFS2dqA/fmLDa7tB5ja5eFWIaKJuPhIvgDCvi/wkv1SOoZau5tDkLbL2YS2gS6ab+4COFLmFElUCXJx3/4w9QKBEdID4w6WihO5Mh/i6zOXQRQvfuOUUH2pkYbpHpr+mLeDyEPqKgExzv78ouOdUju8QYGLmoqb6R8oakxLC1IRbLXxETweRtFNJLEyvVvEhPk8q3w6LUPK9rKydG8yG+wEYiujqxUs2LdGrRnrAgPV+t2xOjeZDfQ1QZfnE9HRadyMLm5t7/BjsYyRyZuZZmAAAAAElFTkSuQmCC";
// Separate palette tuned to the Renty reference, but still neutral to Fast Lease branding
const renty = {
  bg: "#ffffff",
  card: "#f5f7fb",
  stroke: "#e5e7eb",
  strokeBold: "#cbd5e1",
  textPrimary: "#1a1f2d",
  textSecondary: "#6b7280",
  accent: "#13428d",
  accentSoft: "#d9e3fa",
  success: "#16a34a",
};

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
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
  return `AED ${parsed.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function parseNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const digits = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyAED(value: number | null): string | null {
  if (value === null || Number.isNaN(value)) return null;
  return `AED ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function calculateMonthlyPayment(data: CommercialOfferData): string | null {
  const price = parseNumber(data.priceVat);
  const downPayment = parseNumber(data.downPayment) ?? 0;
  const termMonths = parseNumber(data.termMonths);
  const rateAnnual = parseNumber(data.interestRateAnnual);

  if (price === null || termMonths === null || termMonths <= 0) return null;
  const principal = Math.max(0, price - downPayment);
  const annualRate = rateAnnual ?? 0;
  const totalInterest = principal * (annualRate / 100) * (termMonths / 12);
  const payment = (principal + totalInterest) / termMonths;
  if (!Number.isFinite(payment)) return null;
  return formatCurrencyAED(payment);
}

function estimateInsuranceAnnual(data: CommercialOfferData): string | null {
  const price = parseNumber(data.priceVat);
  const rate = parseNumber(data.insuranceRateAnnual);
  if (price === null || rate === null) return null;
  const premium = (price * rate) / 100;
  return formatCurrencyAED(Math.round(premium));
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

const styles = StyleSheet.create({
  page: {
    padding: 36,
    backgroundColor: renty.bg,
    fontFamily: "Geist",
    color: renty.textPrimary,
    fontSize: 10,
    lineHeight: 1.35,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: renty.accent,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 73, // scale down while preserving natural aspect ratio
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#1f4fa5",
    color: "#e8efff",
    borderRadius: 6,
    fontSize: 9,
    fontWeight: 600,
  },
  hero: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: renty.card,
    border: `1 solid ${renty.stroke}`,
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
    color: renty.textPrimary,
  },
  heroMeta: {
    marginTop: 6,
    gap: 2,
  },
  heroSubtitle: {
    fontSize: 10,
    color: renty.textSecondary,
  },
  heroAside: {
    minWidth: 160,
    padding: 12,
    borderRadius: 10,
    border: `1 solid ${renty.strokeBold}`,
    backgroundColor: renty.bg,
    gap: 8,
    justifyContent: "flex-start",
  },
  asideLabel: {
    fontSize: 9,
    color: renty.textSecondary,
  },
  asideValue: {
    fontSize: 16,
    fontWeight: 700,
    color: renty.accent,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  card: {
    flex: 1,
    padding: 12,
    backgroundColor: renty.bg,
    borderRadius: 10,
    border: `1 solid ${renty.stroke}`,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: renty.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 3,
    borderBottom: `1 solid ${renty.stroke}`,
    gap: 6,
  },
  rowLabel: {
    fontSize: 9,
    color: renty.textSecondary,
  },
  rowValue: {
    fontSize: 11,
    fontWeight: 700,
    color: renty.textPrimary,
  },
  benefits: {
    gap: 6,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "47%",
  },
  check: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: renty.accent,
  },
  footnote: {
    fontSize: 9,
    color: renty.textSecondary,
    marginTop: 6,
  },
  cta: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    border: `1 solid ${renty.strokeBold}`,
    backgroundColor: renty.card,
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 6,
  },
  qrBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    padding: 10,
    border: `1 solid ${renty.stroke}`,
    borderRadius: 10,
  },
  footer: {
    marginTop: 12,
    borderTop: `1 solid ${renty.stroke}`,
    paddingTop: 8,
    color: renty.textSecondary,
    fontSize: 9,
  },
  salesCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    border: `1 solid ${renty.stroke}`,
    backgroundColor: renty.bg,
    gap: 6,
    justifyContent: "flex-end",
    minHeight: 120,
  },
  salesTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: renty.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  salesText: {
    fontSize: 10,
    color: renty.textSecondary,
  },
});

function Benefit({ children }: { children: string }) {
  return (
    <View style={styles.benefitItem}>
      <View style={styles.check} />
      <Text>{children}</Text>
    </View>
  );
}

function RentyStyleDocument({ data }: { data: CommercialOfferData }) {
  ensureFonts();

  const preparedAt = data.preparedAt
    ? new Date(data.preparedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const monthly = calculateMonthlyPayment(data) ?? "—";

  return (
    <Document title={`Leasing proposal ${data.dealNumber ?? ""}`.trim()}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {/* react-pdf Image does not support alt; lint false positive */}
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={RENTY_LOGO_DATA} style={styles.logo} />
            <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 12, fontWeight: 700, color: "#ffffff" }}>Fast Lease</Text>
              <Text style={{ fontSize: 10, color: "#e6edff" }}>Leasing made fast</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text style={styles.badge}>Offer valid 7 days</Text>
            <Text style={{ fontSize: 9, color: "#e6edff" }}>Issued {preparedAt}</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.heroSubtitle}>Your exclusive car leasing proposal</Text>
            <Text style={styles.heroTitle}>{data.vehicleName ?? "Vehicle"}</Text>
            <View style={styles.heroMeta}>
              <Text style={styles.heroSubtitle}>Client: {data.clientName ?? "—"}</Text>
              <Text style={styles.heroSubtitle}>{data.dealNumber ? `Deal ${data.dealNumber}` : "Deal —"}</Text>
            </View>
          </View>
          <View style={[styles.heroAside, { flexShrink: 0 }]}> 
            <View style={{ gap: 2 }}>
              <Text style={styles.asideLabel}>Monthly payment</Text>
              <Text style={styles.asideValue}>{monthly}</Text>
            </View>
            <View style={{ gap: 1 }}>
              <Text style={styles.asideLabel}>Tenor · Down payment</Text>
              <Text style={styles.rowValue}>
                {data.termMonths ? `${data.termMonths} mo.` : "—"} · {normalizeMoney(data.downPayment) ?? "—"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Financing</Text>
            <View style={{ marginTop: 4 }}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Vehicle price (incl. VAT)</Text>
                <Text style={styles.rowValue}>{normalizeMoney(data.priceVat) ?? "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Down payment</Text>
                <Text style={styles.rowValue}>{normalizeMoney(data.downPayment) ?? "—"}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Tenor</Text>
                <Text style={styles.rowValue}>{data.termMonths ? `${data.termMonths} months` : "—"}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Insurance</Text>
            <View style={{ marginTop: 4 }}>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Coverage</Text>
                <Text style={styles.rowValue}>Full comprehensive</Text>
              </View>
              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <Text style={styles.rowLabel}>Estimated yearly insurance</Text>
                <Text style={styles.rowValue}>{estimateInsuranceAnnual(data) ?? "—"}</Text>
              </View>
            </View>
            <Text style={styles.footnote}>
              Paid separately from down payment. Final premium may decrease based on insurer depreciation.
            </Text>
          </View>
        </View>

        <View style={styles.cta}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: renty.textPrimary }}>
            Car ready within 48 hours after signing and down payment.
          </Text>
          <Text style={{ fontSize: 10, color: renty.success }}>Simple paperwork • Quick start • Buy-out at the end</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Benefits</Text>
          <View style={[styles.benefits, { marginTop: 8, rowGap: 6 }]}>
            <Benefit>Certified inspection and prep</Benefit>
            <Benefit>Scheduled maintenance at authorised centres</Benefit>
            <Benefit>Notifications about fines and servicing</Benefit>
            <Benefit>Partner discounts on detailing and washes</Benefit>
            <Benefit>Upgrade to higher class on request</Benefit>
          </View>
        </View>

        <View style={[styles.grid, { gap: 12, marginTop: 10 }]}>
          <View style={[styles.card, { flex: 1, gap: 8 }]}> 
            <Text style={styles.sectionTitle}>Fast application</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 9, color: renty.textSecondary }}>Scan QR or open the link:</Text>
                <Text style={{ fontSize: 9, color: renty.accent }}>{resolveLoginUrl(data.loginUrl)}</Text>
              </View>
              {data.qrSrc ? (
                <>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={data.qrSrc} style={{ width: 78, height: 78 }} />
                </>
              ) : null}
            </View>
          </View>
          <View style={[styles.card, { flex: 1, gap: 6 }]}> 
            <Text style={styles.sectionTitle}>Sales manager</Text>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 10.5, fontWeight: 700, color: renty.textPrimary }}>
                {data.preparedBy ?? "Dmytro Parokhod"}
              </Text>
              <View style={{ gap: 2 }}>
                <Text style={styles.salesText}>{data.preparedByPhone ?? "+971 50 714 0877"}</Text>
                <Text style={styles.salesText}>{data.preparedByEmail ?? "dima@renty.ae"}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={{ fontSize: 8 }}>
            Preliminary draft offer. Figures and terms are indicative and may change after final credit and insurance approval.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export function CommercialOfferDownloadButtonRenty({
  data,
  label = "Download (draft Renty)",
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
    if (!data?.dealNumber || !data.dealNumber.trim()) return "commercial-offer-renty.pdf";
    const normalized = data.dealNumber.trim().replace(/[\s]+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
    return (normalized.length ? normalized : "commercial-offer-renty") + ".pdf";
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
        console.warn("commercial-offer-pdf-renty: failed to generate QR", err);
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
    return <RentyStyleDocument data={{ ...data, loginUrl, qrSrc }} />;
  }, [data, loginUrl, qrSrc]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (onGenerate) {
      try {
        await onGenerate();
      } catch (err) {
        console.warn("commercial-offer-pdf-renty: pre-generate hook failed", err);
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
      console.error("commercial-offer-pdf-renty: failed to generate PDF", err);
      setError("Could not generate PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = !docNode || loading;
  const iconClass = iconOnly ? "h-4 w-4" : "mr-2 h-4 w-4";
  const resolvedAria = ariaLabel ?? label ?? "Download offer (PDF)";
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
          {loading ? (
            <Loader2 className={`${iconClass} animate-spin`} />
          ) : (
            <Download className={iconClass} />
          )}
          {showLabel ? (loading ? "Generating..." : label) : null}
        </>
      </Button>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
