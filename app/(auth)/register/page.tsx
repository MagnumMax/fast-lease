import { RouteScaffold } from "@/components/placeholders/route-scaffold";

export default function RegisterPage() {
  return (
    <RouteScaffold
      title="Регистрация"
      description="Форма создания аккаунта с шагами верификации, основана на /beta/register/index.html."
      referencePath="/beta/register/index.html"
    />
  );
}
