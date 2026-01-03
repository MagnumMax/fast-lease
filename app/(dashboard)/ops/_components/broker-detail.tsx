import Link from "next/link";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Mail, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  OpsBrokerDocument,
  OpsBrokerProfile,
} from "@/lib/supabase/queries/operations";
import { updateOperationsBroker, deleteOperationsBroker } from "@/app/(dashboard)/ops/brokers/actions";
import { DocumentList } from "./document-list";
import { BrokerEditDialog } from "./broker-edit-dialog";

function getString(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  const val = record[key];
  return typeof val === "string" ? val : null;
}

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
  contentClassName?: string;
  actions?: ReactNode;
  id?: string;
};

function SectionCard({ title, description, children, className, contentClassName, actions, id }: SectionCardProps) {
  const classes = ["border border-border/60 bg-card/70", className].filter(Boolean).join(" ");
  return (
    <Card id={id} className={classes}>
      <CardHeader className="flex flex-col gap-2 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className={["space-y-4 pt-4", contentClassName].filter(Boolean).join(" ")}>{children}</CardContent>
    </Card>
  );
}

type OpsBrokerDetailProps = {
  profile: OpsBrokerProfile;
  deals: OpsClientDeal[];
  documents: OpsBrokerDocument[];
  backUrl?: string;
};

export function OpsBrokerDetailView({
  profile,
  deals,
  documents,
  backUrl,
}: OpsBrokerDetailProps) {
  const hasAnyDocuments = documents.length > 0;
  
  const emptyMessage = hasAnyDocuments
    ? "Документы не найдены. Загрузите документы через кнопку «Редактировать»."
    : "Документы брокера отсутствуют. Нажмите «Редактировать» для загрузки документов.";

  const documentItems = useMemo(
    () =>
      documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        uploadedAt: doc.uploadedAt,
        url: doc.url ?? null,
      })),
    [documents],
  );

  const entityTypeLabel =
    profile.entityType === "company"
      ? "Юрлицо"
      : profile.entityType === "personal"
        ? "Физлицо"
        : "—";

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={backUrl ?? "/ops/brokers"} className="flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            К списку брокеров
          </Link>
        </div>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {profile.fullName}
              </h1>
              <Badge variant={profile.status === "Blocked" ? "danger" : "outline"}>
                {profile.status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {profile.email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {profile.phone}
                </div>
              )}
              {profile.createdAt && (
                <div className="flex items-center gap-1.5">
                  <span>Создан: {formatDateDisplay(profile.createdAt)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <BrokerEditDialog
              profile={profile}
              documents={documents}
              onSubmit={updateOperationsBroker}
              onDelete={deleteOperationsBroker}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="space-y-6">
          <SectionCard title="Основная информация">
            <div className="grid grid-cols-2 gap-y-6">
              <InfoCell label="Тип">{entityTypeLabel}</InfoCell>
              <InfoCell label="Национальность">
                {profile.nationality || "—"}
              </InfoCell>
              <InfoCell label="Источник">{profile.source || "—"}</InfoCell>
            </div>
          </SectionCard>

          {profile.brokerDetails && Object.keys(profile.brokerDetails).length > 0 && (
            <SectionCard title="Реквизиты">
              <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2">
                {getString(profile.brokerDetails, "broker_bank_details") && (
                  <InfoCell label="Банковские реквизиты (IBAN)" className="col-span-2">
                    {getString(profile.brokerDetails, "broker_bank_details")}
                  </InfoCell>
                )}
                {getString(profile.brokerDetails, "broker_contact_email") && (
                  <InfoCell label="Email для связи">
                    {getString(profile.brokerDetails, "broker_contact_email")}
                  </InfoCell>
                )}
                {getString(profile.brokerDetails, "broker_contact_phone") && (
                  <InfoCell label="Телефон для связи">
                    {getString(profile.brokerDetails, "broker_contact_phone")}
                  </InfoCell>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        <SectionCard title="Документы">
          <DocumentList
            documents={documentItems}
            emptyMessage={emptyMessage}
          />
        </SectionCard>
      </div>

      <SectionCard id="broker-deals" title="Сделки" description={`Всего сделок: ${deals.length}`} contentClassName="p-0">
        {deals.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Нет активных или завершенных сделок
          </div>
        ) : (
          <Table containerClassName="border-0 rounded-none">
            <TableHeader>
              <TableRow>
                <TableHead>Номер сделки</TableHead>
                <TableHead>Автомобиль</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Сумма</TableHead>
                <TableHead>Дата создания</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deals.map((deal) => {
                const dealHref = `/ops/deals/${deal.dealNumber}`;

                return (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <Link
                        href={dealHref}
                        className="font-medium text-primary hover:underline"
                      >
                        {deal.dealNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{deal.vehicleName}</span>
                        {deal.vehicleVin && (
                          <span className="text-xs text-muted-foreground">{deal.vehicleVin}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(deal.statusKey)}>
                        {deal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(deal.totalAmount)}</TableCell>
                    <TableCell>{formatDateDisplay(deal.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
