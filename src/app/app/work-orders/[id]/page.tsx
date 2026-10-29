import { WorkOrderDetail } from "@/components/work-orders/work-order-detail";
import type { DetailTab } from "@/components/work-orders/order-tabs";

export default async function WorkOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab: DetailTab =
    tab === "labor"
      ? "labor"
      : tab === "parts"
        ? "parts"
        : tab === "history"
          ? "history"
          : tab === "approval"
            ? "approval"
            : tab === "photos"
              ? "photos"
              : tab === "payments"
                ? "payments"
                : "summary";

  return (
    <WorkOrderDetail
      key={`${id}:${initialTab}`}
      id={id}
      initialTab={initialTab}
    />
  );
}
