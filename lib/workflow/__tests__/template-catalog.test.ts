import * as fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clearWorkflowCatalogCache, getWorkflowCatalog } from "../template-catalog";

const TEMPLATE_PATH = path.join(process.cwd(), "docs", "workflow_template.yaml");
const TEMPLATE_SOURCE = fs.readFileSync(TEMPLATE_PATH, "utf8");

const makeStat = (mtimeMs: number): fs.Stats => {
  return { mtimeMs } as unknown as fs.Stats;
};

describe("workflow template catalog cache", () => {
  beforeEach(() => {
    clearWorkflowCatalogCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearWorkflowCatalogCache();
  });

  it("reuses cached catalogue when mtime is unchanged", async () => {
    const statSpy = vi.spyOn(fs.promises, "stat").mockResolvedValue(makeStat(1));
    const readSpy = vi.spyOn(fs.promises, "readFile").mockResolvedValue(TEMPLATE_SOURCE);

    const first = await getWorkflowCatalog();
    const second = await getWorkflowCatalog();

    expect(second).toBe(first);
    expect(statSpy).toHaveBeenCalledTimes(2);
    expect(readSpy).toHaveBeenCalledTimes(1);
  });

  it("reloads catalogue when template mtime changes", async () => {
    const statSpy = vi
      .spyOn(fs.promises, "stat")
      .mockResolvedValueOnce(makeStat(1))
      .mockResolvedValueOnce(makeStat(2));
    const readSpy = vi.spyOn(fs.promises, "readFile").mockResolvedValue(TEMPLATE_SOURCE);

    const first = await getWorkflowCatalog();
    const second = await getWorkflowCatalog();

    expect(second).not.toBe(first);
    expect(statSpy).toHaveBeenCalledTimes(2);
    expect(readSpy).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent loads", async () => {
    const statSpy = vi.spyOn(fs.promises, "stat").mockResolvedValue(makeStat(1));
    const readSpy = vi.spyOn(fs.promises, "readFile").mockResolvedValue(TEMPLATE_SOURCE);

    const [first, second] = await Promise.all([getWorkflowCatalog(), getWorkflowCatalog()]);

    expect(second).toBe(first);
    expect(statSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledTimes(1);
  });
});
