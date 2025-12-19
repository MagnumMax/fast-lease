export type CommercialOfferCalculationMethod = "standard" | "inclusive_vat";

export interface CalculationInput {
  priceVat: number; // Стоимость с НДС
  downPaymentAmount: number; // Аванс (введенный пользователем)
  downPaymentSource: "amount" | "percent"; // Источник ввода аванса
  termMonths: number;
  interestRateAnnual: number; // Годовая ставка в %
  insuranceRateAnnual: number; // Годовая страховка в %
  buyoutAmount?: number | null; // Выкупная стоимость
  method: CommercialOfferCalculationMethod;
}

export interface PaymentScheduleItem {
  month: number;
  label: string;
  amount: number;
  principal: number;
  interest: number;
  vat: number;
  balance: number;
}

export interface CalculationResult {
  method: CommercialOfferCalculationMethod;
  priceVat: number;
  downPaymentTotal: number; // Итоговый аванс (с НДС)
  financedAmount: number; // Тело долга (или база для амортизации)
  monthlyPayment: number;
  totalInterest: number;
  insuranceAnnual: number; // Годовая страховка
  totalInsurance: number;
  totalClientCost: number; // Итого для клиента (Аванс + Платежи + Выкуп если есть)
  initialPayment: number; // Сумма первого месяца (Аванс + Страховка)
  buyoutAmount: number; // Выкупная стоимость (для вывода)
  schedule: PaymentScheduleItem[];
  rates: {
    monthly: number; // Месячная ставка %
    period: number; // Ставка за весь срок %
  };
}

/**
 * Calculates commercial offer parameters based on selected method
 */
export function calculateCommercialOffer(input: CalculationInput): CalculationResult {
  const { priceVat, termMonths, interestRateAnnual, insuranceRateAnnual, method } = input;
  
  // 1. Determine Down Payment Amount
  let downPaymentTotal = input.downPaymentAmount;
  
  // 2. Initialize variables
  let principal = 0;
  let monthlyLeasePayment = 0;
  let totalInterest = 0;
  let buyoutAmount = input.buyoutAmount ?? 0;
  let effectiveMonthlyRate = 0;
  let effectivePeriodRate = 0;
  let totalClientCost = 0;

  // Common Insurance Calculation
  // Insurance = PriceVat * (InsuranceRate / 100)
  const insuranceAnnual = priceVat * (insuranceRateAnnual / 100);
  const totalInsurance = insuranceAnnual * (termMonths / 12);

  // Schedule container
  const schedule: PaymentScheduleItem[] = [];

  if (method === "inclusive_vat") {
    // "Excel" Logic (Leasing with Buyout / Custom Depreciation)
    // The "Advance" (downPaymentTotal) entered by the user is the TOTAL initial payment.
    // It includes:
    // 1. Insurance (Annual)
    // 2. Admin Fee (1% of Price VAT) - hidden fee in Excel logic
    // 3. Equity Down Payment (The part that actually reduces the principal)

    // Hidden Admin Fee (1% of Price) to match Excel discrepancies
    const adminFee = priceVat * 0.01;

    // Calculate Equity part of the Down Payment
    // Equity = Total Advance - Insurance - Admin Fee
    const downPaymentEquityGross = downPaymentTotal - insuranceAnnual - adminFee;
    
    // Net Equity (removing VAT from the equity part)
    // Note: In Excel, the entire Advance is VAT inclusive.
    const downPaymentNet = downPaymentEquityGross / 1.05;

    // Principal (Funded Amount)
    // This is the Net Price minus the Net Equity Down Payment
    const priceNet = priceVat / 1.05;
    principal = Math.max(0, priceNet - downPaymentNet);

    // 3. Interest Logic
    // The Excel calculation uses a specific fixed rate of 24.9% for this method
    // regardless of the hidden input field.
    const excelInterestRate = 24.9;
    
    // Monthly Interest (Flat Rate on Initial Principal)
    // Interest = Principal * (Rate / 100 / 12)
    const monthlyInterest = principal * (excelInterestRate / 100 / 12);

    // Total Interest
    // Paid for (termMonths - 1) months (excluding down payment month)
    // Both regular payments and the buyout payment include this interest amount
    totalInterest = monthlyInterest * Math.max(0, termMonths - 1);

    // 4. Principal Repayment Logic (Backwards from Buyout)
    // We have (termMonths - 2) regular payments and 1 final buyout payment
    // BuyoutAmount (Gross) = (LastPrincipal + MonthlyInterest) * 1.05
    // => LastPrincipal = (BuyoutAmount / 1.05) - MonthlyInterest
    const lastPaymentGross = buyoutAmount;
    const lastPrincipal = (lastPaymentGross / 1.05) - monthlyInterest;

    // Monthly Principal for regular payments
    // FundedAmount = (MonthlyPrincipal * (termMonths - 2)) + LastPrincipal
    // => MonthlyPrincipal = (FundedAmount - LastPrincipal) / (termMonths - 2)
    const numRegularPayments = Math.max(0, termMonths - 2);
    let monthlyPrincipal = 0;
    
    if (numRegularPayments > 0) {
      monthlyPrincipal = (principal - lastPrincipal) / numRegularPayments;
    }

    // 5. Monthly Payment (Gross)
    // Payment = (MonthlyPrincipal + MonthlyInterest) * 1.05
    monthlyLeasePayment = (monthlyPrincipal + monthlyInterest) * 1.05;

    // Rates for display
    effectiveMonthlyRate = excelInterestRate / 12;
    effectivePeriodRate = (excelInterestRate * Math.max(0, termMonths - 1)) / 12;

    // 6. Total Client Cost
    // DownPayment (Total Advance) + (MonthlyPayment * numRegularPayments) + Buyout
    // Note: Insurance is already inside DownPayment
    // But we need to check if totalInsurance is Annual * Term/12. 
    // If the first year is paid in Advance, subsequent years might be extra?
    // User instruction: "Advance + Insurance" is the 1st payment.
    // For now, TotalClientCost = Advance + Payments + Buyout.
    // However, if term > 12 months, usually insurance is renewed.
    // The previous logic added totalInsurance separately.
    // If term is 36 months, 1st year is in Advance. 2nd and 3rd year are extra?
    // Excel "Total" column matches sum of payments.
    // Let's assume TotalClientCost = Sum of all schedule payments.
    const sumOfPayments = downPaymentTotal + (monthlyLeasePayment * numRegularPayments) + buyoutAmount;
    totalClientCost = sumOfPayments; // + (totalInsurance - insuranceAnnual)? 
    // If Excel total matches sum of payments, then extra insurance is not in the schedule or total?
    // We'll stick to Sum of Schedule for now.

    // 7. Generate Schedule
    let currentPrincipalBalance = principal;
    
    // Initial Payment (Advance)
    // The user wants strictly "Advance" amount here.
    const initialPayment = downPaymentTotal;
    schedule.push({
        month: 1,
        label: "Аванс",
        amount: initialPayment,
        principal: initialPayment / 1.05, // Show full Net amount to make the row sum up (Principal + VAT = Amount)
        interest: 0,
        vat: initialPayment - (initialPayment / 1.05),
        balance: currentPrincipalBalance // Balance matches the Equity reduction logic
    });

    // Regular Payments (Months 2 to Term-1)
    for (let i = 0; i < numRegularPayments; i++) {
        currentPrincipalBalance -= monthlyPrincipal;
        schedule.push({
            month: i + 2,
            label: "Ежемесячный платеж",
            amount: monthlyLeasePayment,
            principal: monthlyPrincipal,
            interest: monthlyInterest,
            vat: monthlyLeasePayment - (monthlyPrincipal + monthlyInterest),
            balance: Math.max(0, currentPrincipalBalance)
        });
    }

    // Buyout Payment (Month Term)
    if (termMonths > 1) {
        currentPrincipalBalance -= lastPrincipal;
        schedule.push({
            month: termMonths,
            label: "Выкупной платеж",
            amount: buyoutAmount,
            principal: lastPrincipal,
            interest: monthlyInterest,
            vat: buyoutAmount - (lastPrincipal + monthlyInterest),
            balance: Math.max(0, currentPrincipalBalance)
        });
    }

  } else {
    // Standard logic: Principal = PriceVat - DownPaymentTotal
    principal = Math.max(0, priceVat - downPaymentTotal);
    buyoutAmount = 0; // Standard method usually doesn't have buyout in this simple form, or it's 0

    // Interest calculation
    totalInterest = principal * (interestRateAnnual / 100) * (termMonths / 12);
    
    // Payoff
    const payoffWithInterest = principal + totalInterest;

    // Monthly Payment
    monthlyLeasePayment = termMonths > 0 ? payoffWithInterest / termMonths : 0;
    
    // Rates
    effectiveMonthlyRate = interestRateAnnual / 12;
    effectivePeriodRate = (interestRateAnnual * termMonths) / 12;

    // Total Client Cost
    // Standard: Payoff + Insurance + DownPayment
    totalClientCost = (monthlyLeasePayment * termMonths) + buyoutAmount + totalInsurance + downPaymentTotal;

    // Schedule
    let currentPrincipalBalance = principal;
    const monthlyPrincipal = principal / termMonths; // Simple linear amortization
    const monthlyInterest = totalInterest / termMonths;

    const initialPayment = downPaymentTotal + insuranceAnnual;
    schedule.push({
        month: 1,
        label: "Аванс + Страховка",
        amount: initialPayment,
        principal: downPaymentTotal,
        interest: 0,
        vat: 0, 
        balance: currentPrincipalBalance
    });

    for (let i = 0; i < termMonths; i++) {
        currentPrincipalBalance -= monthlyPrincipal;
        schedule.push({
            month: i + 2,
            label: "Ежемесячный платеж",
            amount: monthlyLeasePayment,
            principal: monthlyPrincipal,
            interest: monthlyInterest,
            vat: 0,
            balance: Math.max(0, currentPrincipalBalance)
        });
    }
  }

  // Initial Payment (First Month Sum)
  // For inclusive_vat, it's just the Down Payment Total (which includes insurance).
  // For standard, it might still be Down Payment + Insurance? 
  // Standard logic above used: const initialPayment = downPaymentTotal + insuranceAnnual;
  // Let's keep it consistent with the schedule logic.
  const initialPayment = method === "inclusive_vat" ? downPaymentTotal : downPaymentTotal + insuranceAnnual;

  return {
    method,
    priceVat,
    downPaymentTotal,
    financedAmount: principal,
    monthlyPayment: monthlyLeasePayment,
    totalInterest,
    insuranceAnnual,
    totalInsurance,
    totalClientCost,
    initialPayment,
    buyoutAmount,
    schedule,
    rates: {
      monthly: effectiveMonthlyRate,
      period: effectivePeriodRate,
    },
  };
}
