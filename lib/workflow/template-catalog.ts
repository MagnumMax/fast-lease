import { promises as fs } from "node:fs";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

import { buildWorkflowCatalog, type WorkflowCatalog } from "@/lib/workflow/catalog-builder";
import { parseWorkflowTemplate } from "@/lib/workflow/parser";

const WORKFLOW_TEMPLATE_PATH = path.join(process.cwd(), "docs", "workflow_template.yaml");

type CatalogCache = {
  mtimeMs: number;
  catalog: WorkflowCatalog;
};

let catalogCache: CatalogCache | null = null;
let catalogCacheSync: CatalogCache | null = null;
let catalogLoadPromise: Promise<CatalogCache> | null = null;

async function loadCatalog(): Promise<CatalogCache> {
  const stat = await fs.stat(WORKFLOW_TEMPLATE_PATH);

  if (catalogCache && catalogCache.mtimeMs === stat.mtimeMs) {
    return catalogCache;
  }

  const source = await fs.readFile(WORKFLOW_TEMPLATE_PATH, "utf8");
  const template = parseWorkflowTemplate(source);
  const catalog = buildWorkflowCatalog(template);
  catalogCache = { mtimeMs: stat.mtimeMs, catalog };

  return catalogCache;
}

/**
 * Loads and caches workflow template catalogue.
 * In dev it will reload when the YAML mtime changes; in prod it stays cached.
 */
export async function getWorkflowCatalog(): Promise<WorkflowCatalog> {
  if (!catalogLoadPromise) {
    catalogLoadPromise = loadCatalog().finally(() => {
      catalogLoadPromise = null;
    });
  }

  const cache = await catalogLoadPromise;
  return cache.catalog;
}

export function clearWorkflowCatalogCache(): void {
  catalogCache = null;
  catalogCacheSync = null;
  catalogLoadPromise = null;
}

/**
 * Synchronous variant for server-only consumers.
 */
export function getWorkflowCatalogSync(): WorkflowCatalog {
  const stat = statSync(WORKFLOW_TEMPLATE_PATH);
  if (catalogCacheSync && catalogCacheSync.mtimeMs === stat.mtimeMs) {
    return catalogCacheSync.catalog;
  }

  const source = readFileSync(WORKFLOW_TEMPLATE_PATH, "utf8");
  const template = parseWorkflowTemplate(source);
  const catalog = buildWorkflowCatalog(template);
  catalogCacheSync = { mtimeMs: stat.mtimeMs, catalog };

  return catalog;
}
