import type { SessionUser } from "@/lib/auth/types";
import { getSessionUser } from "@/lib/auth/session";
import { READ_ONLY_ACCESS_MESSAGE } from "@/lib/access-control/messages";

export function canMutateSessionUser(sessionUser: SessionUser | null | undefined): boolean {
  if (!sessionUser) return false;
  if (!sessionUser.roles.length) return false;
  const readOnlyRoles = new Set(sessionUser.readOnlyRoles ?? []);
  return sessionUser.roles.some((role) => !readOnlyRoles.has(role));
}

export function getWritableRoles(sessionUser: SessionUser | null | undefined) {
  if (!sessionUser) return [] as string[];
  const readOnlyRoles = new Set(sessionUser.readOnlyRoles ?? []);
  return sessionUser.roles.filter((role) => !readOnlyRoles.has(role));
}

export async function getMutationSessionUser(): Promise<SessionUser | null> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return null;
  }
  if (!canMutateSessionUser(sessionUser)) {
    return null;
  }
  return sessionUser;
}
