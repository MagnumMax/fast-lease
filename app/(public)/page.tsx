import { CatalogPage } from "./_components/catalog-page";

export const dynamic = "force-static";
export const revalidate = 60;

export default function LandingPage() {
  return <CatalogPage />;
}
