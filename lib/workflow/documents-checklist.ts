import {
  CLIENT_DOCUMENT_TYPE_LABEL_MAP,
  type ClientDocumentTypeValue,
  normalizeClientDocumentType,
} from "@/lib/supabase/queries/operations";

export const CLIENT_CHECKLIST_DISABLED_TYPES = new Set(["bank_statements", "proof_of_income"]);

export function filterChecklistTypes(values: readonly string[]): string[] {
  return values.filter((value) => !CLIENT_CHECKLIST_DISABLED_TYPES.has(value));
}

export type ClientDocumentSummary = {
  id: string;
  document_type: string | null;
  status: string | null;
  title: string | null;
  storage_path?: string | null;
};

export type ClientDocumentChecklistItem = {
  key: string;
  normalizedType: ClientDocumentTypeValue | null;
  label: string;
  fulfilled: boolean;
  matches: ClientDocumentSummary[];
};

export type ClientDocumentChecklist = {
  items: ClientDocumentChecklistItem[];
  fulfilled: boolean;
};

export function extractChecklistFromTaskPayload(taskPayload: unknown): string[] {
  if (!taskPayload || typeof taskPayload !== "object" || Array.isArray(taskPayload)) {
    return [];
  }

  const payload = taskPayload as Record<string, unknown>;
  const defaults = payload.defaults;
  if (!defaults || typeof defaults !== "object" || Array.isArray(defaults)) {
    return [];
  }

  const checklist = (defaults as Record<string, unknown>).checklist;
  if (!Array.isArray(checklist)) {
    return [];
  }

  const normalized = checklist.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return filterChecklistTypes(normalized);
}

export function evaluateClientDocumentChecklist(
  requiredRaw: string[],
  documents: ClientDocumentSummary[],
): ClientDocumentChecklist {
  const normalizedDocuments = documents.map((doc) => {
    const normalizedType = normalizeClientDocumentType(doc.document_type ?? undefined) ?? null;
    return { ...doc, normalizedType };
  });

  const docMap = normalizedDocuments.reduce<Map<string, ClientDocumentSummary[]>>((acc, doc) => {
    const key = doc.normalizedType ?? "__unknown__";
    const list = acc.get(key) ?? [];
    list.push(doc);
    acc.set(key, list);
    return acc;
  }, new Map());

  const items: ClientDocumentChecklistItem[] = requiredRaw.map((raw) => {
    const normalizedType = normalizeClientDocumentType(raw) ?? null;
    const label =
      (normalizedType ? CLIENT_DOCUMENT_TYPE_LABEL_MAP[normalizedType] : undefined) ??
      CLIENT_DOCUMENT_TYPE_LABEL_MAP[raw as ClientDocumentTypeValue] ??
      raw;
    const matches = normalizedType ? docMap.get(normalizedType) ?? [] : [];
    return {
      key: raw,
      normalizedType,
      label,
      fulfilled: matches.length > 0,
      matches,
    };
  });

  return {
    items,
    fulfilled: items.length > 0 ? items.every((item) => item.fulfilled) : false,
  };
}
