export type OpsKpiMetric = {
  id: string;
  label: string;
  value: string;
  helpText: string;
  tone?: "success" | "warning" | "danger" | "info";
};

export type OpsWatchItem = {
  id: string;
  title: string;
  description: string;
  tone: "info" | "warning" | "danger";
  href?: string;
};

export type OpsTeamLoadItem = {
  id: string;
  specialist: string;
  activeCount: number;
  overdueCount: number;
};

export type OpsBottleneckItem = {
  id: string;
  stage: string;
  average: string;
  sla: string;
  loadPercent: number;
  tone: "success" | "warning" | "danger";
};

export type OpsAutomationMetric = {
  id: string;
  label: string;
  primary: string;
  helper: string;
  tone: "muted" | "success" | "danger";
};

export const OPS_DASHBOARD_KPIS: OpsKpiMetric[] = [
  {
    id: "on-time-activations",
    label: "On-Time Activations",
    value: "92%",
    helpText: "Week target: 95%",
    tone: "success",
  },
  {
    id: "avg-time-to-activate",
    label: "Avg Time to Activate",
    value: "34h",
    helpText: "vs SLA 30h",
    tone: "warning",
  },
  {
    id: "automation-coverage",
    label: "Automation Coverage",
    value: "78%",
    helpText: "Manual review trending down",
    tone: "success",
  },
  {
    id: "backlog-gt-24h",
    label: "Backlog > 24h",
    value: "6",
    helpText: "Escalate above 10",
    tone: "danger",
  },
];

export const OPS_EXCEPTION_WATCHLIST: OpsWatchItem[] = [
  {
    id: "watch-risk-docs",
    title: "Documents for Lamborghini Huracan",
    description: "AI flagged low quality of Registration Card scan",
    tone: "warning",
    href: "/ops/tasks",
  },
  {
    id: "watch-payment-fl-2025-1042",
    title: "Client Payment FL-2025-1042",
    description: "Auto-payment postponed due to weekend",
    tone: "info",
    href: "/ops/tasks",
  },
  {
    id: "watch-insurance-upload",
    title: "Insurance upload pending",
    description: "Waiting for carrier response, SLA in 6h",
    tone: "warning",
    href: "/ops/tasks",
  },
];

export const OPS_SLA_WATCHLIST: OpsWatchItem[] = [
  {
    id: "sla-kyb",
    title: "KYB verification backlog",
    description: "9 cases idle > 24h, assign to risk team",
    tone: "danger",
  },
  {
    id: "sla-bank-payouts",
    title: "Bank payouts",
    description: "Bank of Europe delay adds +6h to activation",
    tone: "warning",
  },
  {
    id: "sla-document-qa",
    title: "Document QA sampling",
    description: "Coverage at 82%, schedule additional spot checks",
    tone: "info",
  },
];

export const OPS_TEAM_LOAD: OpsTeamLoadItem[] = [
  { id: "daria", specialist: "Daria K.", activeCount: 14, overdueCount: 1 },
  { id: "mateusz", specialist: "Mateusz L.", activeCount: 12, overdueCount: 0 },
  { id: "hannah", specialist: "Hannah S.", activeCount: 10, overdueCount: 2 },
  { id: "nikola", specialist: "Nikola R.", activeCount: 9, overdueCount: 0 },
];

export const OPS_BOTTLENECKS: OpsBottleneckItem[] = [
  {
    id: "doc-review",
    stage: "Document review",
    average: "18h",
    sla: "12h",
    loadPercent: 75,
    tone: "danger",
  },
  {
    id: "scoring",
    stage: "Scoring",
    average: "6h",
    sla: "8h",
    loadPercent: 55,
    tone: "success",
  },
  {
    id: "insurance-binding",
    stage: "Insurance binding",
    average: "22h",
    sla: "18h",
    loadPercent: 82,
    tone: "warning",
  },
];

export const OPS_AUTOMATION_METRICS: OpsAutomationMetric[] = [
  {
    id: "manual-review-rate",
    label: "Manual review rate",
    primary: "22%",
    helper: "goal < 15%",
    tone: "danger",
  },
  {
    id: "ai-doc-accuracy",
    label: "AI document accuracy",
    primary: "97.8%",
    helper: "+1.4% WoW",
    tone: "success",
  },
  {
    id: "auto-routing",
    label: "Auto-routing coverage",
    primary: "64%",
    helper: "add scoring rules for SME segment",
    tone: "muted",
  },
];
