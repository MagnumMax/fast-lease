import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function LoginPage() {
  return (
    <RouteScaffold
      title="Вход в систему"
      description="Экран аутентификации с табами email/OTP переносится из /beta/login/index.html."
      referencePath="/beta/login/index.html"
    />
  );
}
