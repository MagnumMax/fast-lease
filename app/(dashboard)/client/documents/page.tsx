import { redirect } from "next/navigation";
import { FileText, UploadCloud } from "lucide-react";

import { DocumentsPanel, formatDate } from "@/app/(dashboard)/client/_components";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { getClientPortalSnapshot } from "@/lib/supabase/queries/client-portal";

export default async function ClientDocumentsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?next=/client/documents");
  }

  const snapshot = await getClientPortalSnapshot(sessionUser.user.id);

  const contractDocuments = snapshot.dealDocuments.map((doc) => ({
    id: doc.id,
    title: doc.title,
    status: doc.status ?? (doc.signedAt ? `Signed ${formatDate(doc.signedAt)}` : "Pending"),
    href: doc.signedUrl,
  }));

  const complianceDocuments = snapshot.applicationDocuments.map((doc) => ({
    id: doc.id,
    title: doc.documentType,
    status: doc.status ?? "Uploaded",
    href: doc.signedUrl,
  }));

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-linear">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Documents
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Agreements & compliance files
            </h1>
            <p className="text-sm text-muted-foreground">
              Access agreements, payment schedules, and identity documents submitted during onboarding.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-border text-xs font-semibold"
          >
            <UploadCloud className="mr-2 h-4 w-4" aria-hidden="true" />
            Upload new document
          </Button>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <DocumentsPanel title="Agreements" documents={contractDocuments} />
          <Card className="border border-border bg-surface-subtle/40">
            <CardHeader className="flex flex-row items-center gap-3 pb-4">
              <FileText className="h-4 w-4 text-brand-600" aria-hidden="true" />
              <CardTitle className="text-sm font-semibold text-foreground">
                Compliance uploads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentsPanel
                title="KYC & Supporting documents"
                documents={complianceDocuments}
                emptyState="No compliance documents uploaded yet."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="border border-border bg-card shadow-linear">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground">
            Storage notes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Sensitive documents are stored in a private Supabase bucket with per-file access audits. Signed URLs are generated on demand and expire after 60 minutes.
          </p>
          <p>
            To request corrections or re-upload updated files, contact support or use the upload button above — your operations manager will receive a notification instantly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
