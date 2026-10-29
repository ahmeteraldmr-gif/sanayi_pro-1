import { VehicleDetail } from "@/components/records/records-pages";
export default async function VehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VehicleDetail id={id} />;
}
