import { AuthCard } from "@/app/(auth)/login/auth-card";
import { getDeploymentInfo } from "@/lib/deployment-info";
import type { DeploymentInfo } from "@/lib/deployment-info";

export const dynamic = "force-static";
export const revalidate = 60;

export default function LandingPage() {
  const deployment = getDeploymentInfo();

  return (
    <div className="space-y-6">
      <AuthCard />
      <DeploymentMeta info={deployment} />
    </div>
  );
}

function DeploymentMeta({ info }: { info: DeploymentInfo }) {
  const hasAnyMeta =
    info.deploymentId ||
    info.shortCommitSha ||
    info.commitRef ||
    info.deployedAtLabel;

  if (!hasAnyMeta) {
    return null;
  }

  const headlinePieces = [
    info.environment && info.environment.toUpperCase(),
    info.commitRef,
    info.shortCommitSha,
    info.deploymentId,
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-center text-xs text-muted-foreground">
      <p className="font-medium uppercase tracking-[0.24em] text-muted">
        Последний деплой
      </p>
      <div className="mt-2 space-y-1 text-[13px] leading-tight text-foreground/80">
        {headlinePieces.length > 0 && (
          <p className="font-semibold">{headlinePieces.join(" · ")}</p>
        )}
        {info.deployedAtLabel && (
          <p>
            Обновлено: {info.deployedAtLabel}
            {info.source === "fallback" ? " (по времени сборки)" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
