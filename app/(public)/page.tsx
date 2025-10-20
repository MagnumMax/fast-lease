import { AuthCard } from "@/app/(auth)/login/auth-card";

export const dynamic = "force-static";
export const revalidate = 60;

export default function LandingPage() {
  return <AuthCard />;
}
