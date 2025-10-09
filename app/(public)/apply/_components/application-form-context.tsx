"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  applicationDocuments,
  applicationSteps,
  type ApplicationStep,
  type ResidencyStatus,
  type ApplicationDocumentDefinition,
} from "@/lib/data/application";

type DocumentState = ApplicationDocumentDefinition & {
  uploaded: boolean;
  fileName?: string;
  status?: string;
  recordId?: string;
};

type UsagePurpose = "personal" | "business" | "mixed";

type ApplicationDraft = {
  status: "draft" | "submitted";
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  applicationId?: string;
  applicationNumber?: string;
  residencyStatus: ResidencyStatus;
  selectedCarId?: string;
  planId?: string;
  preferences: {
    monthlyBudget: number;
    usagePurpose: UsagePurpose;
    mileage: string;
    notes: string;
  };
  personal: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    city: string;
    email: string;
    phone: string;
  };
  documents: DocumentState[];
  consents: {
    creditCheck: boolean;
    terms: boolean;
    marketing: boolean;
  };
};

const STORAGE_KEY = "fast-lease-application-draft";

const defaultDraft: ApplicationDraft = {
  status: "draft",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  residencyStatus: "resident",
  selectedCarId: undefined,
  planId: undefined,
  applicationId: undefined,
  applicationNumber: undefined,
  submittedAt: undefined,
  preferences: {
    monthlyBudget: 3500,
    usagePurpose: "personal",
    mileage: "До 20 000 км в год",
    notes: "",
  },
  personal: {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    city: "Dubai",
    email: "",
    phone: "",
  },
  documents: createDocumentState("resident"),
  consents: {
    creditCheck: false,
    terms: false,
    marketing: true,
  },
};

type ApplicationFormContextValue = {
  draft: ApplicationDraft;
  steps: ApplicationStep[];
  isHydrated: boolean;
  updateDraft: (updater: (prev: ApplicationDraft) => ApplicationDraft) => void;
  setResidencyStatus: (status: ResidencyStatus) => void;
  resetDraft: () => void;
};

const ApplicationFormContext = createContext<ApplicationFormContextValue | null>(
  null,
);

export function ApplicationFormProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [draft, setDraft] = useState<ApplicationDraft>(defaultDraft);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ApplicationDraft;
        setDraft({
          ...defaultDraft,
          ...parsed,
          documents: mergeDocuments(parsed.residencyStatus, parsed.documents),
        });
      }
    } catch (error) {
      console.warn("[application] failed to load draft", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft, isHydrated]);

  const updateDraft = useCallback(
    (updater: (prev: ApplicationDraft) => ApplicationDraft) => {
      setDraft((prev) => {
        const next = updater(prev);
        return {
          ...next,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [],
  );

  const setResidencyStatus = useCallback(
    (status: ResidencyStatus) => {
      updateDraft((prev) => ({
        ...prev,
        residencyStatus: status,
        documents: mergeDocuments(status, prev.documents),
      }));
    },
    [updateDraft],
  );

  const resetDraft = useCallback(() => {
    setDraft({
      ...defaultDraft,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value = useMemo<ApplicationFormContextValue>(
    () => ({
      draft,
      steps: applicationSteps,
      isHydrated,
      updateDraft,
      setResidencyStatus,
      resetDraft,
    }),
    [draft, isHydrated, resetDraft, setResidencyStatus, updateDraft],
  );

  return (
    <ApplicationFormContext.Provider value={value}>
      {children}
    </ApplicationFormContext.Provider>
  );
}

export function useApplicationForm() {
  const context = useContext(ApplicationFormContext);
  if (!context) {
    throw new Error(
      "useApplicationForm must be used within an ApplicationFormProvider",
    );
  }
  return context;
}

function createDocumentState(status: ResidencyStatus): DocumentState[] {
  return applicationDocuments[status].map((definition) => ({
    ...definition,
    uploaded: false,
    fileName: undefined,
  }));
}

function mergeDocuments(
  status: ResidencyStatus,
  previous: DocumentState[],
): DocumentState[] {
  const definitions = applicationDocuments[status];
  return definitions.map((definition) => {
    const existing = previous.find((doc) => doc.id === definition.id);
    return {
      ...definition,
      uploaded: existing?.uploaded ?? false,
      fileName: existing?.fileName,
      status: existing?.status,
      recordId: existing?.recordId,
    };
  });
}
