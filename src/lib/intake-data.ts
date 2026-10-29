import type { IntakeDetails } from "./demo-data";

export const intakeSteps = [
  "Araç ve Müşteri",
  "Araç Durumu",
  "Kabul Checklist",
  "Fotoğraflar",
  "Usta ve Özet",
] as const;

export type InspectionState = "normal" | "damaged" | "check";

export const inspectionItems = [
  { id: "lights", label: "Farlar" },
  { id: "signals", label: "Sinyaller" },
  { id: "tires", label: "Lastikler" },
  { id: "windows", label: "Camlar" },
  { id: "mirrors", label: "Aynalar" },
  { id: "bodywork", label: "Kaporta" },
  { id: "interior", label: "İç mekan" },
] as const;

export const inspectionStateLabels: Record<InspectionState, string> = {
  normal: "Normal",
  damaged: "Hasarlı",
  check: "Kontrol Edilecek",
};

export const intakeChecklist = [
  { id: "registration", label: "Ruhsat araçta mı?" },
  { id: "key", label: "Araç anahtarı teslim alındı mı?" },
  { id: "spare", label: "Stepne mevcut mu?" },
  { id: "tools", label: "Kriko ve bijon anahtarı mevcut mu?" },
  { id: "valuables", label: "Kişisel eşyalar müşteriye hatırlatıldı mı?" },
] as const;
export const photoAreas = ["Ön", "Arka", "Sağ", "Sol", "Hasar"] as const;
export type IntakeInput = IntakeDetails & {
  vehicleId: string;
  mileage: number;
  fuel: number;
  complaint: string;
  technicianId: string;
  dueAt: string;
};
export type NewRecordInput = {
  customerId: string;
  name: string;
  phone: string;
  email?: string;
  plate: string;
  brand?: string;
  model: string;
  year: number | null;
  mileage?: number | null;
  fuelType?: string;
};
export const earlierMeganeVisits = [
  {
    id: "service-1",
    date: "12 Mart 2026",
    title: "Yağ ve filtre bakımı",
    mileage: 90000,
    description: "Periyodik bakım · Motor yağı, yağ ve hava filtresi",
  },
  {
    id: "service-2",
    date: "18 Haziran 2026",
    title: "Ön fren sistemi",
    mileage: 94600,
    description: "Balata kontrolü ve değişim",
  },
] as const;
