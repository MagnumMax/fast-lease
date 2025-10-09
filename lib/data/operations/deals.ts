export type OpsDealStatusKey =
  | "applications"
  | "documents"
  | "handover"
  | "active";

export type OpsDealSummary = {
  id: string;
  dealId: string;
  client: string;
  vehicle: string;
  updatedAt: string;
  stage: string;
  statusKey: OpsDealStatusKey;
};

export const OPS_DEALS: OpsDealSummary[] = [
  {
    id: "deal-app-2218",
    dealId: "APP-2218",
    client: "Anton Schneider",
    vehicle: "Rolls-Royce Ghost",
    updatedAt: "2025-01-21",
    stage: "Document verification",
    statusKey: "applications",
  },
  {
    id: "deal-app-2234",
    dealId: "APP-2234",
    client: "Eugenia Rossi",
    vehicle: "Bentley Bentayga",
    updatedAt: "2025-01-20",
    stage: "AI credit scoring",
    statusKey: "applications",
  },
  {
    id: "deal-app-2199",
    dealId: "APP-2199",
    client: "Nicolas Blanc",
    vehicle: "Rolls-Royce Cullinan",
    updatedAt: "2025-01-19",
    stage: "Awaiting Emirates ID",
    statusKey: "documents",
  },
  {
    id: "deal-app-2201",
    dealId: "APP-2201",
    client: "Maria Novak",
    vehicle: "Ferrari 488 Spider",
    updatedAt: "2025-01-19",
    stage: "Legal review",
    statusKey: "documents",
  },
  {
    id: "deal-fl-2042",
    dealId: "FL-2042",
    client: "Maxime Dupont",
    vehicle: "Bentley Continental GT",
    updatedAt: "2025-01-18",
    stage: "Delivery acceptance signing",
    statusKey: "handover",
  },
  {
    id: "deal-fl-2043",
    dealId: "FL-2043",
    client: "Sofia Rossi",
    vehicle: "Lamborghini Huracan",
    updatedAt: "2025-01-18",
    stage: "Vehicle preparation",
    statusKey: "handover",
  },
  {
    id: "deal-fl-1042",
    dealId: "FL-1042",
    client: "Jan Kowalski",
    vehicle: "Rolls-Royce Cullinan",
    updatedAt: "2025-01-17",
    stage: "Active",
    statusKey: "active",
  },
  {
    id: "deal-fl-1043",
    dealId: "FL-1043",
    client: "Anna Müller",
    vehicle: "Rolls-Royce Ghost",
    updatedAt: "2025-01-16",
    stage: "Active",
    statusKey: "active",
  },
];

export type OpsDealTimelineEvent = {
  id: string;
  timestamp: string;
  text: string;
  icon: string;
};

export const OPS_DEAL_TIMELINE: OpsDealTimelineEvent[] = [
  {
    id: "timeline-1",
    timestamp: "2025-01-14 12:05",
    text: "Vehicle handover scheduled for 15.01 18:00",
    icon: "calendar-check",
  },
  {
    id: "timeline-2",
    timestamp: "2025-01-14 11:22",
    text: "Agreement signed by client via digital signature",
    icon: "file-check",
  },
  {
    id: "timeline-3",
    timestamp: "2025-01-14 10:19",
    text: "AI confirmed Emirates ID and income",
    icon: "sparkles",
  },
  {
    id: "timeline-4",
    timestamp: "2025-01-14 10:00",
    text: "Application created by operator Maria T.",
    icon: "user-plus",
  },
];

export type OpsDealDocument = {
  id: string;
  title: string;
  status: string;
};

export const OPS_DEAL_DOCUMENTS: OpsDealDocument[] = [
  { id: "lease-agreement", title: "Leasing Agreement", status: "Signed · updated 14 Jan 2025 11:22" },
  { id: "eu-passport", title: "EU Passport", status: "AI check passed · updated 14 Jan 2025 10:19" },
  { id: "income-statement", title: "Income Statement", status: "Requires update · updated 13 Jan 2025 09:55" },
  { id: "payment-schedule", title: "Payment schedule (update)", status: "Version 02/2025" },
  { id: "delivery-form", title: "Delivery acceptance form", status: "Signature pending" },
  { id: "registration", title: "Registration Certificate (Mulkiya)", status: "Valid until 12.12.2025" },
  { id: "insurance", title: "Insurance Policy", status: "Version 2025" },
  { id: "inspection", title: "Inspection Protocol", status: "Passed 01.2025" },
  { id: "vehicle-rules", title: "Vehicle Usage Rules", status: "Current" },
];

export type OpsDealProfile = {
  dealId: string;
  vehicleName: string;
  status: string;
  description: string;
  image: string;
  monthlyPayment: string;
  nextPayment: string;
  dueAmount: string;
};

export const OPS_DEAL_PROFILE: OpsDealProfile = {
  dealId: "FL-2042",
  vehicleName: "Bentley Continental GT",
  status: "Act Signing",
  description: "Client — Maxime Dupont. Created — January 14, 2025.",
  image: "/assets/bentley-bw.jpg",
  monthlyPayment: "AED 4,200",
  nextPayment: "15 Feb 2025",
  dueAmount: "AED 18,000",
};

export type OpsDealKeyInfoEntry = {
  label: string;
  value: string;
};

export const OPS_DEAL_KEY_INFO: OpsDealKeyInfoEntry[] = [
  { label: "VIN", value: "R1T-2204" },
  { label: "Program Term", value: "36 months" },
  { label: "Issue Date", value: "14.01.2025" },
  { label: "Mileage", value: "18 400 km" },
  { label: "Last Service", value: "12.01.2025" },
  { label: "Odoo Card", value: "Open Card" },
];

export type OpsDealDetailsEntry = {
  label: string;
  value: string;
};

export const OPS_DEAL_DETAILS: OpsDealDetailsEntry[] = [
  { label: "Source", value: "Renty website" },
  { label: "Created at", value: "14 Jan 2025 · 10:00" },
  { label: "Created by", value: "Operator Maria T." },
  { label: "Last status update", value: "14 Jan 2025 · 12:05" },
  { label: "Listing reference", value: "DL-7801-FL2042" },
  { label: "Lead priority", value: "High" },
];

export type OpsDealInvoice = {
  id: string;
  invoiceNumber: string;
  type: string;
  totalAmount: string;
  dueDate: string;
  status: string;
};

export const OPS_DEAL_INVOICES: OpsDealInvoice[] = [
  {
    id: "INV-2025-0001",
    invoiceNumber: "INV-2025-0001",
    type: "Monthly payment",
    totalAmount: "AED 31,500",
    dueDate: "Due · 12 Feb 2025",
    status: "Overdue",
  },
  {
    id: "INV-2025-0002",
    invoiceNumber: "INV-2025-0002",
    type: "Monthly payment",
    totalAmount: "AED 31,500",
    dueDate: "Due · 12 Mar 2025",
    status: "Pending",
  },
];

export type OpsDealClientProfile = {
  name: string;
  phone: string;
  email: string;
  scoring: string;
  notes: string;
};

export const OPS_DEAL_CLIENT: OpsDealClientProfile = {
  name: "Maxime Dupont",
  phone: "+7 999 123-45-67",
  email: "maxime.dupont@fastlease.io",
  scoring: "92/100",
  notes: "The client has a completed deal from 2023. No delinquencies recorded.",
};
