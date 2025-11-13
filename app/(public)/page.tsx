import { UnifiedLoginSection } from "@/components/auth/login-section";
import { getDeploymentInfo } from "@/lib/deployment-info";
import type { DeploymentInfo } from "@/lib/deployment-info";

export const dynamic = "force-static";
export const revalidate = 60;

export default function LandingPage() {
  const deployment = getDeploymentInfo();

  return (
    <>
      <UnifiedLoginSection />
      <div className="mt-4">
        <DeploymentMeta info={deployment} />
      </div>
    </>
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
    <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2 text-center text-[8px] text-foreground/80">
      <p className="font-semibold uppercase tracking-[0.3em] text-muted">Последний деплой</p>
      <div className="mt-1 flex flex-col gap-1 text-[9px]">
        {headlinePieces.length > 0 && (
          <p className="font-semibold text-foreground">{headlinePieces.join(" · ")}</p>
        )}
        {info.deployedAtLabel && (
          <p className="text-[11px] text-foreground/60">Обновлено: {info.deployedAtLabel}</p>
        )}
      </div>
    </div>
  );
}
