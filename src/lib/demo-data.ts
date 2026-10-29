export const DEMO_DATE = "21 Ekim 2026";
export const DEMO_NOW = "2026-10-21T15:24:00+03:00";
export const CURRENT_USER = {
  id: "ahmet",
  name: "Ahmet",
  role: "İşletme Sahibi",
} as const;
export const branches = [
  { id: "dortyol", name: "Dörtyol Şubesi" },
  { id: "iskenderun", name: "İskenderun Şubesi" },
] as const;
export type BranchId = (typeof branches)[number]["id"];
export const technicians = [
  { id: "mehmet", name: "Mehmet Usta", initials: "MU" },
  { id: "ali", name: "Ali Usta", initials: "AU" },
  { id: "ayse", name: "Ayşe Usta", initials: "AY" },
  { id: "ahmet", name: "Ahmet", initials: "AH" },
] as const;

export const statuses = {
  RECEIVED: { label: "Araç Kabul Edildi", short: "Kabul", tone: "neutral" },
  DIAGNOSIS: { label: "Arıza Tespiti", short: "Tespit", tone: "neutral" },
  AWAITING_APPROVAL: {
    label: "Müşteri Onayı Bekleniyor",
    short: "Onay Bekliyor",
    tone: "warning",
  },
  IN_PROGRESS: { label: "İşlemde", short: "İşlemde", tone: "info" },
  WAITING_PARTS: {
    label: "Parça Bekleniyor",
    short: "Parça Bekliyor",
    tone: "warning",
  },
  QUALITY_CONTROL: { label: "Son Kontrol", short: "Kontrol", tone: "info" },
  READY: { label: "Teslime Hazır", short: "Hazır", tone: "success" },
  DELIVERED: { label: "Teslim Edildi", short: "Teslim", tone: "neutral" },
  CANCELLED: { label: "İptal", short: "İptal", tone: "neutral" },
} as const;
export type WorkOrderStatus = keyof typeof statuses;
export const boardStatuses: readonly WorkOrderStatus[] = [
  "RECEIVED",
  "DIAGNOSIS",
  "AWAITING_APPROVAL",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "QUALITY_CONTROL",
  "READY",
];
export const allowedTransitions: Record<
  WorkOrderStatus,
  readonly WorkOrderStatus[]
> = {
  RECEIVED: ["DIAGNOSIS", "CANCELLED"],
  DIAGNOSIS: ["AWAITING_APPROVAL", "IN_PROGRESS", "CANCELLED"],
  AWAITING_APPROVAL: ["DIAGNOSIS", "IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_PARTS", "QUALITY_CONTROL", "CANCELLED"],
  WAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
  QUALITY_CONTROL: ["IN_PROGRESS", "READY"],
  READY: ["QUALITY_CONTROL", "DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};
export const nextActions: Partial<
  Record<WorkOrderStatus, { status: WorkOrderStatus; label: string }>
> = {
  RECEIVED: { status: "DIAGNOSIS", label: "Tespiti Başlat" },
  DIAGNOSIS: { status: "AWAITING_APPROVAL", label: "Müşteri Onayına Gönder" },
  AWAITING_APPROVAL: { status: "IN_PROGRESS", label: "İşlemi Başlat" },
  IN_PROGRESS: { status: "QUALITY_CONTROL", label: "Son Kontrole Gönder" },
  WAITING_PARTS: { status: "IN_PROGRESS", label: "İşleme Devam Et" },
  QUALITY_CONTROL: { status: "READY", label: "Teslime Hazır İşaretle" },
  READY: { status: "DELIVERED", label: "Aracı Teslim Et" },
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
};
export type Vehicle = {
  id: string;
  plate: string;
  brand?: string;
  model: string;
  year: number | null;
  mileage?: number;
  fuelType?: string;
  active?: boolean;
  customerId: string;
  lastService: { date: string; title: string; mileage: number } | null;
};
export type LaborLine = { id: string; name: string; amount: number };
export type PartLine = {
  id: string;
  name: string;
  quantity: number;
  price: number;
  historicCost: number;
  state: "CONSUMED" | "RESERVED";
};
export type TimelineEntry = { id: string; time: string; text: string };
export type DemoNote = {
  id: string;
  text: string;
  author: string;
  role?: string;
  createdAt?: string;
  internal?: boolean;
};
export type IntakePhoto = { area: string; name: string; dataUrl: string };
export type IntakeDetails = {
  damage: string;
  keyCount?: number;
  leftItems?: string;
  inspection?: Record<string, "normal" | "damaged" | "check">;
  checklist: Record<string, "yes" | "no" | "na">;
  photos: readonly IntakePhoto[];
};

export type QuoteStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED";

export const quoteStatusMeta: Record<
  QuoteStatus,
  { label: string; tone: "neutral" | "warning" | "success" | "info" | "danger" }
> = {
  DRAFT: { label: "Taslak", tone: "neutral" },
  PENDING_APPROVAL: { label: "Müşteri Onayı Bekliyor", tone: "warning" },
  APPROVED: { label: "Onaylandı", tone: "success" },
  PARTIALLY_APPROVED: { label: "Kısmi Onaylandı", tone: "info" },
  REJECTED: { label: "Reddedildi", tone: "danger" },
};

export type QuoteItem = {
  id: string;
  operation: string;
  laborAmount: number;
  partId?: string;
  partName: string;
  quantity: number;
  unitPrice: number;
  total: number;
  note: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
};

export type PartRequestStatus =
  | "REQUESTED"
  | "PREPARING"
  | "DELIVERED"
  | "CANCELLED";

export const partRequestStatuses: Record<
  PartRequestStatus,
  { label: string; tone: "warning" | "info" | "success" | "neutral" }
> = {
  REQUESTED: { label: "Talep Edildi", tone: "warning" },
  PREPARING: { label: "Hazırlanıyor", tone: "info" },
  DELIVERED: { label: "Teslim Edildi", tone: "success" },
  CANCELLED: { label: "İptal", tone: "neutral" },
};

export type PartRequest = {
  id: string;
  orderId: string;
  partId?: string;
  partName: string;
  quantity: number;
  requestedBy: string;
  requestedAt: string;
  status: PartRequestStatus;
  note?: string;
};

export type WorkOrder = {
  completedAt?: string;
  intake?: IntakeDetails;
  id: string;
  vehicleId: string;
  customerId: string;
  branchId: BranchId;
  technicianId: string;
  assigneeIds: readonly string[];
  status: WorkOrderStatus;
  createdAt: string;
  dueAt: string;
  updatedLabel: string;
  stageDuration: string;
  complaint: string;
  diagnosis: string;
  intakeMileage: number;
  fuel: number;
  labor: readonly LaborLine[];
  parts: readonly PartLine[];
  total: number;
  paid: number;
  quoteRevision: number;
  approval: "APPROVED" | "PENDING";
  approvalChannel: string;
  quoteStatus?: QuoteStatus;
  quoteItems?: readonly QuoteItem[];
  partRequests?: readonly PartRequest[];
  notes: readonly DemoNote[];
  additionalCosts: number;
  timeline: readonly TimelineEntry[];
};

export const customers: readonly Customer[] = [
  {
    id: "c1",
    name: "Ahmet Yılmaz",
    phone: "0532 555 01 42",
    email: "ahmet.yilmaz@ornek.com",
  },
  {
    id: "c2",
    name: "Ayşe Demir",
    phone: "0533 555 04 56",
    email: "ayse.demir@ornek.com",
  },
  { id: "c3", name: "Murat Kaya", phone: "0534 555 07 89" },
  { id: "c4", name: "Selin Acar", phone: "0535 555 20 26" },
  { id: "c5", name: "Emre Koç", phone: "0536 555 02 46" },
  { id: "c6", name: "Zeynep Şen", phone: "0537 555 03 57" },
  { id: "c7", name: "Cem Arslan", phone: "0538 555 04 68" },
  { id: "c8", name: "Deniz Yıldız", phone: "0539 555 05 79" },
];
export const vehicles: readonly Vehicle[] = [
  {
    id: "v1",
    plate: "31 ABC 123",
    brand: "Renault",
    model: "Renault Megane",
    year: 2020,
    mileage: 99200,
    fuelType: "Dizel",
    active: true,
    customerId: "c1",
    lastService: {
      date: "7 Ekim 2026",
      title: "Motor arıza tespiti",
      mileage: 99200,
    },
  },
  {
    id: "v2",
    plate: "34 XYZ 456",
    brand: "Ford",
    model: "Ford Focus",
    year: 2019,
    mileage: 85100,
    fuelType: "Dizel",
    active: true,
    customerId: "c2",
    lastService: {
      date: "12 Ağustos 2026",
      title: "Periyodik bakım",
      mileage: 82400,
    },
  },
  {
    id: "v3",
    plate: "01 ACB 789",
    brand: "Fiat",
    model: "Fiat Egea",
    year: 2022,
    mileage: 48000,
    fuelType: "Benzin",
    active: true,
    customerId: "c3",
    lastService: {
      date: "4 Eylül 2026",
      title: "Yağ ve filtre bakımı",
      mileage: 45600,
    },
  },
  {
    id: "v4",
    plate: "06 TR 2026",
    brand: "Volkswagen",
    model: "Volkswagen Passat",
    year: 2021,
    mileage: 79500,
    fuelType: "Dizel",
    active: true,
    customerId: "c4",
    lastService: {
      date: "6 Temmuz 2026",
      title: "Fren kontrolü",
      mileage: 76800,
    },
  },
  {
    id: "v5",
    plate: "31 DEF 246",
    brand: "Toyota",
    model: "Toyota Corolla",
    year: 2020,
    mileage: 104500,
    fuelType: "Hibrit",
    active: true,
    customerId: "c5",
    lastService: {
      date: "8 Haziran 2026",
      title: "Periyodik bakım",
      mileage: 102000,
    },
  },
  {
    id: "v6",
    plate: "31 GHI 357",
    brand: "Renault",
    model: "Renault Clio",
    year: 2018,
    mileage: 91200,
    fuelType: "Benzin",
    active: true,
    customerId: "c6",
    lastService: {
      date: "14 Temmuz 2026",
      title: "Klima kontrolü",
      mileage: 88400,
    },
  },
  {
    id: "v7",
    plate: "01 JKL 468",
    brand: "Opel",
    model: "Opel Astra",
    year: 2021,
    mileage: 64400,
    fuelType: "Dizel",
    active: true,
    customerId: "c7",
    lastService: {
      date: "11 Eylül 2026",
      title: "Akü değişimi",
      mileage: 62000,
    },
  },
  {
    id: "v8",
    plate: "34 MNO 579",
    brand: "Peugeot",
    model: "Peugeot 308",
    year: 2023,
    mileage: 26700,
    fuelType: "Benzin",
    active: true,
    customerId: "c8",
    lastService: {
      date: "19 Ağustos 2026",
      title: "Periyodik bakım",
      mileage: 24500,
    },
  },
  {
    id: "v9",
    plate: "31 ISK 010",
    brand: "Skoda",
    model: "Skoda Octavia",
    year: 2021,
    mileage: 92000,
    fuelType: "Dizel",
    active: true,
    customerId: "c5",
    lastService: {
      date: "14 Ağustos 2026",
      title: "Genel kontrol",
      mileage: 92000,
    },
  },
  {
    id: "v10",
    plate: "31 ISK 020",
    brand: "Honda",
    model: "Honda Civic",
    year: 2022,
    mileage: 58000,
    fuelType: "LPG",
    active: true,
    customerId: "c6",
    lastService: { date: "22 Eylül 2026", title: "Yağ bakımı", mileage: 58000 },
  },
  {
    id: "v11",
    plate: "31 KLM 222",
    brand: "Hyundai",
    model: "Hyundai i20",
    year: 2021,
    mileage: 48000,
    fuelType: "Benzin",
    active: true,
    customerId: "c1",
    lastService: {
      date: "20 Mayıs 2026",
      title: "Periyodik bakım",
      mileage: 48000,
    },
  },
  {
    id: "v12",
    plate: "34 BM 456",
    brand: "BMW",
    model: "BMW 320i",
    year: 2020,
    mileage: 64000,
    fuelType: "Benzin",
    active: true,
    customerId: "c2",
    lastService: {
      date: "2 Haziran 2026",
      title: "Fren kontrolü",
      mileage: 64000,
    },
  },
  {
    id: "v13",
    plate: "31 OLD 111",
    brand: "Fiat",
    model: "Fiat Egea",
    year: 2017,
    mileage: 142000,
    fuelType: "Dizel",
    active: false,
    customerId: "c1",
    lastService: {
      date: "14 Ocak 2026",
      title: "Triger ve ağır bakım",
      mileage: 142000,
    },
  },
];

const mainHistory: readonly TimelineEntry[] = [
  { id: "h1", time: "09:12", text: "Araç kabul edildi" },
  { id: "h2", time: "09:18", text: "Mehmet Usta ana usta olarak atandı" },
  { id: "h3", time: "09:44", text: "Teşhis başladı · Arıza tespiti kaydedildi" },
  { id: "h4", time: "10:05", text: "Ön fren balatası ve disk değişimi önerildi" },
  { id: "h5", time: "10:12", text: "Teklif müşteriye sunuldu" },
  { id: "h6", time: "10:25", text: "Müşteri onayladı · WhatsApp üzerinden müşteri onayı kaydedildi" },
  { id: "h7", time: "10:41", text: "Stoktan Ön Fren Balatası kullanıldı" },
  { id: "h8", time: "11:15", text: "Stoktan Fren Disk Seti kullanıldı" },
  { id: "h9", time: "13:20", text: "5.000 TL tahsilat alındı" },
];

function sampleOrder(
  input: Pick<
    WorkOrder,
    "id" | "vehicleId" | "customerId" | "status" | "technicianId"
  > &
    Partial<WorkOrder>,
): WorkOrder {
  const isPending = input.status === "AWAITING_APPROVAL";
  return {
    branchId: "dortyol",
    assigneeIds: [input.technicianId],
    createdAt: "2026-10-21T09:00:00+03:00",
    dueAt: "2026-10-21T18:00:00+03:00",
    updatedLabel: "25 dk önce",
    stageDuration: "1 saat",
    complaint: "Periyodik kontrol ve bakım talebi.",
    diagnosis: "Kontrol sonuçları iş emrinde takip ediliyor.",
    intakeMileage: 105000,
    fuel: 50,
    labor: [{ id: "l1", name: "Servis ve kontrol işlemleri", amount: 2500 }],
    parts: [],
    total: 2500,
    paid: 0,
    quoteRevision: 1,
    approval: isPending ? "PENDING" : "APPROVED",
    approvalChannel: "Telefon",
    quoteStatus: isPending ? "PENDING_APPROVAL" : "APPROVED",
    quoteItems: [],
    partRequests: [],
    notes: [],
    additionalCosts: 0,
    timeline: [{ id: "h1", time: "09:00", text: "Araç kabul edildi" }],
    ...input,
  };
}

export const initialWorkOrders: readonly WorkOrder[] = [
  sampleOrder({
    id: "WO-2026-00142",
    vehicleId: "v1",
    customerId: "c1",
    status: "IN_PROGRESS",
    technicianId: "mehmet",
    assigneeIds: ["mehmet", "ali"],
    createdAt: "2026-10-21T09:12:00+03:00",
    dueAt: "2026-10-21T17:30:00+03:00",
    updatedLabel: "12 dk önce",
    stageDuration: "2 saat",
    complaint: "Fren yaparken özellikle düşük hızda sürtme sesi geliyor.",
    diagnosis: "Ön fren balatalarında aşınma görüldü. Disk kontrol ediliyor.",
    intakeMileage: 98450,
    fuel: 45,
    intake: {
      damage: "Sağ arka tampon köşesinde hafif sürtme izi.",
      keyCount: 1,
      leftItems: "Ruhsat, çocuk koltuğu",
      inspection: {
        lights: "normal",
        signals: "normal",
        tires: "check",
        windows: "normal",
        mirrors: "normal",
        bodywork: "damaged",
        interior: "normal",
      },
      checklist: {
        registration: "yes",
        key: "yes",
        spare: "yes",
        tools: "yes",
        valuables: "yes",
      },
      photos: [],
    },
    labor: [
      { id: "l1", name: "Ön Fren Balatası Değişimi", amount: 1500 },
      { id: "l2", name: "Fren Sistemi Kontrolü", amount: 500 },
    ],
    parts: [
      {
        id: "p1",
        name: "Ön Fren Balatası",
        quantity: 1,
        price: 3500,
        historicCost: 2100,
        state: "CONSUMED",
      },
      {
        id: "p2",
        name: "Fren Temizleyici",
        quantity: 1,
        price: 350,
        historicCost: 100,
        state: "RESERVED",
      },
      {
        id: "p3",
        name: "Fren Disk Seti",
        quantity: 1,
        price: 2650,
        historicCost: 500,
        state: "CONSUMED",
      },
    ],
    quoteStatus: "APPROVED",
    quoteItems: [
      {
        id: "qi-1",
        operation: "Ön Fren Balatası Değişimi",
        laborAmount: 1500,
        partId: "part-1",
        partName: "Ön Fren Balatası",
        quantity: 1,
        unitPrice: 3500,
        total: 5000,
        note: "Orijinal ekipman balata seti",
        status: "APPROVED",
      },
      {
        id: "qi-2",
        operation: "Fren Sistemi Kontrolü & Disk Değişimi",
        laborAmount: 500,
        partName: "Fren Disk Seti + Fren Temizleyici",
        quantity: 1,
        unitPrice: 3000,
        total: 3500,
        note: "Torna yerine yeni disk seti uygulandı",
        status: "APPROVED",
      },
    ],
    partRequests: [
      {
        id: "pr-1",
        orderId: "WO-2026-00142",
        partId: "part-1",
        partName: "Ön Fren Balatası",
        quantity: 1,
        requestedBy: "Mehmet Usta",
        requestedAt: "10:05",
        status: "DELIVERED",
        note: "Ön aks için acil",
      },
    ],
    notes: [
      {
        id: "note-1",
        text: "Sağ ön disk de kontrol edilmeli. Kaliper pimlerinde hafif boşluk var.",
        author: "Mehmet Usta",
        role: "Usta",
        createdAt: "21 Ekim 2026 · 10:18",
        internal: true,
      },
    ],
    total: 8500,
    paid: 5000,
    quoteRevision: 2,
    approvalChannel: "WhatsApp",
    timeline: mainHistory,
  }),
  sampleOrder({
    id: "WO-2026-00143",
    vehicleId: "v2",
    customerId: "c2",
    status: "AWAITING_APPROVAL",
    technicianId: "ali",
    complaint: "Fren pedalında titreşim var.",
    total: 8500,
    labor: [{ id: "l1", name: "Teklif edilen fren işlemleri", amount: 8500 }],
    quoteStatus: "PENDING_APPROVAL",
    quoteItems: [
      {
        id: "qi-143-1",
        operation: "Ön Disk & Balata Yenileme",
        laborAmount: 2200,
        partId: "part-1",
        partName: "Ön Fren Balatası + Disk Takımı",
        quantity: 2,
        unitPrice: 3150,
        total: 8500,
        note: "Yüksek hızda pedal titreşimi için takım değişim önerildi",
        status: "PENDING",
      },
    ],
    dueAt: "2026-10-21T18:00:00+03:00",
    intakeMileage: 85100,
  }),
  sampleOrder({
    id: "WO-2026-00139",
    vehicleId: "v3",
    customerId: "c3",
    status: "READY",
    technicianId: "mehmet",
    paid: 2500,
    dueAt: "2026-10-21T16:00:00+03:00",
    intakeMileage: 48000,
  }),
  sampleOrder({
    id: "WO-2026-00140",
    vehicleId: "v4",
    customerId: "c4",
    status: "WAITING_PARTS",
    technicianId: "ayse",
    complaint: "Klima yeterli soğutmuyor.",
    diagnosis: "Klima hattı parçası bekleniyor.",
    dueAt: "2026-10-21T14:00:00+03:00",
    intakeMileage: 79500,
    partRequests: [
      {
        id: "pr-140-1",
        orderId: "WO-2026-00140",
        partName: "Klima Basınç Valfi",
        quantity: 1,
        requestedBy: "Ayşe Usta",
        requestedAt: "11:20",
        status: "REQUESTED",
        note: "Tedarikçiden gün içi teslim bekleniyor",
      },
    ],
  }),
  sampleOrder({
    id: "WO-2026-00144",
    vehicleId: "v5",
    customerId: "c5",
    status: "IN_PROGRESS",
    technicianId: "mehmet",
    assigneeIds: ["mehmet", "ahmet"],
    dueAt: "2026-10-22T11:00:00+03:00",
    intakeMileage: 104500,
  }),
  sampleOrder({
    id: "WO-2026-00145",
    vehicleId: "v6",
    customerId: "c6",
    status: "IN_PROGRESS",
    technicianId: "ayse",
    dueAt: "2026-10-21T18:30:00+03:00",
    intakeMileage: 91200,
  }),
  sampleOrder({
    id: "WO-2026-00146",
    vehicleId: "v7",
    customerId: "c7",
    status: "AWAITING_APPROVAL",
    technicianId: "ali",
    dueAt: "2026-10-22T10:00:00+03:00",
    intakeMileage: 64400,
  }),
  sampleOrder({
    id: "WO-2026-00138",
    vehicleId: "v8",
    customerId: "c8",
    status: "READY",
    technicianId: "mehmet",
    assigneeIds: ["mehmet", "ahmet"],
    dueAt: "2026-10-21T15:00:00+03:00",
    intakeMileage: 26700,
  }),
  sampleOrder({
    id: "WO-2026-00147",
    vehicleId: "v9",
    customerId: "c5",
    branchId: "iskenderun",
    status: "DIAGNOSIS",
    technicianId: "ayse",
    intakeMileage: 104500,
  }),
  sampleOrder({
    id: "WO-2026-00148",
    vehicleId: "v10",
    customerId: "c6",
    branchId: "iskenderun",
    status: "RECEIVED",
    technicianId: "ali",
    intakeMileage: 91200,
  }),
];

export const approvalExample = {
  date: "21 Ekim 2026 · 14:32",
  recordedBy: "Ahmet",
};
export const paymentExample = {
  date: "21 Ekim 2026 · 15:12",
  method: "Kredi Kartı",
};

export const appointments = [
  {
    time: "09:30",
    plate: "31 KLM 222",
    service: "Periyodik Bakım",
    technician: "Mehmet Usta",
    branchId: "dortyol",
  },
  {
    time: "11:00",
    plate: "34 BM 456",
    service: "Fren Kontrolü",
    technician: "Ali Usta",
    branchId: "dortyol",
  },
  {
    time: "14:30",
    plate: "01 SD 789",
    service: "Klima",
    technician: "Ayşe Usta",
    branchId: "dortyol",
  },
  {
    time: "16:00",
    plate: "31 AA 123",
    service: "Genel Kontrol",
    technician: "Ayşe Usta",
    branchId: "iskenderun",
  },
] as const;
export const financialSummary: Record<
  BranchId,
  { collected: number; balance: number; revenue: number }
> = {
  dortyol: { collected: 18500, balance: 24750, revenue: 184500 },
  iskenderun: { collected: 6000, balance: 8500, revenue: 62500 },
};
export const demoAlerts = {
  stock: { name: "Ön Fren Balatası", available: 1, minimum: 3 },
  maintenance: { plate: "34 XYZ 456", days: 7 },
} as const;

export function vehicleFor(order: WorkOrder) {
  return vehicles.find((v) => v.id === order.vehicleId)!;
}
export function customerFor(order: WorkOrder) {
  return customers.find((c) => c.id === order.customerId)!;
}
export function technicianFor(id: string) {
  return technicians.find((t) => t.id === id)!;
}
export function branchName(id: BranchId) {
  return branches.find((b) => b.id === id)!.name;
}
export function isActive(status: WorkOrderStatus) {
  return status !== "DELIVERED" && status !== "CANCELLED";
}
export function isOverdue(order: WorkOrder) {
  return (
    isActive(order.status) && Date.parse(order.dueAt) < Date.now()
  );
}
const moneyFormatter = new Intl.NumberFormat("tr-TR", {
  maximumFractionDigits: 2,
});
const numberFormatter = new Intl.NumberFormat("tr-TR");
const istanbulDateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Istanbul",
});
const istanbulPartsFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const istanbulTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  hour: "2-digit",
  minute: "2-digit",
});

let cachedDayStamp = 0;
let cachedTodayKey = "";
let cachedTomorrowKey = "";
const deliveryCache = new Map<string, string>();

function getDayKeys() {
  const now = Date.now();
  if (now - cachedDayStamp > 60_000) {
    cachedDayStamp = now;
    const today = new Date(now);
    const tomorrow = new Date(now + 86_400_000);
    cachedTodayKey = istanbulDateFormatter.format(today);
    cachedTomorrowKey = istanbulDateFormatter.format(tomorrow);
    deliveryCache.clear();
  }
  return { todayKey: cachedTodayKey, tomorrowKey: cachedTomorrowKey };
}

export function money(value: number) {
  return moneyFormatter.format(value) + " TL";
}
export function number(value: number) {
  return numberFormatter.format(value);
}
export function deliveryLabel(value: string) {
  const { todayKey, tomorrowKey } = getDayKeys();
  const cached = deliveryCache.get(value);
  if (cached !== undefined) return cached;
  const date = new Date(value);
  const parts = istanbulPartsFormatter.formatToParts(date);
  let day = "";
  let month = "";
  let year = "";
  for (const part of parts) {
    if (part.type === "day") day = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "year") year = part.value;
  }
  const localDate = `${year}-${month}-${day}`;
  const time = istanbulTimeFormatter.format(date);
  const label = `${localDate === todayKey ? "Bugün" : localDate === tomorrowKey ? "Yarın" : `${day}.${month}`} ${time}`;
  deliveryCache.set(value, label);
  return label;
}
const turkishUpperMap: Record<string, string> = {
  Ç: "C",
  Ğ: "G",
  İ: "I",
  Ö: "O",
  Ş: "S",
  Ü: "U",
  ç: "C",
  ğ: "G",
  i: "I",
  ı: "I",
  ö: "O",
  ş: "S",
  ü: "U",
};
export function normalizeSearch(value: string) {
  if (!value) return "";
  return value
    .replace(/[ÇĞİÖŞÜçğiıöşü]/g, (letter) => turkishUpperMap[letter] ?? letter)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
export function formatPlate(value: string) {
  const normalized = normalizeSearch(value);
  const match = normalized.match(/^(\d{2})([A-ZÇĞİÖŞÜ]{1,4})(\d{2,4})$/);
  return match ? `${match[1]} ${match[2]} ${match[3]}` : null;
}

export function defaultAppointmentTime() {
  const { tomorrowKey } = getDayKeys();
  return `${tomorrowKey}T09:00`;
}

export function nowTimeLabel(date: Date = new Date()) {
  return istanbulTimeFormatter.format(date);
}

const istanbulLongDateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function nowDateTimeLabel(date: Date = new Date()) {
  return `${istanbulLongDateFormatter.format(date)} · ${istanbulTimeFormatter.format(date)}`;
}

export function effectiveQuoteStatus(order: WorkOrder): QuoteStatus {
  if (order.quoteStatus) return order.quoteStatus;
  if (order.quoteRevision === 0 && !(order.quoteItems?.length ?? 0)) {
    return "DRAFT";
  }
  return order.approval === "APPROVED" ? "APPROVED" : "PENDING_APPROVAL";
}

export function pendingApprovalAmount(order: WorkOrder): number {
  const items = order.quoteItems ?? [];
  if (items.length > 0) {
    const pendingItemsTotal = items
      .filter((item) => item.status === "PENDING")
      .reduce((sum, item) => sum + item.total, 0);
    if (pendingItemsTotal > 0) return Math.round(pendingItemsTotal * 100) / 100;
  }
  const qStatus = effectiveQuoteStatus(order);
  if (
    order.approval === "PENDING" ||
    qStatus === "PENDING_APPROVAL" ||
    qStatus === "DRAFT"
  ) {
    return order.total;
  }
  return 0;
}
