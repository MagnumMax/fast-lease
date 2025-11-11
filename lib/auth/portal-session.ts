import { redirect } from "next/navigation";

import { resolvePortalHomePath } from "@/lib/auth/portals";
import type { PortalCode } from "@/lib/auth/types";
import { getSessionUser } from "@/lib/auth/session";

function buildLoginRedirect(portal: PortalCode, nextPath?: string) {
  const basePath = `/login/${portal}`;
  if (!nextPath) {
    return basePath;
  }
  const encoded = encodeURIComponent(nextPath);
  return `${basePath}?next=${encoded}`;
}

export async function requirePortalSession(
  portal: PortalCode,
  fallbackPath?: string,
) {
  const sessionUser = await getSessionUser();
  const nextPath = fallbackPath ?? resolvePortalHomePath(portal);

  if (!sessionUser) {
    redirect(buildLoginRedirect(portal, nextPath));
  }

  if (!sessionUser.portals.includes(portal)) {
    redirect(buildLoginRedirect(portal, nextPath));
  }

  return sessionUser;
}
