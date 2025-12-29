import { PortalDetector } from "@/app/(auth)/login/portal-detector";

export function UnifiedLoginSection() {
  return (
    <div className="space-y-8">
      <header className="space-y-3 text-center text-foreground">
        <h1 className="text-3xl md:text-4xl font-semibold text-foreground">Sign in</h1>
      </header>

      <PortalDetector />
    </div>
  );
}
