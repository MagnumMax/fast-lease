export type OpsTaskStatus = "new" | "in-progress" | "done" | "cancelled";

export type OpsTaskPriority = "high" | "normal";

export type OpsTaskSource = "Manual" | "AI" | "Auto" | "Finance" | "System";

export type OpsTask = {
  id: string;
  title: string;
  owner: string;
  due: string;
  priority: OpsTaskPriority;
  source: OpsTaskSource;
  status: OpsTaskStatus;
  description?: string;
  createdBy: "user" | "system" | "ai";
};

export const OPS_TASKS: OpsTask[] = [
  {
    id: "1",
    title: "Call back client APP-2218",
    owner: "Maria",
    due: "Today · 15:30",
    priority: "high",
    source: "Manual",
    status: "new",
    description: "Confirm submitted Emirates ID and schedule onboarding call.",
    createdBy: "user",
  },
  {
    id: "2",
    title: "Check VIN in Odoo (Rolls-Royce Cullinan)",
    owner: "Roman",
    due: "Today · 17:00",
    priority: "normal",
    source: "AI",
    status: "in-progress",
    description: "VIN mismatch flagged by Aurora Telematics check.",
    createdBy: "ai",
  },
  {
    id: "3",
    title: "Upload acceptance certificate from service",
    owner: "Anna",
    due: "Tomorrow · 11:00",
    priority: "normal",
    source: "Auto",
    status: "in-progress",
    description: "Attach signed service acceptance certificate to deal FL-2042.",
    createdBy: "system",
  },
  {
    id: "4",
    title: "Confirm payment INV-2025-012",
    owner: "Maria",
    due: "Tomorrow · 14:00",
    priority: "high",
    source: "Finance",
    status: "done",
    description: "Payment posted via Network International, verify in ledger.",
    createdBy: "system",
  },
  {
    id: "5",
    title: "Send documents to bank",
    owner: "Roman",
    due: "Friday · 10:00",
    priority: "normal",
    source: "Manual",
    status: "new",
    description: "Forward notarized docs to Mashreq relationship manager.",
    createdBy: "user",
  },
  {
    id: "6",
    title: "Update insurance information",
    owner: "Anna",
    due: "Next Monday · 12:00",
    priority: "normal",
    source: "Auto",
    status: "cancelled",
    description: "Carrier provided updated policy, upload new version.",
    createdBy: "system",
  },
];
