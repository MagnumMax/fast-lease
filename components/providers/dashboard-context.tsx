"use client";

import * as React from "react";

type DashboardContextType = {
  headerActions: React.ReactNode;
  setHeaderActions: (actions: React.ReactNode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

const DashboardContext = React.createContext<DashboardContextType | undefined>(
  undefined
);

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [headerActions, setHeaderActions] = React.useState<React.ReactNode>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  const value = React.useMemo(
    () => ({
      headerActions,
      setHeaderActions,
      searchQuery,
      setSearchQuery,
    }),
    [headerActions, searchQuery]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = React.useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
