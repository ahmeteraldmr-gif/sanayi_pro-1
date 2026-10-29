import { NewRecordPage } from "@/components/records/create-record-form";
export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string }>;
}) {
  const { customer } = await searchParams;
  return <NewRecordPage customerId={customer} />;
}
