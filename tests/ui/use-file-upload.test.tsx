// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFileUpload } from "@/hooks/use-file-upload";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("useFileUpload", () => {
  it("uploads a file with a signed URL", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    const getUploadUrl = vi.fn().mockResolvedValue({
      success: true,
      url: "https://example.com/upload",
      path: "docs/note.txt",
    });
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }));

    const { result } = renderHook(() => useFileUpload<{ dealId: string }>());

    let uploadResult: { path: string } | null = null;
    await act(async () => {
      uploadResult = await result.current.upload(file, getUploadUrl, {
        dealId: "deal-1",
      });
    });

    expect(uploadResult).toEqual({ path: "docs/note.txt" });
    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/upload",
      expect.objectContaining({
        method: "PUT",
        body: file,
      }),
    );
    expect(result.current.error).toBeNull();
    expect(result.current.isUploading).toBe(false);
    expect(result.current.progress).toBe(100);
  });

  it("returns an error when signed URL fails", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    const getUploadUrl = vi.fn().mockResolvedValue({
      success: false,
      error: "Missing token",
    });

    const { result } = renderHook(() => useFileUpload<{ dealId: string }>());

    let uploadResult: { path: string } | null = null;
    await act(async () => {
      uploadResult = await result.current.upload(file, getUploadUrl, {
        dealId: "deal-1",
      });
    });

    expect(uploadResult).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Missing token");
  });

  it("returns an error when upload fails", async () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    const getUploadUrl = vi.fn().mockResolvedValue({
      success: true,
      url: "https://example.com/upload",
      path: "docs/note.txt",
    });
    vi.mocked(fetch).mockResolvedValue(new Response("Denied", { status: 403 }));

    const { result } = renderHook(() => useFileUpload<{ dealId: string }>());

    let uploadResult: { path: string } | null = null;
    await act(async () => {
      uploadResult = await result.current.upload(file, getUploadUrl, {
        dealId: "deal-1",
      });
    });

    expect(uploadResult).toBeNull();
    expect(result.current.error).toContain("Ошибка загрузки файла");
  });
});
