import { IntakeWizard } from "@/components/intake/intake-wizard";
export default async function IntakePage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string; plate?: string }>;
}) {
  const { vehicle, plate } = await searchParams;
  return (
    <IntakeWizard
      key={`${vehicle ?? ""}:${plate ?? ""}`}
      initialVehicleId={vehicle}
      initialPlate={plate}
    />
  );
}
