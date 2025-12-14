import type { Session, User } from "@supabase/supabase-js";

export type AppRole =
  | "ADMIN"
  | "OP_MANAGER"
  | "SUPPORT"
  | "FINANCE"
  | "TECH_SPECIALIST"
  | "RISK_MANAGER"
  | "INVESTOR"
  | "LEGAL"
  | "ACCOUNTING"
  | "OPS_MANAGER"
  | "SELLER"
  | "CLIENT";

export type PortalCode = "app" | "investor" | "client" | "partner" | "seller";

export type ProfileRecord = {
  id: string;
  user_id: string;
  status: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  emirates_id: string | null;
  passport_number: string | null;
  nationality: string | null;
  residency_status: string | null;
  date_of_birth: string | null;
  address: Record<string, unknown>;
  employment_info: Record<string, unknown>;
  financial_profile: Record<string, unknown>;
  metadata: Record<string, unknown>;
  timezone: string | null;
  avatar_url: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  source: string | null;
  entity_type: "individual" | "company" | null;
  seller_details: Record<string, unknown> | null;
};

export type PortalAccessRecord = {
  id: string;
  user_id: string;
  portal: PortalCode;
  status: string;
  last_access_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SessionUser = {
  session: Session | null;
  user: User;
  profile: ProfileRecord | null;
  roles: AppRole[];
  readOnlyRoles: AppRole[];
  primaryRole: AppRole | null;
  portals: PortalCode[];
};

export type AuthState = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  readOnlyRoles?: AppRole[];
  primaryRole: AppRole | null;
  portals?: PortalCode[];
};
