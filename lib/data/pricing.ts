export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  priceAED: number;
  termMonths: number;
  downPaymentPercent: number;
  includes: string[];
  recommended?: boolean;
};

export type PricingComparisonRow = {
  label: string;
  foundation: boolean;
  growth: boolean;
  enterprise: boolean;
};

export type PricingFaq = {
  question: string;
  answer: string;
};

export const pricingPlans: PricingPlan[] = [
  {
    id: "foundation",
    name: "Foundation",
    description:
      "Perfect for clients leasing a vehicle for the first time. Supports basic service package and transparent buy-out.",
    priceAED: 1750,
    termMonths: 36,
    downPaymentPercent: 15,
    includes: [
      "5/2 support, SLA 6 hours",
      "Basic telematics and insurance",
      "Quarterly technical inspection",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    description:
      "For growing families and small businesses. Additional insurance, services and flexible buyout terms.",
    priceAED: 3200,
    termMonths: 48,
    downPaymentPercent: 12,
    includes: [
      "7/7 support, SLA 3 hours",
      "Extended telematics and comprehensive insurance",
      "Replacement vehicle during service works",
      "Vehicle replacement option at 24 months",
    ],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "Corporate fleet with personal manager, insurance and Fast Lease Premium services.",
    priceAED: 5600,
    termMonths: 60,
    downPaymentPercent: 10,
    includes: [
      "24/7 dedicated concierge, SLA 1 hour",
      "Full insurance package + extended GAP",
      "Maintenance and winter tire storage",
      "Monthly TCO and telematics report",
      "Driver services included (8 hours / month)",
    ],
  },
];

export const pricingComparison: PricingComparisonRow[] = [
  {
    label: "Online application submission",
    foundation: true,
    growth: true,
    enterprise: true,
  },
  {
    label: "Telematics and monitoring",
    foundation: true,
    growth: true,
    enterprise: true,
  },
  {
    label: "Replacement vehicle",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Concierge and dedicated manager",
    foundation: false,
    growth: false,
    enterprise: true,
  },
  {
    label: "Anti-theft package and Smart insurance",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Monthly operation report",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Buy-out discount after 24 months",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Mid-term vehicle replacement option",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Access to corporate Fast Fuel rate",
    foundation: false,
    growth: true,
    enterprise: true,
  },
  {
    label: "Financial audit and TCO reports",
    foundation: false,
    growth: false,
    enterprise: true,
  },
];

export const pricingFaqs: PricingFaq[] = [
  {
    question: "How is the monthly payment calculated?",
    answer:
      "Payment is formed from vehicle cost, selected term, insurance and services. You can fix the rate for the entire contract period.",
  },
  {
    question: "Can I buy out the vehicle early?",
    answer:
      "Yes. Growth and Enterprise plans include discounts for early buyout after 24 months. Foundation plan has standard buy-out terms.",
  },
  {
    question: "What is included in insurance and maintenance?",
    answer:
      "Basic plan covers third-party liability and service every 10,000 km. Higher plans include comprehensive insurance, extended GAP and replacement vehicle.",
  },
  {
    question: "What documents are needed for application?",
    answer:
      "Passport, driving license, proof of income and residency. For companies — registration documents and financial statements.",
  },
  {
    question: "Can I change the plan during the contract?",
    answer:
      "Yes. We can review the plan when needs change. Submit a request to support, and manager will suggest optimal terms.",
  },
];
