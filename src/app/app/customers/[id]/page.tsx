import { CustomerDetail } from "@/components/records/records-pages";

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vehicle?: string; action?: string }>;
}) {
  const { id } = await params;
  const { vehicle, action } = await searchParams;
  return (
    <CustomerDetail
      id={id}
      initialVehicleId={vehicle}
      initialAction={action}
    />
  );
}
