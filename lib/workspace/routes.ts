export const WORKSPACE_SECTIONS = [
  "tasks",
  "deals",
  "clients",
  "sellers",
  "cars",
] as const;

export type WorkspaceSection = (typeof WORKSPACE_SECTIONS)[number];

export const WORKSPACE_ROLES = [
  "ops",
  "admin",
  "finance",
  "support",
  "tech",
  "risk",
  "legal",
  "accounting",
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

export function getWorkspacePaths(section: WorkspaceSection): string[] {
  return [
    `/workspace/${section}`,
    ...WORKSPACE_ROLES.map((role) => `/${role}/${section}`),
  ];
}
