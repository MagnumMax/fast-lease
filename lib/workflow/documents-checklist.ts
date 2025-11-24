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
  metadata?: Record<string, unknown> | null;
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

function extractChecklistArray(source: unknown): string[] | null {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return null;
  }

  const branch = source as Record<string, unknown>;
  const checklist = branch.checklist;
  if (Array.isArray(checklist)) {
    return checklist.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }
  if (typeof checklist === "string") {
    try {
      const parsed = JSON.parse(checklist);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        : null;
    } catch {
      return null;
    }
  }

  return null;
}

export function extractChecklistFromTaskPayload(taskPayload: unknown): string[] {
  if (!taskPayload || typeof taskPayload !== "object" || Array.isArray(taskPayload)) {
    return [];
  }

  const payload = taskPayload as Record<string, unknown>;
  const fieldsChecklist = extractChecklistArray(payload.fields);
  const defaultsChecklist = extractChecklistArray(payload.defaults);
  const combined = fieldsChecklist ?? defaultsChecklist ?? [];

  return filterChecklistTypes(combined);
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
