import { APP_ROLE_PRIORITY } from "@/lib/data/app-roles";
import type { AppRole } from "@/lib/auth/types";
import {
  ACCESS_SECTIONS,
  type AccessSection,
  getDefaultRolesForSection,
  isAccessSection,
} from "@/lib/auth/role-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RoleAccessRuleRow = {
  section: string;
  role: AppRole;
  allowed: boolean;
};

export type RoleAccessMatrix = {
  roles: AppRole[];
  groups: Array<{
    id: string;
    label: string;
  }>;
  sections: Array<{
    id: AccessSection;
    label: string;
    prefix: string;
    hasOverride: boolean;
    groupId: string;
    grants: Record<AppRole, boolean>;
    defaults: Record<AppRole, boolean>;
  }>;
};

export async function getRoleAccessMatrix(): Promise<RoleAccessMatrix> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("role_access_rules")
    .select("section, role, allowed")
    .returns<RoleAccessRuleRow[]>();

  if (error) {
    console.warn("[admin] Failed to load role access rules, falling back to defaults", error);
  }

  const overrides = new Map<AccessSection, Map<AppRole, boolean>>();
  const sectionsWithOverrides = new Set<AccessSection>();

  for (const row of data ?? []) {
    if (!isAccessSection(row.section)) {
      continue;
    }
    sectionsWithOverrides.add(row.section);
    if (!overrides.has(row.section)) {
      overrides.set(row.section, new Map<AppRole, boolean>());
    }
    overrides.get(row.section)!.set(row.role, Boolean(row.allowed));
  }

  const sections = ACCESS_SECTIONS.map((section) => {
    const hasOverride = sectionsWithOverrides.has(section.id);
    const defaultRoles = new Set(getDefaultRolesForSection(section.id));
    const overrideMap = overrides.get(section.id) ?? new Map<AppRole, boolean>();

    const defaults = APP_ROLE_PRIORITY.reduce<Record<AppRole, boolean>>((acc, role) => {
      acc[role] = defaultRoles.has(role);
      return acc;
    }, {} as Record<AppRole, boolean>);

    const grants = APP_ROLE_PRIORITY.reduce<Record<AppRole, boolean>>((acc, role) => {
      if (overrideMap.has(role)) {
        acc[role] = overrideMap.get(role) ?? false;
      } else {
        acc[role] = defaults[role];
      }
      return acc;
    }, {} as Record<AppRole, boolean>);

    return {
      id: section.id,
      label: section.label,
      prefix: section.prefix,
      hasOverride,
      groupId: section.prefix.split("/")[1] ?? "misc",
      grants,
      defaults,
    };
  });

  return {
    roles: APP_ROLE_PRIORITY,
    groups: Array.from(
      sections.reduce((set, section) => {
        set.set(section.groupId, section.groupId);
        return set;
      }, new Map<string, string>()),
    ).map(([id]) => ({
      id,
      label: id.toUpperCase(),
    })),
    sections,
  };
}
