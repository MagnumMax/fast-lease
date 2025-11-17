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

let appleFontsRegistered = false;
function ensureAppleFonts() {
  if (appleFontsRegistered) return;
  // We alias Inter to SF Pro Text/Mont; keeps look close to Apple Human Interface.
  const interSrc = "/fonts/InterVariable.ttf";
  Font.register({
    family: "SF Pro",
    fonts: [
      { src: interSrc, fontStyle: "normal", fontWeight: 400 },
      { src: interSrc, fontStyle: "normal", fontWeight: 500 },
      { src: interSrc, fontStyle: "normal", fontWeight: 600 },
      { src: interSrc, fontStyle: "normal", fontWeight: 700 },
    ],
  });
  appleFontsRegistered = true;
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

const apple = {
  background: "#f3f4f6",
  surface: "#ffffff",
  stroke: "#e1e3e8",
  textPrimary: "#0a0a0c",
  textSecondary: "#666870",
  tint: "#007aff",
  subtle: "#f7f7fa",
  shadow: "0 14 36 rgba(0,0,0,0.08)",
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

const appleStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    lineHeight: 1.55,
    color: apple.textPrimary,
    fontFamily: "SF Pro",
    backgroundColor: apple.background,
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: apple.surface,
    border: `1 solid ${apple.stroke}`,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 18,
    boxShadow: apple.shadow,
    marginBottom: 18,
  },
  heroLeft: {
    flex: 1,
    gap: 8,
  },
  heroCompany: {
    fontSize: 13,
    fontWeight: 700,
    color: apple.textPrimary,
    marginTop: 4,
  },
  heroBadge: {
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: apple.textSecondary,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: -0.25,
    color: apple.textPrimary,
  },
  heroMeta: {
    fontSize: 11,
    color: apple.textSecondary,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 6,
  },
  pill: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    border: `1 solid ${apple.stroke}`,
    backgroundColor: apple.subtle,
    fontSize: 10,
    color: apple.textPrimary,
    fontWeight: 600,
  },
  heroRight: {
    minWidth: 220,
    borderRadius: 18,
    padding: 16,
    border: `1 solid ${apple.stroke}`,
    backgroundColor: apple.surface,
    boxShadow: apple.shadow,
    gap: 6,
  },
  statLabel: {
    fontSize: 10,
    color: apple.textSecondary,
    letterSpacing: 0.2,
  },
  statValueHero: {
    fontSize: 24,
    fontWeight: 700,
    color: apple.textPrimary,
  },
  statSupport: {
    fontSize: 11,
    color: apple.textSecondary,
    marginTop: -2,
  },
  statGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    border: `1 solid ${apple.stroke}`,
    backgroundColor: apple.subtle,
    padding: 10,
    gap: 4,
  },
  section: {
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: apple.surface,
    border: `1 solid ${apple.stroke}`,
    boxShadow: apple.shadow,
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.2,
    color: apple.textPrimary,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoCell: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 160,
    borderRadius: 12,
    border: `1 solid ${apple.stroke}`,
    backgroundColor: apple.subtle,
    padding: 10,
    gap: 2,
  },
  label: {
    fontSize: 10,
    color: apple.textSecondary,
  },
  value: {
    fontSize: 12,
    fontWeight: 700,
    color: apple.textPrimary,
  },
  twoCols: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
    gap: 8,
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  note: {
    borderRadius: 14,
    backgroundColor: apple.subtle,
    border: `1 solid ${apple.stroke}`,
    padding: 12,
    fontSize: 11,
    color: apple.textPrimary,
    minHeight: 70,
  },
  steps: {
    gap: 6,
  },
  step: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: apple.tint,
  },
  contactCard: {
    borderRadius: 14,
    border: `1 solid ${apple.stroke}`,
    backgroundColor: apple.subtle,
    padding: 12,
    gap: 8,
    flex: 1,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: apple.surface,
    border: `1 solid ${apple.stroke}`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: 700,
    color: apple.textPrimary,
  },
  badge: {
    fontSize: 10,
    color: apple.textSecondary,
    marginTop: 2,
  },
  qrCard: {
    borderRadius: 16,
    border: `1 solid ${apple.stroke}`,
    backgroundColor: apple.surface,
    boxShadow: apple.shadow,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  qrMeta: {
    fontSize: 9.5,
    color: apple.textSecondary,
    maxWidth: 220,
  },
  signature: {
    borderBottom: `1 solid ${apple.stroke}`,
    paddingBottom: 6,
    minWidth: 160,
  },
  footer: {
    marginTop: 16,
    paddingTop: 10,
    borderTop: `1 solid ${apple.stroke}`,
    color: apple.textSecondary,
    fontSize: 10,
  },
});

function CommercialOfferDocument({ data }: { data: CommercialOfferData }) {
  ensureFonts();

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
                Сканируйте, чтобы зайти:
                {"\n"}
                {data.loginUrl ?? resolveLoginUrl(null)}
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

function CommercialOfferDocumentApple({ data }: { data: CommercialOfferData }) {
  ensureAppleFonts();

  const preparedAtDisplay = data.preparedAt
    ? new Date(data.preparedAt).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

  const monthlyPayment = calculateMonthlyPayment(data);
  const termAndDown = `${data.termMonths ? `${data.termMonths} мес.` : "—"} · ${normalizeMoney(data.downPayment) ?? "—"}`;
  const financeRate = normalizePercent(data.interestRateAnnual) ?? "—";
  const insuranceRate = normalizePercent(data.insuranceRateAnnual) ?? "—";

  return (
    <Document title={`Коммерческое предложение ${data.dealNumber ?? ""}`}>
      <Page size="A4" style={appleStyles.page}>
        <View style={appleStyles.hero}>
          <View style={[appleStyles.heroLeft, { justifyContent: "space-between" }]}>
            <View>
              <Text style={appleStyles.heroBadge}>Коммерческое предложение</Text>
              <Text style={appleStyles.heroCompany}>{data.companyName ?? "Fast Lease"}</Text>
              <Text style={appleStyles.heroTitle}>{data.vehicleName ?? "Лизинг автомобиля"}</Text>
            </View>
            <View style={{ gap: 4, marginTop: 10 }}>
              {data.clientName ? <Text style={appleStyles.heroMeta}>Клиент {data.clientName}</Text> : null}
              {data.dealNumber ? <Text style={appleStyles.heroMeta}>Сделка {data.dealNumber}</Text> : null}
              <View style={appleStyles.pillRow}>
                <Text style={appleStyles.pill}>Подготовлено {preparedAtDisplay}</Text>
              </View>
            </View>
          </View>

          <View style={appleStyles.heroRight}>
            <Text style={appleStyles.statLabel}>Ежемесячный платёж</Text>
            <Text style={appleStyles.statValueHero}>{monthlyPayment ?? "—"}</Text>
            <Text style={appleStyles.statSupport}>{termAndDown}</Text>
            <View style={appleStyles.statGrid}>
              <View style={appleStyles.statCard}>
                <Text style={appleStyles.label}>Цена с VAT</Text>
                <Text style={appleStyles.value}>{normalizeMoney(data.priceVat) ?? "—"}</Text>
              </View>
              <View style={appleStyles.statCard}>
                <Text style={appleStyles.label}>Ставка финансирования</Text>
                <Text style={appleStyles.value}>{financeRate}</Text>
              </View>
              <View style={appleStyles.statCard}>
                <Text style={appleStyles.label}>Страховка</Text>
                <Text style={appleStyles.value}>{insuranceRate}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={appleStyles.section}>
          <Text style={appleStyles.sectionTitle}>Ключевые факты</Text>
          <View style={appleStyles.infoGrid}>
            <View style={appleStyles.infoCell}>
              <Text style={appleStyles.label}>Подготовлено</Text>
              <Text style={appleStyles.value}>{preparedAtDisplay}</Text>
            </View>
            <View style={appleStyles.infoCell}>
              <Text style={appleStyles.label}>Личный кабинет</Text>
              <Text style={appleStyles.value}>{data.loginUrl ?? resolveLoginUrl(null)}</Text>
            </View>
          </View>
        </View>

        <View style={appleStyles.twoCols}>
          <View style={[appleStyles.col, appleStyles.section]}>
            <Text style={appleStyles.sectionTitle}>Автомобиль</Text>
            <View style={appleStyles.list}>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>Модель</Text>
                <Text style={appleStyles.value}>{data.vehicleName ?? "—"}</Text>
              </View>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>VIN</Text>
                <Text style={appleStyles.value}>{data.vehicleVin ?? "—"}</Text>
              </View>
            </View>
          </View>

          <View style={[appleStyles.col, appleStyles.section]}>
            <Text style={appleStyles.sectionTitle}>Финансы</Text>
            <View style={appleStyles.list}>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>Цена с VAT</Text>
                <Text style={appleStyles.value}>{normalizeMoney(data.priceVat) ?? "—"}</Text>
              </View>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>Аванс</Text>
                <Text style={appleStyles.value}>{normalizeMoney(data.downPayment) ?? "—"}</Text>
              </View>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>Срок</Text>
                <Text style={appleStyles.value}>{data.termMonths ? `${data.termMonths} мес.` : "—"}</Text>
              </View>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>Ежемесячный платёж</Text>
                <Text style={appleStyles.value}>{monthlyPayment ?? "—"}</Text>
              </View>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>Ставка финансирования</Text>
                <Text style={appleStyles.value}>{financeRate}</Text>
              </View>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>Ставка страховки</Text>
                <Text style={appleStyles.value}>{insuranceRate}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={appleStyles.twoCols}>
          <View style={[appleStyles.col, appleStyles.section]}>
            <Text style={appleStyles.sectionTitle}>Комментарий</Text>
            <Text style={appleStyles.note}>{data.comment?.trim().length ? data.comment : "—"}</Text>
          </View>
          <View style={[appleStyles.col, appleStyles.section]}>
            <Text style={appleStyles.sectionTitle}>Следующие шаги</Text>
            <View style={appleStyles.steps}>
              <View style={appleStyles.step}>
                <View style={appleStyles.stepDot} />
                <Text style={appleStyles.value}>Подтвердите параметры и подпишите КП</Text>
              </View>
              <View style={appleStyles.step}>
                <View style={appleStyles.stepDot} />
                <Text style={appleStyles.value}>Мы проверим автомобиль и подготовим договор</Text>
              </View>
              <View style={appleStyles.step}>
                <View style={appleStyles.stepDot} />
                <Text style={appleStyles.value}>Получите машину и доступ в личный кабинет</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={appleStyles.twoCols}>
          <View style={[appleStyles.contactCard]}>
            <Text style={appleStyles.sectionTitle}>Контакты</Text>
            <View style={appleStyles.contactRow}>
              <View style={appleStyles.avatar}>
                <Text style={appleStyles.avatarText}>{getInitials(data.preparedBy ?? null)}</Text>
              </View>
              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 12, fontWeight: 700, color: apple.textPrimary }}>
                  {data.preparedBy ?? "Ваш менеджер"}
                </Text>
                <Text style={appleStyles.badge}>Персональный советник Fast Lease</Text>
              </View>
            </View>
            <View style={appleStyles.list}>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>Телефон</Text>
                <Text style={appleStyles.value}>{formatPhone(data.preparedByPhone) ?? "—"}</Text>
              </View>
              <View style={appleStyles.row}>
                <Text style={appleStyles.label}>Email</Text>
                <Text style={appleStyles.value}>{data.preparedByEmail ?? "—"}</Text>
              </View>
            </View>
          </View>

          <View style={appleStyles.qrCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {data.qrSrc ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image
                  src={data.qrSrc}
                  style={{ width: 64, height: 64, borderRadius: 12, border: `1 solid ${apple.stroke}` }}
                />
              ) : (
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    border: `1 solid ${apple.stroke}`,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 9, color: apple.textSecondary }}>QR</Text>
                </View>
              )}
              <View style={{ gap: 2 }}>
                <Text style={{ fontSize: 10.5, fontWeight: 700, color: apple.textPrimary }}>
                  Вход в личный кабинет
                </Text>
                <Text style={appleStyles.qrMeta}>
                  Сканируйте, чтобы зайти:
                  {"\n"}
                  {data.loginUrl ?? resolveLoginUrl(null)}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <View style={appleStyles.signature}>
                <Text style={{ fontSize: 9, color: apple.textSecondary, textAlign: "right" }}>
                  Подпись клиента
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={appleStyles.footer}>
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
}: {
  data: CommercialOfferData | null;
  label?: string;
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

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-lg"
        disabled={isDisabled}
        onClick={handleDownload}
      >
        <>
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Генерируем..." : label}
        </>
      </Button>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}

export function CommercialOfferDownloadButtonApple({
  data,
  label = "Скачать КП (Apple, PDF)",
}: {
  data: CommercialOfferData | null;
  label?: string;
}) {
  const fileName = useMemo(() => {
    if (!data?.dealNumber || !data.dealNumber.trim()) {
      return "commercial-offer-apple.pdf";
    }
    const normalized = data.dealNumber
      .trim()
      .replace(/[\s]+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    return (normalized.length ? normalized : "commercial-offer-apple") + ".pdf";
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
    return <CommercialOfferDocumentApple data={{ ...data, loginUrl, qrSrc }} />;
  }, [data, loginUrl, qrSrc]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
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
      console.error("commercial-offer-pdf apple: failed to generate PDF", err);
      setError("Не удалось сформировать PDF. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  const isDisabled = !docNode || loading;

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="default"
        className="rounded-full px-4 bg-gradient-to-r from-black via-neutral-900 to-black text-white shadow-[0_16px_38px_rgba(0,0,0,0.18)] hover:scale-[1.01] transition-all border border-black/10"
        disabled={isDisabled}
        onClick={handleDownload}
      >
        <>
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Готовим макет..." : label}
        </>
      </Button>
      {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
    </div>
  );
}
