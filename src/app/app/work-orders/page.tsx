import { WorkOrdersList } from "@/components/work-orders/work-orders-list";
export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ quick?: string }>;
}) {
  const { quick } = await searchParams;
  return <WorkOrdersList initialQuick={quick === "late" ? "late" : "all"} />;
}
