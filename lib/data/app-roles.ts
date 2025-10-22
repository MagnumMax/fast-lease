import type { AppRole } from "../auth/types";

export type AppRoleDefinition = {
  role: AppRole;
  label: string;
  description?: string;
  homePath: string;
  priority: number;
  defaultIdentity?: string;
  defaultPhone?: string;
  loginPreset?: {
    label?: string;
    identity: string;
  };
};

export const APP_ROLE_DEFINITIONS: AppRoleDefinition[] = [
  {
    role: "ADMIN",
    label: "Administrator",
    description: "Полный доступ к настройкам, пользователям и интеграциям.",
    homePath: "/admin/bpm",
    priority: 0,
    defaultIdentity: "admin@fastlease.io",
    loginPreset: {
      label: "Администратор",
      identity: "admin@fastlease.io",
    },
  },
  {
    role: "OP_MANAGER",
    label: "Operations Manager",
    description: "Управление сделками, задачами и статусами процессов.",
    homePath: "/ops/dashboard",
    priority: 1,
    defaultIdentity: "ops.manager@fastlease.io",
    loginPreset: {
      label: "Операционный менеджер",
      identity: "ops.manager@fastlease.io",
    },
  },
  {
    role: "OPERATOR",
    label: "Operator",
    description: "Исполнение задач и ведение сделок в рамках операций.",
    homePath: "/ops/dashboard",
    priority: 2,
    defaultIdentity: "operator@fastlease.io",
    loginPreset: {
      label: "Оператор",
      identity: "operator@fastlease.io",
    },
  },
  {
    role: "FINANCE",
    label: "Finance",
    description: "Финансовый контроль, платежи и биллинг поставщиков.",
    homePath: "/ops/deals",
    priority: 3,
    defaultIdentity: "finance@fastlease.io",
    loginPreset: {
      label: "Финансы",
      identity: "finance@fastlease.io",
    },
  },
  {
    role: "SUPPORT",
    label: "Support",
    description: "Поддержка клиентов и сопровождение сделок.",
    homePath: "/ops/tasks",
    priority: 4,
    defaultIdentity: "support@fastlease.io",
    loginPreset: {
      label: "Поддержка",
      identity: "support@fastlease.io",
    },
  },
  {
    role: "INVESTOR",
    label: "Investor",
    description: "Доступ к портфелю, KPI и отчётам по инвестициям.",
    homePath: "/investor/dashboard",
    priority: 5,
    defaultIdentity: "investor@fastlease.io",
    loginPreset: {
      label: "Инвестор",
      identity: "investor@fastlease.io",
    },
  },
  {
    role: "CLIENT",
    label: "Client",
    description: "Клиентский кабинет, платежи и документы по лизингу.",
    homePath: "/client/dashboard",
    priority: 6,
    defaultIdentity: "client@fastlease.io",
    defaultPhone: "+971500000000",
    loginPreset: {
      label: "Клиент",
      identity: "client@fastlease.io",
    },
  },
  {
    role: "RISK_MANAGER",
    label: "Risk Manager",
    description: "Оценка кредитного риска и скоринг клиентов.",
    homePath: "/ops/deals",
    priority: 7,
  },
  {
    role: "LEGAL",
    label: "Legal",
    description: "Юридическое сопровождение сделок и договоров.",
    homePath: "/ops/deals",
    priority: 8,
  },
  {
    role: "ACCOUNTING",
    label: "Accounting",
    description: "Пост-учёт и контроль финансовых документов.",
    homePath: "/ops/deals",
    priority: 9,
  },
];

const SORTED_BY_PRIORITY = [...APP_ROLE_DEFINITIONS].sort(
  (a, b) => a.priority - b.priority,
);

export const APP_ROLE_CODES: AppRole[] = SORTED_BY_PRIORITY.map(
  (definition) => definition.role,
);

export const APP_ROLE_PRIORITY: AppRole[] = APP_ROLE_CODES;

export const APP_ROLE_HOME_PATH: Record<AppRole, string> =
  APP_ROLE_DEFINITIONS.reduce(
    (acc, definition) => {
      acc[definition.role] = definition.homePath;
      return acc;
    },
    {} as Record<AppRole, string>,
  );

export const APP_ROLE_LABELS: Record<AppRole, string> =
  APP_ROLE_DEFINITIONS.reduce(
    (acc, definition) => {
      acc[definition.role] = definition.label;
      return acc;
    },
    {} as Record<AppRole, string>,
  );

export const APP_ROLE_DEFAULT_IDENTITIES: Partial<Record<AppRole, string>> =
  APP_ROLE_DEFINITIONS.reduce(
    (acc, definition) => {
      if (definition.defaultIdentity) {
        acc[definition.role] = definition.defaultIdentity;
      }
      return acc;
    },
    {} as Partial<Record<AppRole, string>>,
  );

export const APP_ROLE_DEFAULT_PHONES: Partial<Record<AppRole, string>> =
  APP_ROLE_DEFINITIONS.reduce(
    (acc, definition) => {
      if (definition.defaultPhone) {
        acc[definition.role] = definition.defaultPhone;
      }
      return acc;
    },
    {} as Partial<Record<AppRole, string>>,
  );

export type AppRoleLoginPreset = {
  role: AppRole;
  label: string;
  identity: string;
};

export const APP_ROLE_LOGIN_PRESETS: AppRoleLoginPreset[] =
  APP_ROLE_DEFINITIONS.filter(
    (definition): definition is AppRoleDefinition & {
      loginPreset: { label?: string; identity: string };
    } => Boolean(definition.loginPreset),
  ).map((definition) => ({
    role: definition.role,
    label: definition.loginPreset?.label ?? definition.label,
    identity: definition.loginPreset.identity,
  }));

export const APP_ROLE_TO_WORKFLOW_ROLE: Record<AppRole, string> =
  APP_ROLE_DEFINITIONS.reduce((acc, definition) => {
    acc[definition.role] = definition.role;
    return acc;
  }, {} as Record<AppRole, string>);
