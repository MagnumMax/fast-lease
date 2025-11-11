import type { PortalCode } from "@/lib/auth/types";

export type AuthActionStatus = "idle" | "success" | "error";

export type AuthActionContext = {
  identity?: string;
  portal?: PortalCode;
};

export type AuthActionState = {
  status: AuthActionStatus;
  message?: string;
  redirectPath?: string;
  context?: AuthActionContext;
  errorCode?: string;
};

export const INITIAL_AUTH_STATE: AuthActionState = {
  status: "idle",
};

export type DetectPortalState = {
  status: "idle" | "success" | "error";
  message?: string;
  portal?: PortalCode;
  suggestions?: PortalCode[];
  identity?: string;
  autoRedirect?: boolean;
  errorCode?: string;
};

export const INITIAL_DETECT_PORTAL_STATE: DetectPortalState = {
  status: "idle",
};
