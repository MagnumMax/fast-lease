export type MFATotpContext = {
  type: "totp";
  factorId: string;
  challengeId: string;
};

export type MFASmsContext = {
  type: "sms";
  phone: string;
};

export type MFAContext = MFATotpContext | MFASmsContext;

export type AuthActionState = {
  status: "idle" | "success" | "error" | "mfa_required" | "needs_verification";
  message?: string;
  redirectPath?: string;
  context?: Record<string, string>;
  mfa?: MFAContext;
  errorCode?: string;
};

export const INITIAL_AUTH_STATE: AuthActionState = {
  status: "idle",
};
