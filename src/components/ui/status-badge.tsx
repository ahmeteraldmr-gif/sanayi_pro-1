import { statuses, type WorkOrderStatus } from "@/lib/demo-data";

export function StatusBadge({
  status,
  short = false,
}: {
  status: WorkOrderStatus;
  short?: boolean;
}) {
  const value = statuses[status];
  const toneClass =
    status === "WAITING_PARTS"
      ? "app-status-orange"
      : `app-status-${value.tone}`;
  return (
    <span className={`app-status ${toneClass}`}>
      <span aria-hidden="true" />
      {short ? value.short : value.label}
    </span>
  );
}
