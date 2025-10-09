export type InvestorPortfolioAssetRecord = {
  id: string;
  assetCode: string;
  vin: string;
  vehicleMake: string;
  vehicleModel: string;
  status: "in_operation" | "pending_delivery" | "attention_required" | "under_review";
  irrPercent: number;
  lastPayoutAmount: number;
  lastPayoutCurrency: string;
  lastPayoutDate: string | null;
  href: string | null;
};

export const INVESTOR_PORTFOLIO_FALLBACK: InvestorPortfolioAssetRecord[] = [
  {
    id: "asset-1",
    assetCode: "R1T-2204",
    vin: "R1T-2204",
    vehicleMake: "Bentley",
    vehicleModel: "Continental GT",
    status: "in_operation",
    irrPercent: 0.104,
    lastPayoutAmount: 4400,
    lastPayoutCurrency: "AED",
    lastPayoutDate: new Date().toISOString(),
    href: "/investor/assets/asset-001",
  },
  {
    id: "asset-2",
    assetCode: "AAX-341",
    vin: "AAX-341",
    vehicleMake: "Rolls-Royce",
    vehicleModel: "Cullinan",
    status: "pending_delivery",
    irrPercent: 0.089,
    lastPayoutAmount: 3080,
    lastPayoutCurrency: "AED",
    lastPayoutDate: new Date().toISOString(),
    href: "/investor/assets/asset-002",
  },
  {
    id: "asset-3",
    assetCode: "BMW-I4-88",
    vin: "BMW-I4-88",
    vehicleMake: "Ferrari",
    vehicleModel: "488 Spider",
    status: "in_operation",
    irrPercent: 0.096,
    lastPayoutAmount: 2680,
    lastPayoutCurrency: "AED",
    lastPayoutDate: new Date().toISOString(),
    href: "/investor/assets/asset-003",
  },
  {
    id: "asset-4",
    assetCode: "TES-3P-04",
    vin: "TES-3P-04",
    vehicleMake: "Lamborghini",
    vehicleModel: "Huracan",
    status: "attention_required",
    irrPercent: 0.078,
    lastPayoutAmount: 2530,
    lastPayoutCurrency: "AED",
    lastPayoutDate: new Date().toISOString(),
    href: "/investor/assets/asset-004",
  },
  {
    id: "asset-5",
    assetCode: "VOL-XC40-12",
    vin: "VOL-XC40-12",
    vehicleMake: "Bentley",
    vehicleModel: "Bentayga",
    status: "in_operation",
    irrPercent: 0.091,
    lastPayoutAmount: 2170,
    lastPayoutCurrency: "AED",
    lastPayoutDate: new Date().toISOString(),
    href: "/investor/assets/asset-005",
  },
];
