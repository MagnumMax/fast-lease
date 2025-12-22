import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getClientDocumentLabel,
  getDealDocumentLabel,
  type ClientDocumentTypeValue,
} from "@/lib/supabase/queries/operations";
import type { ProfileSummaryPayload } from "@/app/(dashboard)/ops/actions";

function resolveEntityTypeLabel(entityType: string | null | undefined): string {
  if (entityType === "company") return "Юр. лицо";
  if (entityType === "personal") return "Физ. лицо";
  return entityType ?? "—";
}

type ProfileCardMiniProps = {
  label: string;
  profile: ProfileSummaryPayload;
};

export function ProfileCardMini({ label, profile }: ProfileCardMiniProps) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{profile.name || "Профиль"}</span>
        <span className="text-xs text-muted-foreground">
          {resolveEntityTypeLabel(profile.entityType)}
        </span>
      </div>
      {profile.email && <div className="text-xs text-muted-foreground">{profile.email}</div>}
      {profile.phone && <div className="text-xs text-muted-foreground">{profile.phone}</div>}
      {profile.documents && profile.documents.length > 0 && (
        <div className="mt-2 text-xs">
          <span className="font-semibold text-muted-foreground">Документы:</span>
          <div className="mt-1 flex flex-wrap gap-2">
            {profile.documents.map((doc) => {
              const docLabel =
                getClientDocumentLabel(doc.document_type as ClientDocumentTypeValue) ??
                getDealDocumentLabel(doc.document_type) ??
                doc.document_type ??
                doc.title;
              const badge = (
                <Badge
                  variant="secondary"
                  className="rounded-lg font-normal transition-colors hover:bg-secondary/80"
                >
                  {docLabel}
                  {doc.signedUrl && (
                    <ExternalLink className="ml-1.5 inline-block h-3 w-3 opacity-50" />
                  )}
                </Badge>
              );

              if (doc.signedUrl) {
                return (
                  <Link
                    key={doc.id}
                    href={doc.signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {badge}
                  </Link>
                );
              }

              return <div key={doc.id}>{badge}</div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
