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
    homePath: "/admin/dashboard",
    priority: 0,
    defaultIdentity: "admin@fastlease.ae",
    loginPreset: {
      label: "Администратор",
      identity: "admin@fastlease.ae",
    },
  },
  {
    role: "OP_MANAGER",
    label: "Operations Manager",
    description:
      "Управление и исполнение операционного процесса: сделки, задачи, статусы.",
    homePath: "/ops/dashboard",
    priority: 1,
    defaultIdentity: "opsmanager@fastlease.ae",
    loginPreset: {
      label: "Операционный менеджер",
      identity: "opsmanager@fastlease.ae",
    },
  },
  {
    role: "FINANCE",
    label: "Finance",
    description: "Финансовый контроль, платежи и биллинг поставщиков.",
    homePath: "/finance/dashboard",
    priority: 2,
    defaultIdentity: "finance@fastlease.ae",
    loginPreset: {
      label: "Финансы",
      identity: "finance@fastlease.ae",
    },
  },
  {
    role: "SUPPORT",
    label: "Support",
    description: "Поддержка покупателей и сопровождение сделок.",
    homePath: "/support/dashboard",
    priority: 3,
    defaultIdentity: "support@fastlease.ae",
    loginPreset: {
      label: "Поддержка",
      identity: "support@fastlease.ae",
    },
  },
  {
    role: "TECH_SPECIALIST",
    label: "Technical Specialist",
    description: "Техническая проверка автомобиля и взаимодействие с сервисами.",
    homePath: "/tech/dashboard",
    priority: 4,
    defaultIdentity: "techspecialist@fastlease.ae",
    loginPreset: {
      label: "Технический специалист",
      identity: "techspecialist@fastlease.ae",
    },
  },
  {
    role: "INVESTOR",
    label: "Investor",
    description: "Доступ к портфелю, KPI и отчётам по инвестициям.",
    homePath: "/investor/dashboard",
    priority: 5,
    defaultIdentity: "investor@fastlease.ae",
    loginPreset: {
      label: "Инвестор",
      identity: "investor@fastlease.ae",
    },
  },
  {
    role: "CLIENT",
    label: "Client",
    description: "Покупательский кабинет, платежи и документы по лизингу.",
    homePath: "/client/dashboard",
    priority: 6,
    defaultIdentity: "client@fastlease.ae",
    defaultPhone: "+971500000000",
    loginPreset: {
      label: "Покупатель",
      identity: "client@fastlease.ae",
    },
  },
  {
    role: "RISK_MANAGER",
    label: "Risk Manager",
    description: "Оценка кредитного риска и скоринг покупателей.",
    homePath: "/risk/dashboard",
    priority: 7,
  },
  {
    role: "LEGAL",
    label: "Legal",
    description: "Юридическое сопровождение сделок и договоров.",
    homePath: "/legal/dashboard",
    priority: 8,
  },
  {
    role: "ACCOUNTING",
    label: "Accounting",
    description: "Пост-учёт и контроль финансовых документов.",
    homePath: "/accounting/dashboard",
    priority: 9,
  },
  {
    role: "SELLER",
    label: "Seller",
    description: "Продавец автомобилей и партнер.",
    homePath: "/seller/dashboard",
    priority: 10,
  },
  {
    role: "BROKER",
    label: "Broker",
    description: "Брокер и агент.",
    homePath: "/ops/brokers",
    priority: 11,
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
