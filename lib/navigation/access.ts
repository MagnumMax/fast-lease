import type { NavItem } from "@/lib/navigation";
import type { AppRole } from "@/lib/auth/types";
import {
  getDefaultRolesForSection,
  resolveSectionForPath,
  isAccessSection,
  type AccessSection,
} from "@/lib/auth/role-access";
import { normalizeRoleCode } from "@/lib/auth/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function filterNavItemsForRoles(
  navItems: NavItem[],
  roles: AppRole[],
): Promise<NavItem[]> {
  if (!roles.length) {
    return navItems;
  }

  const navSections = navItems.map((item) => ({
    item,
    section: resolveSectionForPath(item.href),
  }));

  const sections = Array.from(
    new Set(
      navSections
        .map(({ section }) => section)
        .filter((section): section is AccessSection => Boolean(section)),
    ),
  );

  if (!sections.length) {
    return navItems;
  }

  const allowedMap = await loadAllowedRolesForSections(sections);

  return navSections
    .filter(({ section }) => {
      if (!section) {
        return true;
      }
      const allowedRoles = allowedMap.get(section);
      if (!allowedRoles) {
        return true;
      }
      return roles.some((role) => allowedRoles.has(role));
    })
    .map(({ item }) => item);
}

async function loadAllowedRolesForSections(
  sections: AccessSection[],
): Promise<Map<AccessSection, Set<AppRole>>> {
  const supabase = await createSupabaseServerClient();

  const baseline = new Map<AccessSection, Set<AppRole>>();
  for (const section of sections) {
    baseline.set(section, new Set(getDefaultRolesForSection(section)));
  }

  const { data, error } = await supabase
    .from("role_access_rules")
    .select("section, role, allowed")
    .in("section", sections);

  if (error) {
    console.error("[nav] Failed to load role overrides", error);
    return baseline;
  }

  for (const row of data ?? []) {
    if (!isAccessSection(row.section)) {
      continue;
    }
    const role = normalizeRoleCode(row.role);
    if (!role) {
      continue;
    }
    const sectionRoles = baseline.get(row.section);
    if (!sectionRoles) {
      continue;
    }
    if (row.allowed) {
      sectionRoles.add(role);
    } else {
      sectionRoles.delete(role);
    }
  }

  return baseline;
}
