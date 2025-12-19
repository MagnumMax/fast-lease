
import { calculateCommercialOffer } from "../lib/commercial-offer-calculations";

const priceVat = 144300;
const downPaymentTotal = 28860;
const termMonths = 36;
const interestRateAnnual = 20; // Example rate
const insuranceRateAnnual = 4; // Example rate

console.log("--- Testing Standard Calculation ---");
const standardResult = calculateCommercialOffer({
  priceVat,
  downPaymentAmount: downPaymentTotal,
  downPaymentSource: "amount",
  termMonths,
  interestRateAnnual,
  insuranceRateAnnual,
  method: "standard",
});
console.log(`Principal: ${standardResult.financedAmount}`);
console.log(`Monthly Payment: ${standardResult.monthlyPayment}`);

console.log("\n--- Testing Inclusive VAT (Excel) Calculation ---");
const excelResult = calculateCommercialOffer({
  priceVat,
  downPaymentAmount: downPaymentTotal,
  downPaymentSource: "amount",
  termMonths,
  interestRateAnnual,
  insuranceRateAnnual,
  method: "inclusive_vat",
});
console.log(`Principal: ${excelResult.financedAmount}`);
console.log(`Monthly Payment: ${excelResult.monthlyPayment}`);

const expectedStandardPrincipal = priceVat - downPaymentTotal;
const expectedExcelPrincipal = priceVat - (downPaymentTotal / 1.05);

console.log("\n--- Verification ---");
console.log(`Standard Principal Matches: ${Math.abs(standardResult.financedAmount - expectedStandardPrincipal) < 0.01}`);
console.log(`Excel Principal Matches: ${Math.abs(excelResult.financedAmount - expectedExcelPrincipal) < 0.01}`);
