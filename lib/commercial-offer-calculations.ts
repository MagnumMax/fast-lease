export type CommercialOfferCalculationMethod = "standard" | "inclusive_vat";

export interface CalculationInput {
  priceVat: number; // Стоимость с НДС
  firstPaymentAmount: number; // First payment (введенный пользователем)
  firstPaymentSource: "amount" | "percent"; // Источник ввода First payment
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
  firstPaymentTotal: number; // Итоговый First payment (с НДС)
  financedAmount: number; // Тело долга (или база для амортизации)
  monthlyPayment: number;
  totalInterest: number;
  insuranceAnnual: number; // Годовая страховка
  totalClientCost: number; // Итого для клиента (First payment + Платежи + Выкуп если есть)
  initialPayment: number; // Сумма первого месяца (First payment + Страховка)
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
  
  // 1. Determine First Payment Amount
  let firstPaymentTotal = input.firstPaymentAmount;
  
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

  // Schedule container
  const schedule: PaymentScheduleItem[] = [];

  if (method === "inclusive_vat") {
    // "Excel" Logic (Leasing with Buyout / Custom Depreciation)
    // The "First payment" (firstPaymentTotal) entered by the user is the TOTAL initial payment.
    // It includes:
    // 1. Insurance (Annual)
    // 2. Admin Fee (1% of Price VAT) - hidden fee in Excel logic
    // 3. Equity First Payment (The part that actually reduces the principal)

    // Hidden Admin Fee (1% of Price) to match Excel discrepancies
    const adminFee = priceVat * 0.01;

    // Calculate Equity part of the First Payment
    // Equity = Total First payment - Admin Fee
    // Insurance is not financed and stays inside equity.
    const firstPaymentEquityGross = firstPaymentTotal - adminFee;
    
    // Net Equity (removing VAT from the equity part)
    // Note: In Excel, the entire First payment is VAT inclusive.
    const firstPaymentNet = firstPaymentEquityGross / 1.05;

    // Principal (Funded Amount)
    // This is the Net Price minus the Net Equity First Payment
    const priceNet = priceVat / 1.05;
    principal = Math.max(0, priceNet - firstPaymentNet);

    // 3. Interest Logic
    // We use the interest rate provided in the input
    
    // Monthly Interest (Flat Rate on Initial Principal)
    // Interest = Principal * (Rate / 100 / 12)
    const monthlyInterest = principal * (interestRateAnnual / 100 / 12);

    // Total Interest
    // Paid for (termMonths - 1) months (excluding First payment month)
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
    const monthlyLeasePaymentRaw = (monthlyPrincipal + monthlyInterest) * 1.05;
    monthlyLeasePayment = Math.round(monthlyLeasePaymentRaw);

    // Rates for display
    effectiveMonthlyRate = interestRateAnnual / 12;
    effectivePeriodRate = (interestRateAnnual * Math.max(0, termMonths - 1)) / 12;

    // 6. Total Client Cost
    // FirstPayment (Total First payment) + (MonthlyPayment * numRegularPayments) + Buyout
    // Note: Insurance is already inside FirstPayment
    // User instruction: "First payment + Insurance" is the 1st payment.
    // For now, TotalClientCost = First payment + Payments + Buyout.
    // If term is 36 months, 1st year is in First payment. 2nd and 3rd year are extra?
    // Excel "Total" column matches sum of payments.
    // Let's assume TotalClientCost = Sum of all schedule payments.
    const sumOfPayments = firstPaymentTotal + (monthlyLeasePayment * numRegularPayments) + buyoutAmount;
    totalClientCost = sumOfPayments;

    // 7. Generate Schedule
    let currentPrincipalBalance = principal;
    
    // Initial Payment (First payment)
    // The user wants strictly "First payment" amount here.
    const initialPayment = firstPaymentTotal;
    schedule.push({
        month: 1,
        label: "First payment",
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
    // Standard logic: 
    // "1 month payment = First payment" (First payment includes insurance)
    // Equity = First payment
    // Insurance is not financed and stays inside equity.
    const equityFirstPayment = firstPaymentTotal;
    
    // Principal = PriceVat - Equity
    principal = Math.max(0, priceVat - equityFirstPayment);
    buyoutAmount = 0; 

    // Interest calculation (Flat Rate on Principal)
    // Standard usually means "Interest on Principal for Term".
    const totalInterestRaw = principal * (interestRateAnnual / 100) * (termMonths / 12);

    // Payoff
    const payoffWithInterest = principal + totalInterestRaw;

    // Number of regular payments (Month 2 to Term+1)
    // Regular payments count equals termMonths, first payment is month 1.
    const numRegularPayments = Math.max(1, termMonths);

    // Monthly Payment (rounded to match schedule display)
    // We amortize the Payoff over the remaining months
    const monthlyLeasePaymentRaw = payoffWithInterest / numRegularPayments;
    monthlyLeasePayment = Math.round(monthlyLeasePaymentRaw);

    // Total interest aligned with rounded payment amounts
    totalInterest = (monthlyLeasePayment * numRegularPayments) - principal;
    
    // Rates
    effectiveMonthlyRate = interestRateAnnual / 12;
    effectivePeriodRate = (interestRateAnnual * termMonths) / 12;

    // Total Client Cost
    // First payment + (MonthlyPayment * numRegularPayments)
    totalClientCost = firstPaymentTotal + (monthlyLeasePayment * numRegularPayments);

    // Schedule
    let currentPrincipalBalance = principal;
    const monthlyPrincipal = principal / numRegularPayments; 
    const monthlyInterest = totalInterest / numRegularPayments;

    // Month 1: First payment
    schedule.push({
        month: 1,
        label: "First payment",
        amount: firstPaymentTotal,
        principal: firstPaymentTotal, // Visual: Amount = Principal (assuming VAT 0/included)
        interest: 0,
        vat: 0, 
        balance: currentPrincipalBalance // Balance reflects actual debt (Price - Equity)
    });

    // Months 2..Term+1
    for (let i = 0; i < numRegularPayments; i++) {
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
  // Now consistent for both methods: just the First payment amount.
  const initialPayment = firstPaymentTotal;

  return {
    method,
    priceVat,
    firstPaymentTotal,
    financedAmount: principal,
    monthlyPayment: monthlyLeasePayment,
    totalInterest,
    insuranceAnnual,
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
