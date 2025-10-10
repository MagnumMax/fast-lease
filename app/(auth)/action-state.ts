export type AuthActionStatus = "idle" | "otp_requested" | "success" | "error";

export type AuthActionState = {
  status: AuthActionStatus;
  message?: string;
  redirectPath?: string;
  context?: Record<string, string>;
  errorCode?: string;
};

export const INITIAL_AUTH_STATE: AuthActionState = {
  status: "idle",
};
