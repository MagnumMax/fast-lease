import Link from "next/link";
import { useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Mail, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  OpsClientDeal,
  OpsClientDocument,
  OpsClientNotification,
  OpsClientProfile,
  OpsClientReferralSummary,
  OpsClientSupportTicket,
} from "@/lib/supabase/queries/operations";
import { ClientEditDialog } from "./client-edit-dialog";
import {
  updateOperationsClient,
  deleteOperationsClient,
} from "@/app/(dashboard)/ops/clients/actions";
import { buildSlugWithId } from "@/lib/utils/slugs";
import { DocumentList } from "./document-list";

function formatDateDisplay(value: string | null | undefined, withTime = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
  if (!withTime) return datePart;
  const timePart = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${datePart} ${timePart}`;
}

function formatCurrency(value: number | string | null | undefined): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  return `AED ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type InfoCellProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

function InfoCell({ label, children, className }: InfoCellProps) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function getStatusBadgeVariant(statusKey?: string): "default" | "secondary" | "outline" | "success" | "danger" {
  if (!statusKey) return "outline";
  const normalized = statusKey.toUpperCase();
  if (normalized === "ACTIVE") return "success";
  if (normalized === "CANCELLED" || normalized === "BLOCKED" || normalized === "SUSPENDED") {
    return "danger";
  }
  if (["SIGNING_FUNDING", "CONTRACT_PREP", "DOC_SIGNING"].includes(normalized)) return "secondary";
  return "outline";
}

type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
};

function SectionCard({ title, description, children, className, actions }: SectionCardProps) {
  const classes = ["border border-border/60 bg-card/70", className].filter(Boolean).join(" ");
  return (
    <Card className={classes}>
      <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4 pt-4">{children}</CardContent>
    </Card>
  );
}

type ClientDetailProps = {
  profile: OpsClientProfile;
  deals: OpsClientDeal[];
  documents: OpsClientDocument[];
  notifications: OpsClientNotification[];
  supportTickets: OpsClientSupportTicket[];
  referral: OpsClientReferralSummary | null;
};

export function ClientDetailView({
  profile,
  deals,
  documents,
  notifications,
  supportTickets,
  referral,
}: ClientDetailProps) {
  const resolveDocumentContext = useCallback((doc: OpsClientDocument): "personal" | "company" => {
    if (doc.context === "company" || doc.context === "personal") {
      return doc.context;
    }

    const documentType = (doc.documentType ?? "").toLowerCase();
    const category = (doc.category ?? "").toLowerCase();
    const metadataContext =
      typeof doc.metadata === "object" && doc.metadata !== null
        ? String((doc.metadata as Record<string, unknown>)["upload_context"] ?? "").toLowerCase()
        : "";

    if (metadataContext === "company") {
      return "company";
    }
    if (documentType === "company_license" || category === "company") {
      return "company";
    }

    const nameLower = (doc.name ?? "").toLowerCase();
    if (nameLower.includes("company") || nameLower.includes("license")) {
      return "company";
    }

    return "personal";
  }, []);

  const personalDocuments = useMemo(
    () => documents.filter((doc) => resolveDocumentContext(doc) === "personal"),
    [documents, resolveDocumentContext],
  );
  const companyDocumentsList = useMemo(
    () => documents.filter((doc) => resolveDocumentContext(doc) === "company"),
    [documents, resolveDocumentContext],
  );
  const hasAnyDocuments = documents.length > 0;
  const companyInfo = profile.company;
  const clientTypeLabel = profile.clientType === "Company" ? "Company" : "Personal";

  const personalEmptyMessage = hasAnyDocuments
    ? "Документы идентификации не найдены. Загрузите документы через кнопку «Редактировать»."
    : "Документы клиента отсутствуют. Нажмите «Редактировать» для загрузки документов идентификации.";
  const companyEmptyMessage = hasAnyDocuments
    ? "Документы компании не найдены. Загрузите документы через кнопку «Редактировать»."
    : "Документы компании отсутствуют. Нажмите «Редактировать» для загрузки документов.";

  const personalDocumentItems = useMemo(
    () =>
      personalDocuments.map((doc) => ({
        id: doc.id,
        title: doc.name,
        uploadedAt: doc.uploadedAt,
        url: doc.url ?? null,
      })),
    [personalDocuments],
  );

  const companyDocumentItems = useMemo(
    () =>
      companyDocumentsList.map((doc) => ({
        id: doc.id,
        title: doc.name,
        uploadedAt: doc.uploadedAt,
        url: doc.url ?? null,
      })),
    [companyDocumentsList],
  );

  const financialHighlights = [
    { label: "Скоринг", value: profile.metrics.scoring },
    { label: "Просрочки", value: profile.metrics.overdue },
    { label: "Кредитный лимит", value: profile.metrics.limit },
    { label: "Экспозиция", value: profile.metrics.totalExposure },
    { label: "Активных сделок", value: profile.metrics.activeDeals.toString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" asChild className="rounded-xl border border-border">
          <Link href="/ops/clients" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад к клиентам
          </Link>
        </Button>
        <ClientEditDialog
          profile={profile}
          documents={documents}
          onSubmit={updateOperationsClient}
          onDelete={deleteOperationsClient}
        />
      </div>

      <div className="flex flex-col gap-6">
        <div className="border border-border/60 bg-card/70 rounded-xl p-6 space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2 flex-1">
              <div className="flex items-start justify-between">
                <p className="text-2xl font-semibold text-foreground">{profile.fullName}</p>
                <Badge variant={getStatusBadgeVariant(profile.status)} className="rounded-lg">
                  {profile.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCell label="Тип клиента">{clientTypeLabel}</InfoCell>
            <InfoCell label="Статус">{profile.status || "—"}</InfoCell>
            <InfoCell label="Телефон">
              {profile.phone ? (
                <Link
                  href={`tel:${profile.phone}`}
                  className="inline-flex items-center gap-2 text-foreground underline-offset-2 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {profile.phone}
                </Link>
              ) : (
                "—"
              )}
            </InfoCell>
            <InfoCell label="Email">
              {profile.email ? (
                <Link
                  href={`mailto:${profile.email}`}
                  className="inline-flex items-center gap-2 text-foreground underline-offset-2 hover:underline"
                >
                  <Mail className="h-4 w-4" />
                  {profile.email}
                </Link>
              ) : (
                "—"
              )}
            </InfoCell>
            <InfoCell label="Источник">
              {profile.source && profile.source.trim().length ? profile.source.trim() : "—"}
            </InfoCell>
            <InfoCell label="Дата рождения">{formatDateDisplay(profile.dateOfBirth)}</InfoCell>
            <InfoCell label="Национальность">{profile.nationality ?? "—"}</InfoCell>
            <InfoCell label="Статус резидентства">{profile.residencyStatus ?? "—"}</InfoCell>
            <InfoCell label="Emirates ID">{profile.emiratesId ?? "—"}</InfoCell>
            <InfoCell label="Паспорт">{profile.passportNumber ?? "—"}</InfoCell>
            {profile.clientType === "Company" ? (
              <>
                <InfoCell label="Контактное лицо">{companyInfo.contactName ?? "—"}</InfoCell>
                <InfoCell label="Emirates ID контакта">
                  {companyInfo.contactEmiratesId ?? "—"}
                </InfoCell>
                <InfoCell label="TRN">{companyInfo.trn ?? "—"}</InfoCell>
                <InfoCell label="Лицензия компании">{companyInfo.licenseNumber ?? "—"}</InfoCell>
              </>
            ) : null}
          </div>

          <div className="space-y-4 border-t border-border/40 pt-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Документы клиента</p>
            </div>
            <DocumentList
              documents={personalDocumentItems}
              emptyMessage={personalEmptyMessage}
            />
          </div>

          {profile.clientType === "Company" ? (
            <div className="space-y-4 border-t border-border/40 pt-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Документы компании и контактного лица
                </p>
              </div>
              <DocumentList
                documents={companyDocumentItems}
                emptyMessage={companyEmptyMessage}
              />
            </div>
          ) : null}
        </div>
      </div>

      <SectionCard title="Финансовая информация">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Ключевые показатели</p>
            <div className="mt-3 space-y-2 text-sm text-foreground">
              {financialHighlights.map((metric) => (
                <div key={metric.label}>
                  <span className="text-muted-foreground">{metric.label}: </span>
                  <span className="font-medium">{metric.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Занятость</p>
              <div className="mt-3 space-y-2 text-sm text-foreground">
                <div>
                  <span className="text-muted-foreground">Работодатель: </span>
                  {profile.employment.employer ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Должность: </span>
                  {profile.employment.position ?? "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Стаж: </span>
                  {profile.employment.years != null ? `${profile.employment.years} лет` : "—"}
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Финансовый профиль</p>
              <div className="mt-3 space-y-2 text-sm text-foreground">
                <div>
                  <span className="text-muted-foreground">Месячный доход: </span>
                  {formatCurrency(profile.financial.monthlyIncome ?? null)}
                </div>
                <div>
                  <span className="text-muted-foreground">Текущие кредиты: </span>
                  {profile.financial.existingLoans != null
                    ? formatCurrency(profile.financial.existingLoans)
                    : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Кредитный рейтинг: </span>
                  {profile.financial.creditScore != null
                    ? Math.round(profile.financial.creditScore).toString()
                    : "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Риск-оценка: </span>
                  {profile.financial.riskGrade ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Сделки">
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Сделка</TableHead>
                <TableHead>Автомобиль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Платёж/мес</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Следующий платёж</TableHead>
                <TableHead>Просрочка</TableHead>
                <TableHead>Менеджер</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    Сделки не найдены
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal) => {
                  const slug = buildSlugWithId(deal.dealNumber, deal.id) || deal.id;
                  return (
                    <TableRow key={deal.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/ops/deals/${slug}`}
                          className="text-foreground underline-offset-2 hover:underline"
                        >
                          {deal.dealNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-[140px]">{deal.vehicleName}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={getStatusBadgeVariant(deal.statusKey)} className="rounded-lg">
                            {deal.statusKey ?? deal.status}
                          </Badge>
                          {deal.stageLabel ? (
                            <p className="text-xs text-muted-foreground">{deal.stageLabel}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{deal.monthlyPayment ?? "—"}</TableCell>
                      <TableCell>{deal.totalAmount ?? deal.principalAmount ?? "—"}</TableCell>
                      <TableCell>{deal.nextPaymentDue ?? "—"}</TableCell>
                      <TableCell>{deal.overdueAmount ?? "—"}</TableCell>
                      <TableCell>{deal.assignedManagerName ?? "—"}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="Коммуникации">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Недавние уведомления</p>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Уведомлений нет.</p>
            ) : (
              notifications.slice(0, 6).map((notification) => (
                <div key={notification.id} className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">{notification.title}</p>
                    <Badge variant="outline" className="rounded-lg text-[11px] uppercase tracking-wide">
                      {notification.severity}
                    </Badge>
                  </div>
                  {notification.message ? (
                    <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {formatDateDisplay(notification.createdAt, true)}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Тикеты поддержки</p>
            {supportTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Активных обращений нет.</p>
            ) : (
              supportTickets.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="rounded-lg border border-border/60 bg-background/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{ticket.ticketNumber}</p>
                    <Badge variant="outline" className="rounded-lg uppercase tracking-wide text-[11px]">
                      {ticket.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ticket.topic}</p>
                  {ticket.lastMessagePreview ? (
                    <p className="mt-2 text-[11px] text-muted-foreground line-clamp-2">
                      {ticket.lastMessagePreview}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Обновлено: {formatDateDisplay(ticket.updatedAt, true)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Реферальная программа">
        {referral ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCell label="Промокод">{referral.code}</InfoCell>
            <InfoCell label="Переходы">{referral.clicks}</InfoCell>
            <InfoCell label="Заявки">{referral.applications}</InfoCell>
            <InfoCell label="Сделки">{referral.deals}</InfoCell>
            <InfoCell label="Награды">{referral.totalRewards ?? "—"}</InfoCell>
            <InfoCell label="Дата активации">{formatDateDisplay(referral.createdAt)}</InfoCell>
            <InfoCell label="Ссылка">
              {referral.shareUrl ? (
                <Link
                  href={referral.shareUrl}
                  target="_blank"
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  Открыть ссылку
                </Link>
              ) : (
                "—"
              )}
            </InfoCell>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">У клиента нет реферальной активности.</p>
        )}
      </SectionCard>
    </div>
  );
}
