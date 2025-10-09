export type AdminProcessStatus = "active" | "draft" | "archived";

export type AdminProcessRecord = {
  id: string;
  code: string;
  name: string;
  status: AdminProcessStatus;
  version: string;
  updatedAt: string;
  owner: string;
  tags: string[];
};

export type AdminProcessVersion = {
  id: string;
  processId: string;
  version: string;
  note: string;
  createdAt: string;
};

export const ADMIN_PROCESSES_FALLBACK: AdminProcessRecord[] = [
  {
    id: "fallback-process-lease-application",
    code: "BPM-01",
    name: "Lease Application",
    status: "active",
    version: "v2.4",
    updatedAt: "2025-01-12T09:15:00+04:00",
    owner: "Automation Team",
    tags: ["applications", "scoring", "compliance"],
  },
  {
    id: "fallback-process-document-verification",
    code: "BPM-02",
    name: "Document Verification",
    status: "draft",
    version: "v1.1",
    updatedAt: "2025-01-10T13:45:00+04:00",
    owner: "Compliance",
    tags: ["documents", "compliance"],
  },
  {
    id: "fallback-process-contract-signing",
    code: "BPM-03",
    name: "Contract Signing",
    status: "active",
    version: "v3.0",
    updatedAt: "2025-01-08T17:30:00+04:00",
    owner: "Legal",
    tags: ["contracts", "delivery"],
  },
];

export const ADMIN_PROCESS_VERSIONS_FALLBACK: AdminProcessVersion[] = [
  {
    id: "fallback-version-lease-application-v24",
    processId: "fallback-process-lease-application",
    version: "v2.4",
    note: "Added AI document scoring step",
    createdAt: "2025-01-12T10:00:00+04:00",
  },
  {
    id: "fallback-version-lease-application-v23",
    processId: "fallback-process-lease-application",
    version: "v2.3",
    note: "Reduced contract signing time",
    createdAt: "2024-12-04T14:20:00+04:00",
  },
  {
    id: "fallback-version-lease-application-v22",
    processId: "fallback-process-lease-application",
    version: "v2.2",
    note: "Telematics integration",
    createdAt: "2024-10-22T11:30:00+04:00",
  },
];
