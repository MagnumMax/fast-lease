import { describe, expect, it } from "vitest";

import { extractQuoteFieldsFromTaskPayload } from "../task-completion";

describe("extractQuoteFieldsFromTaskPayload", () => {
  it("парсит числовые поля КП и очищает форматирование", () => {
    const payload = {
      fields: {
        price_vat: "1 234 500",
        term_months: "36",
        down_payment_amount: "15000",
        interest_rate_annual: "7,5",
        insurance_rate_annual: 3.2,
      },
    };

    const result = extractQuoteFieldsFromTaskPayload(payload);

    expect(result).toEqual({
      price_vat: 1234500,
      term_months: 36,
      down_payment_amount: 15000,
      interest_rate_annual: 7.5,
      insurance_rate_annual: 3.2,
    });
  });

  it("возвращает только валидные числа и пропускает пустые значения", () => {
    const payload = {
      fields: {
        price_vat: "",
        term_months: "48",
        down_payment_amount: "NaN",
        interest_rate_annual: null,
        insurance_rate_annual: undefined,
      },
    };

    const result = extractQuoteFieldsFromTaskPayload(payload);

    expect(result).toEqual({
      term_months: 48,
    });
  });

  it("возвращает null, если подходящих полей нет", () => {
    const payload = {
      fields: {
        notes: "nothing here",
      },
    };

    const result = extractQuoteFieldsFromTaskPayload(payload);

    expect(result).toBeNull();
  });
});
