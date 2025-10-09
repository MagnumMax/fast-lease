export type OpsClientRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "Active" | "Blocked";
  scoring: string;
  overdue: number;
  limit: string;
  detailHref: string;
};

export const OPS_CLIENTS: OpsClientRecord[] = [
  {
    id: "CL-0101",
    name: "Isabella Marino",
    email: "isabella.marino@fastlease.io",
    phone: "+39 340 555 0101",
    status: "Active",
    scoring: "89/100",
    overdue: 0,
    limit: "AED 360,000",
    detailHref: "/ops/clients/isabella-marino",
  },
  {
    id: "CL-0102",
    name: "Sofia Rossi",
    email: "sofia.rossi@fastlease.io",
    phone: "+39 340 555 0102",
    status: "Active",
    scoring: "88/100",
    overdue: 1,
    limit: "AED 320,000",
    detailHref: "/ops/clients/sofia-rossi",
  },
  {
    id: "CL-0103",
    name: "Jan Kowalski",
    email: "jan.kowalski@fastlease.io",
    phone: "+48 600 700 103",
    status: "Blocked",
    scoring: "61/100",
    overdue: 3,
    limit: "AED 150,000",
    detailHref: "/ops/clients/jan-kowalski",
  },
  {
    id: "CL-0104",
    name: "Michael Adams",
    email: "michael.adams@fastlease.io",
    phone: "+44 7700 900104",
    status: "Active",
    scoring: "92/100",
    overdue: 0,
    limit: "AED 440,000",
    detailHref: "/ops/clients/client-104",
  },
  {
    id: "CL-0105",
    name: "Emma Brown",
    email: "emma.brown@fastlease.io",
    phone: "+44 7700 900105",
    status: "Active",
    scoring: "87/100",
    overdue: 0,
    limit: "AED 350,000",
    detailHref: "/ops/clients/emma-brown",
  },
  {
    id: "CL-0106",
    name: "John Peterson",
    email: "john.peterson@fastlease.io",
    phone: "+44 7700 900106",
    status: "Active",
    scoring: "95/100",
    overdue: 0,
    limit: "AED 500,000",
    detailHref: "/ops/clients/john-peterson",
  },
  {
    id: "CL-0107",
    name: "Olivia Johnson",
    email: "olivia.johnson@fastlease.io",
    phone: "+44 7700 900107",
    status: "Active",
    scoring: "90/100",
    overdue: 0,
    limit: "AED 400,000",
    detailHref: "/ops/clients/olivia-johnson",
  },
  {
    id: "CL-0108",
    name: "Daniel Cooper",
    email: "daniel.cooper@fastlease.io",
    phone: "+44 7700 900108",
    status: "Active",
    scoring: "85/100",
    overdue: 2,
    limit: "AED 300,000",
    detailHref: "/ops/clients/daniel-cooper",
  },
];

export type OpsClientDeal = {
  id: string;
  dealId: string;
  vehicle: string;
  status: string;
  updatedAt: string;
};

export const OPS_CLIENT_DEALS: OpsClientDeal[] = [
  {
    id: "deal-fl-2042",
    dealId: "FL-2042",
    vehicle: "Bentley Continental GT",
    status: "Handover",
    updatedAt: "2025-01-14",
  },
  {
    id: "deal-fl-1042",
    dealId: "FL-1042",
    vehicle: "Rolls-Royce Cullinan",
    status: "Active",
    updatedAt: "2025-01-08",
  },
  {
    id: "deal-fl-8201",
    dealId: "FL-8201",
    vehicle: "Bentley Bentayga",
    status: "Completed",
    updatedAt: "2024-09-12",
  },
];

export type OpsClientDocument = {
  id: string;
  name: string;
  status: string;
  icon: string;
};

export const OPS_CLIENT_DOCUMENTS: OpsClientDocument[] = [
  { id: "passport", name: "EU Passport", status: "Valid until 2032", icon: "id-card" },
  { id: "tax", name: "Tax Declaration 2024 (EU)", status: "Verified", icon: "file-text" },
  { id: "rental", name: "Rental Agreement", status: "Expires in 30 days", icon: "file-warning" },
];

export type OpsClientProfile = {
  fullName: string;
  clientId: string;
  program: string;
  memberSince: string;
  email: string;
  phone: string;
  address: string;
  passport: string;
  metrics: {
    scoring: string;
    overdue: string;
    limit: string;
  };
};

export const OPS_CLIENT_PROFILE: OpsClientProfile = {
  fullName: "Michael Adams",
  clientId: "CL-0104",
  program: "Lease-to-own program",
  memberSince: "2023",
  email: "michael.adams@fastlease.io",
  phone: "+44 7700 900104",
  address: "London, 221B Baker Street",
  passport: "GBR 123456789",
  metrics: {
    scoring: "92/100",
    overdue: "0",
    limit: "AED 440 000",
  },
};
