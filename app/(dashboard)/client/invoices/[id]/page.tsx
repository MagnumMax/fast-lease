import { RouteScaffold } from "@/components/placeholders/route-scaffold";

type InvoiceDetailsPageProps = {
  params: { id: string };
};

export default function InvoiceDetailsPage({ params }: InvoiceDetailsPageProps) {
  return (
    <RouteScaffold
      title={`Клиент · Счет ${params.id}`}
      description="Детализация счета с журналом платежей и документами из /beta/client/invoices/invoice-2024-001/index.html."
      referencePath="/beta/client/invoices/invoice-2024-001/index.html"
    />
  );
}
