"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, RefreshCcw, Shield } from "lucide-react";

import type { RoleAccessMatrix } from "@/lib/supabase/queries/role-access";
import type { AppRole } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SectionState = RoleAccessMatrix["sections"][number];

function cloneSections(sections: SectionState[]): SectionState[] {
  return sections.map((section) => ({
    ...section,
    grants: { ...section.grants },
    defaults: { ...section.defaults },
  }));
}

const isWorkspaceSection = (sectionId: string) => sectionId.startsWith("workspace_");

export function AdminRolePermissions({ matrix }: { matrix: RoleAccessMatrix }) {
  const [sections, setSections] = useState<SectionState[]>(matrix.sections);
  const [pendingCell, setPendingCell] = useState<string | null>(null);
  const [pendingSection, setPendingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roleLabels = useMemo(() => matrix.roles, [matrix.roles]);
  const groupedSections = useMemo(() => {
    return matrix.groups
      .map((group) => ({
        ...group,
        sections: sections.filter((section) => section.groupId === group.id),
      }))
      .filter((group) => group.sections.length > 0);
  }, [matrix.groups, sections]);

  async function handleToggle(sectionId: string, role: AppRole) {
    if (!isWorkspaceSection(sectionId)) {
      setError("Эта секция управляется статической матрицей ролей.");
      return;
    }

    const cellKey = `${sectionId}-${role}`;
    const snapshot = cloneSections(sections);
    const section = sections.find((item) => item.id === sectionId);
    if (!section) return;

    const nextValue = !section.grants[role];
    setError(null);
    setPendingCell(cellKey);
    setSections((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              hasOverride: true,
              grants: { ...item.grants, [role]: nextValue },
            }
          : item,
      ),
    );

    try {
      const response = await fetch("/api/admin/roles/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: sectionId, role, allowed: nextValue }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Не удалось обновить доступ.");
      }
    } catch (caughtError) {
      console.error("[admin] Failed to toggle permission", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Ошибка сохранения");
      setSections(snapshot);
    } finally {
      setPendingCell(null);
    }
  }

  async function handleReset(sectionId: string) {
    if (!isWorkspaceSection(sectionId)) {
      setError("Reset доступен только для Workspace секций.");
      return;
    }

    const snapshot = cloneSections(sections);
    setError(null);
    setPendingSection(sectionId);
    setSections((prev) =>
      prev.map((item) =>
        item.id === sectionId
          ? {
              ...item,
              hasOverride: false,
              grants: { ...item.defaults },
            }
          : item,
      ),
    );

    try {
      const response = await fetch("/api/admin/roles/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: sectionId, action: "reset" }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Не удалось сбросить доступ.");
      }
    } catch (caughtError) {
      console.error("[admin] Failed to reset section permissions", caughtError);
      setError(caughtError instanceof Error ? caughtError.message : "Ошибка сброса");
      setSections(snapshot);
    } finally {
      setPendingSection(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          Статическая матрица закреплена за каждой ролью. Workspace позволяет переназначить доступ.
        </div>
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        {groupedSections.map((group) => (
          <div key={group.id} className="overflow-x-auto rounded-3xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 pb-3">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">{group.label}</p>
              <Badge variant="outline" className="rounded-full">
                {group.sections.length}
              </Badge>
            </div>
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr>
                  <th className="w-1/4 py-2 text-left text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
                    Страница
                  </th>
                  {roleLabels.map((role) => (
                    <th
                      key={`role-head-${group.id}-${role}`}
                      className="py-2 text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
                    >
                      {role.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.sections.map((section) => {
                  const editable = isWorkspaceSection(section.id);
                  return (
                    <tr key={section.id} className="border-t border-border/60">
                      <td className="p-3 align-top">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">{section.label}</span>
                          {editable ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => handleReset(section.id)}
                              disabled={pendingSection === section.id || !section.hasOverride}
                            >
                              {pendingSection === section.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCcw className="mr-2 h-4 w-4" />
                              )}
                              Сбросить
                            </Button>
                          ) : null}
                        </div>
                      </td>
                      {roleLabels.map((role) => {
                        const isActive = section.grants[role];
                        void section.defaults[role];
                        const key = `${section.id}-${role}`;
                        const isPending = pendingCell === key;
                        return (
                          <td key={key} className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggle(section.id, role)}
                              disabled={isPending || !editable}
                              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                isActive
                                  ? "border-brand-500 bg-brand-600/10 text-brand-600"
                                  : "border-border bg-transparent text-muted-foreground"
                              } ${
                                isPending
                                  ? "opacity-50"
                                  : editable
                                    ? "hover:border-brand-500 hover:text-brand-600"
                                    : "opacity-60"
                              }`}
                            >
                              {isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isActive ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <span className="text-base text-muted-foreground">—</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
