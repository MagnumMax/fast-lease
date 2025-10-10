export type ResidencyStatus = "resident" | "nonresident";

export type ApplicationStep = {
  id: "start" | "profile" | "documents" | "summary" | "status";
  title: string;
  description: string;
};

export type ApplicationDocumentDefinition = {
  id: string;
  title: string;
  description: string;
  optional?: boolean;
};

export const applicationSteps: ApplicationStep[] = [
  {
    id: "start",
    title: "Preferences",
    description: "Select vehicle and buyout terms",
  },
  {
    id: "profile",
    title: "Profile",
    description: "Personal data and contacts",
  },
  {
    id: "documents",
    title: "Documents",
    description: "Upload copies for verification",
  },
  {
    id: "summary",
    title: "Confirmation",
    description: "Review data before submission",
  },
  {
    id: "status",
    title: "Status",
    description: "Track application progress",
  },
];

export const applicationDocuments: Record<
  ResidencyStatus,
  ApplicationDocumentDefinition[]
> = {
  resident: [
    {
      id: "passport",
      title: "Passport (photo and registration pages)",
      description: "Color file, PDF or JPG format, size up to 10 MB.",
    },
    {
      id: "eid",
      title: "Emirates ID (both sides)",
      description: "Photo or high-resolution scan.",
    },
    {
      id: "license",
      title: "UAE Driving License",
      description: "We verify minimum 12 months experience.",
    },
    {
      id: "salary_certificate",
      title: "Income certificate or employer letter",
      description: "Must be issued no later than 30 days ago.",
    },
    {
      id: "bank_statements",
      title: "Bank statement for 3 months",
      description: "PDF format, multiple files can be uploaded.",
      optional: true,
    },
  ],
  nonresident: [
    {
      id: "passport",
      title: "International Passport",
      description: "Color copy, page with photo and signature.",
    },
    {
      id: "visa",
      title: "Resident visa or entry stamp",
      description: "If visa is in process, attach confirmation.",
    },
    {
      id: "license",
      title: "Driving license from your country",
      description: "Attach international license if necessary.",
    },
    {
      id: "proof_of_income",
      title: "Proof of income",
      description: "Work certificate, tax return or contract.",
    },
    {
      id: "uae_contact",
      title: "UAE contact person",
      description: "Name, phone and address of resident who can confirm data.",
      optional: true,
    },
  ],
};
