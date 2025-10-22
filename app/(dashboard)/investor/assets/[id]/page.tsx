import { RouteScaffold } from "@/components/placeholders/route-scaffold";

type InvestorAssetPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvestorAssetDetailsPage({
  params,
}: InvestorAssetPageProps) {
  const { id } = await params;
  return (
    <RouteScaffold
      title={`Инвестор · Актив ${id}`}
      description="Детализация актива с денежными потоками и документами из /beta/investor/assets/asset-001/index.html."
      referencePath="/beta/investor/assets/asset-001/index.html"
    />
  );
}
