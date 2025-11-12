"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";
import { Shield } from "lucide-react";

import type { AppRole } from "@/lib/auth/types";
import { Alert } from "@/components/ui/alert";

type AccessControlContextValue = {
  canMutate: boolean;
  readOnlyRoles: AppRole[];
};

const AccessControlContext = createContext<AccessControlContextValue | null>(null);

type AccessControlProviderProps = {
  canMutate: boolean;
  readOnlyRoles: AppRole[];
  children: ReactNode;
};

export function AccessControlProvider({
  canMutate,
  readOnlyRoles,
  children,
}: AccessControlProviderProps) {
  const value = useMemo<AccessControlContextValue>(
    () => ({ canMutate, readOnlyRoles }),
    [canMutate, readOnlyRoles],
  );

  return (
    <AccessControlContext.Provider value={value}>
      {children}
    </AccessControlContext.Provider>
  );
}

export function useAccessControl(): AccessControlContextValue {
  const context = useContext(AccessControlContext);
  if (!context) {
    return { canMutate: true, readOnlyRoles: [] };
  }
  return context;
}

export function ReadOnlyBanner() {
  const { canMutate } = useAccessControl();
  if (canMutate) {
    return null;
  }

  return (
    <Alert variant="warning" className="mb-4 flex items-start gap-3">
      <Shield className="h-4 w-4 text-amber-600" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          Read-only access
        </p>
        <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
          You can explore data and history, but creating or editing records is disabled until an administrator upgrades your permissions.
        </p>
      </div>
    </Alert>
  );
}
