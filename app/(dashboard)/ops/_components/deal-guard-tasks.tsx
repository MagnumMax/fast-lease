"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";

import { AlertTriangle, Loader2, Paperclip, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OpsDealGuardStatus, OpsDealStatusKey } from "@/lib/supabase/queries/operations";
import { completeDealGuardAction } from "@/app/(dashboard)/ops/deals/[id]/actions";

type FormState = {
  error?: string;
  success: boolean;
};

const INITIAL_FORM_STATE: FormState = { error: undefined, success: false };

type DealGuardTasksProps = {
  dealId: string;
  statusKey: OpsDealStatusKey;
  guardStatuses: OpsDealGuardStatus[];
  slug: string;
};

type GuardTaskFormProps = {
  dealId: string;
  statusKey: OpsDealStatusKey;
  guard: OpsDealGuardStatus;
  slug: string;
};

function GuardActionButtons({ fulfilled }: { fulfilled: boolean }) {
  if (fulfilled) {
    return (
      <Badge variant="success" className="rounded-lg">
        Завершено
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className="rounded-lg">
      Требует действия
    </Badge>
  );
}

function GuardTaskForm({ dealId, statusKey, guard, slug }: GuardTaskFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    completeDealGuardAction,
    INITIAL_FORM_STATE,
  );
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (state.success) {
      setShowForm(false);
    }
  }, [state.success]);

  if (guard.fulfilled) {
    return (
      <div className="space-y-2 rounded-xl border border-emerald-500/40 bg-emerald-50 p-4 text-sm text-emerald-700">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-medium">
            <ShieldCheck className="h-4 w-4" /> {guard.label}
          </span>
          <GuardActionButtons fulfilled={true} />
        </div>
        {guard.note ? <p className="text-xs text-emerald-800">Комментарий: {guard.note}</p> : null}
        {guard.attachmentUrl ? (
          <Link
            href={guard.attachmentUrl}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-800 underline"
          >
            <Paperclip className="h-3 w-3" /> Просмотреть вложение
          </Link>
        ) : null}
        {guard.completedAt ? (
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-900/70">
            Завершено: {new Date(guard.completedAt).toLocaleString()}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-50 p-4 text-sm text-amber-700">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" /> {guard.label}
        </span>
        <GuardActionButtons fulfilled={false} />
      </div>
      {guard.hint ? <p className="text-xs text-amber-800">{guard.hint}</p> : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => setShowForm((prev) => !prev)}
      >
        {showForm ? "Отменить" : "Выполнить задачу"}
      </Button>

      {showForm ? (
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="dealId" value={dealId} />
          <input type="hidden" name="statusKey" value={statusKey} />
          <input type="hidden" name="guardKey" value={guard.key} />
          <input type="hidden" name="slug" value={slug} />

          <div className="space-y-2">
            <Label htmlFor={`${guard.key}-note`}>Комментарий</Label>
            <textarea
              id={`${guard.key}-note`}
              name="note"
              placeholder="Добавьте детали выполнения"
              className="min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            />
          </div>

          {guard.requiresDocument ? (
            <div className="space-y-2">
              <Label htmlFor={`${guard.key}-file`}>Вложение (обязательно)</Label>
              <Input id={`${guard.key}-file`} name="attachment" type="file" required />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor={`${guard.key}-file`}>Вложение (опционально)</Label>
              <Input id={`${guard.key}-file`} name="attachment" type="file" />
            </div>
          )}

          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}

          <Button type="submit" className="rounded-lg" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Завершить задачу
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function DealGuardTasks({ dealId, statusKey, guardStatuses, slug }: DealGuardTasksProps) {
  return (
    <div className="space-y-3">
      {guardStatuses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Для текущего статуса нет условий перехода.</p>
      ) : (
          guardStatuses.map((guard) => (
            <GuardTaskForm
              key={guard.key}
              dealId={dealId}
              statusKey={statusKey}
              guard={guard}
              slug={slug}
            />
          ))
      )}
    </div>
  );
}
