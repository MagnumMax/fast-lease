// Admin BPM (Business Process Management) Data Module
export type AdminProcessStatus = "active" | "inactive" | "draft" | "archived";

export type AdminProcessRecord = {
  id: string;
  name: string;
  code: string;
  version: string;
  status: AdminProcessStatus;
  description: string;
  owner: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminProcessVersion = {
  id: string;
  processId: string;
  version: string;
  status: "current" | "previous" | "deprecated";
  changes: string[];
  note: string;
  effectiveDate: string;
  createdAt: string;
};

// Fallback data for development
export const ADMIN_PROCESSES_FALLBACK: AdminProcessRecord[] = [
  {
    id: "process-1",
    name: "Fast Lease Workflow",
    code: "FL-WORKFLOW-001",
    version: "1.0.0",
    status: "active",
    description: "Основной бизнес-процесс лизинга автомобилей",
    owner: "admin",
    tags: ["core", "leasing"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const ADMIN_PROCESS_VERSIONS_FALLBACK: AdminProcessVersion[] = [
  {
    id: "version-1",
    processId: "process-1",
    version: "1.0.0",
    status: "current",
    changes: ["Первоначальный релиз"],
    note: "Базовая версия процесса",
    effectiveDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];