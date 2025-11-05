export type DeploymentInfo = {
  environment?: string;
  deploymentId?: string;
  commitRef?: string;
  commitSha?: string;
  shortCommitSha?: string;
  deployedAtIso?: string;
  deployedAtLabel?: string;
  source: "env" | "fallback";
};

const BUILD_SNAPSHOT_ISO = new Date().toISOString();

function pickFirstEnv(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateRu(date: Date): string {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    const iso = date.toISOString();
    return iso.replace("T", " ").slice(0, 16);
  }
}

export function getDeploymentInfo(): DeploymentInfo {
  const environment = pickFirstEnv([
    "NEXT_PUBLIC_VERCEL_ENV",
    "VERCEL_ENV",
    "NODE_ENV",
  ]);

  const deploymentId = pickFirstEnv([
    "NEXT_PUBLIC_DEPLOYMENT_ID",
    "VERCEL_DEPLOYMENT_ID",
    "DEPLOYMENT_ID",
  ]);

  const commitSha = pickFirstEnv([
    "NEXT_PUBLIC_COMMIT_SHA",
    "VERCEL_GIT_COMMIT_SHA",
    "GIT_COMMIT",
    "COMMIT_SHA",
  ]);

  const commitRef = pickFirstEnv([
    "NEXT_PUBLIC_COMMIT_REF",
    "VERCEL_GIT_COMMIT_REF",
    "GIT_BRANCH",
    "COMMIT_REF",
    "BRANCH",
  ]);

  const deployedAtRaw = pickFirstEnv([
    "NEXT_PUBLIC_DEPLOYED_AT",
    "VERCEL_DEPLOYED_AT",
    "VERCEL_DEPLOYMENT_CREATED_AT",
    "VERCEL_BUILD_TIME",
    "BUILD_TIMESTAMP",
    "BUILD_TIME",
  ]);

  const deployedAt =
    toDate(deployedAtRaw) ?? toDate(BUILD_SNAPSHOT_ISO) ?? new Date();

  const source = deployedAtRaw ? "env" : "fallback";

  return {
    environment,
    deploymentId,
    commitRef,
    commitSha,
    shortCommitSha: commitSha ? commitSha.slice(0, 7) : undefined,
    deployedAtIso: deployedAt.toISOString(),
    deployedAtLabel: formatDateRu(deployedAt),
    source,
  };
}
