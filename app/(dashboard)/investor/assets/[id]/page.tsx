import { RouteScaffold } from "@/components/placeholders/route-scaffold";

type InvestorAssetPageProps = {
  params: { id: string };
};

export default function InvestorAssetDetailsPage({
  params,
}: InvestorAssetPageProps) {
  return (
    <RouteScaffold
      title={`Инвестор · Актив ${params.id}`}
      description="Детализация актива с денежными потоками и документами из /beta/investor/assets/asset-001/index.html."
      referencePath="/beta/investor/assets/asset-001/index.html"
    />
  );
}
