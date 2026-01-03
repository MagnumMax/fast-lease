import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/constants/files", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/constants/files")>();
  return {
    ...actual,
    MAX_FILE_SIZE_BYTES: 10,
    MAX_FILE_SIZE_LABEL: "10 B",
  };
});

import { uploadDocumentsBatch, sanitizeFileName } from "@/lib/documents/upload";

const createSupabaseMock = () => {
  const upload = vi.fn().mockResolvedValue({ error: null });
  const remove = vi.fn().mockResolvedValue({ data: null, error: null });
  const fromStorage = vi.fn(() => ({ upload, remove }));

  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));

  const client = {
    storage: { from: fromStorage },
    from,
  } as unknown as SupabaseClient;

  return { client, upload, remove, fromStorage, from, insert };
};

const createFileLike = (name: string, size: number, type = "application/pdf") => {
  const blob = new Blob([new Uint8Array(size)], { type });
  return Object.assign(blob, { name });
};

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  vi.spyOn(Math, "random").mockReturnValue(0.123456);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("uploadDocumentsBatch", () => {
  it("sanitizes cyrillic file names", () => {
    expect(sanitizeFileName("паспорт.pdf")).toBe("pasport.pdf");
  });

  it("returns success with no documents", async () => {
    const { client } = createSupabaseMock();

    const result = await uploadDocumentsBatch([], {
      supabase: client,
      bucket: "docs",
      table: "deal_documents",
      entityColumn: "deal_id",
      entityId: "deal-1",
      allowedTypes: new Set(["passport"]),
    });

    expect(result).toEqual({ success: true, uploaded: 0 });
  });

  it("rejects unsupported document types", async () => {
    const { client, upload } = createSupabaseMock();

    const result = await uploadDocumentsBatch(
      [
        {
          type: "visa",
          file: createFileLike("visa.pdf", 4),
        },
      ],
      {
        supabase: client,
        bucket: "docs",
        table: "deal_documents",
        entityColumn: "deal_id",
        entityId: "deal-1",
        allowedTypes: new Set(["passport"]),
      },
    );

    expect(result.success).toBe(false);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects oversized files", async () => {
    const { client, upload } = createSupabaseMock();

    const result = await uploadDocumentsBatch(
      [
        {
          type: "passport",
          file: createFileLike("паспорт.pdf", 11),
        },
      ],
      {
        supabase: client,
        bucket: "docs",
        table: "deal_documents",
        entityColumn: "deal_id",
        entityId: "deal-1",
        allowedTypes: new Set(["passport"]),
      },
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Файл слишком большой");
    }
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads and inserts metadata for valid documents", async () => {
    const { client, upload, insert } = createSupabaseMock();

    const result = await uploadDocumentsBatch(
      [
        {
          type: "passport",
          file: createFileLike("паспорт.pdf", 4),
        },
      ],
      {
        supabase: client,
        bucket: "docs",
        table: "deal_documents",
        entityColumn: "deal_id",
        entityId: "deal-1",
        allowedTypes: new Set(["passport"]),
      },
    );

    expect(result).toEqual({ success: true, uploaded: 1 });
    expect(upload).toHaveBeenCalledTimes(1);
    const [objectPath] = upload.mock.calls[0];
    expect(objectPath).toContain("deal-1/");
    expect(objectPath).toContain("-pasport.pdf");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        document_type: "passport",
        storage_path: expect.stringContaining("deal-1/"),
        metadata: expect.objectContaining({
          original_filename: "паспорт.pdf",
        }),
      }),
    );
  });

  it("returns an error when storage upload fails", async () => {
    const { client, upload, insert } = createSupabaseMock();
    upload.mockResolvedValueOnce({ error: { message: "Fail" } });

    const result = await uploadDocumentsBatch(
      [
        {
          type: "passport",
          file: createFileLike("паспорт.pdf", 4),
        },
      ],
      {
        supabase: client,
        bucket: "docs",
        table: "deal_documents",
        entityColumn: "deal_id",
        entityId: "deal-1",
        allowedTypes: new Set(["passport"]),
      },
    );

    expect(result.success).toBe(false);
    expect(insert).not.toHaveBeenCalled();
  });

  it("cleans up storage when insert fails", async () => {
    const { client, remove, insert } = createSupabaseMock();
    insert.mockResolvedValueOnce({ error: { message: "Fail" } });

    const result = await uploadDocumentsBatch(
      [
        {
          type: "passport",
          file: createFileLike("паспорт.pdf", 4),
        },
      ],
      {
        supabase: client,
        bucket: "docs",
        table: "deal_documents",
        entityColumn: "deal_id",
        entityId: "deal-1",
        allowedTypes: new Set(["passport"]),
      },
    );

    expect(result.success).toBe(false);
    expect(remove).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining("deal-1/")]),
    );
  });
});
