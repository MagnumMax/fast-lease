// Investor Portfolio Data Module
export type InvestorPortfolioAssetRecord = {
  id: string;
  assetCode: string;
  vin: string;
  vehicleVin: string;
  vehicleMake: string;
  vehicleModel: string;
  status: "active" | "completed" | "defaulted";
  acquisitionCost: number;
  currentValue: number;
  monthlyPayment: number;
  remainingTerm: number;
  nextPaymentDate: string;
  irrPercent: number;
  lastPayoutAmount?: number;
  lastPayoutCurrency?: string;
  lastPayoutDate?: string | null;
  href?: string | null;
};

// Fallback data for development
export const INVESTOR_PORTFOLIO_FALLBACK: InvestorPortfolioAssetRecord[] = [
  {
    id: "portfolio-1",
    assetCode: "FL-ASSET-001",
    vin: "SEED-LAMBO-002",
    vehicleVin: "SEED-LAMBO-002",
    vehicleMake: "Lamborghini",
    vehicleModel: "Huracán",
    status: "active",
    acquisitionCost: 720000,
    currentValue: 680000,
    monthlyPayment: 25000,
    remainingTerm: 24,
    nextPaymentDate: "2025-02-15",
    irrPercent: 12.5,
    lastPayoutAmount: 25000,
    lastPayoutCurrency: "AED",
    lastPayoutDate: "2025-01-15",
    href: null,
  },
];