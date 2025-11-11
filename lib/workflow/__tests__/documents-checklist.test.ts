import { describe, expect, it } from "vitest";

import {
  extractChecklistFromTaskPayload,
  evaluateClientDocumentChecklist,
  filterChecklistTypes,
} from "@/lib/workflow/documents-checklist";

describe("documents checklist helpers", () => {
  it("filters out disabled checklist entries", () => {
    const source = [
      "passport",
      "bank_statements",
      "proof_of_income",
      "company_license",
    ];

    expect(filterChecklistTypes(source)).toEqual(["passport", "company_license"]);
  });

  it("extracts checklist defaults from task payload when shape is valid", () => {
    const payload = {
      defaults: {
        checklist: [
          " passport_copy  ",
          "",
          null,
          "bank_statement",
          "salary_certificate",
        ],
      },
    };

    expect(extractChecklistFromTaskPayload(payload)).toEqual([
      " passport_copy  ",
      "bank_statement",
      "salary_certificate",
    ]);
  });

  it("returns empty checklist for invalid payload shapes", () => {
    expect(extractChecklistFromTaskPayload(null)).toEqual([]);
    expect(extractChecklistFromTaskPayload({})).toEqual([]);
    expect(extractChecklistFromTaskPayload({ defaults: {} })).toEqual([]);
    expect(
      extractChecklistFromTaskPayload({ defaults: { checklist: [123, undefined] } }),
    ).toEqual([]);
  });

  it("normalizes document types, labels and fulfillment", () => {
    const checklist = ["passport_copy", "company_bank_statement", "other"];
    const documents = [
      {
        id: "doc-1",
        document_type: "passport",
        status: "uploaded",
        title: "Passport",
      },
      {
        id: "doc-2",
        document_type: "company_bank_statement",
        status: "uploaded",
        title: "Bank statement",
      },
    ];

    const result = evaluateClientDocumentChecklist(checklist, documents);

    expect(result.fulfilled).toBe(false);
    expect(result.items).toHaveLength(3);

    const passportEntry = result.items[0];
    expect(passportEntry.normalizedType).toBe("passport");
    expect(passportEntry.label).toMatch(/паспорт/i);
    expect(passportEntry.fulfilled).toBe(true);
    expect(passportEntry.matches[0]?.id).toBe("doc-1");

    const companyEntry = result.items[1];
    expect(companyEntry.normalizedType).toBe("company_bank_statement");
    expect(companyEntry.fulfilled).toBe(true);

    const otherEntry = result.items[2];
    expect(otherEntry.normalizedType).toBe("other");
    expect(otherEntry.fulfilled).toBe(false);
    expect(result.fulfilled).toBe(false);
  });
});
