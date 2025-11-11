import { UnifiedLoginSection } from "@/components/auth/login-section";

export const dynamic = "force-static";
export const revalidate = 60;

export default function LoginPage() {
  return <UnifiedLoginSection />;
}
