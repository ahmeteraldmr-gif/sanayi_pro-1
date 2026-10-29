export interface PlatformPackage {
  id: string;
  name: string;
  code: "baslangic" | "standart" | "pro";
  priceMonthly: number;
  priceYearly: number;
  defaultDays: number;
  description: string;
  features: string[];
  active: boolean;
  maxBranches: number | "unlimited";
  maxUsers: number | "unlimited";
}

export interface PlatformBusiness {
  id: string;
  organizationId: string;
  name: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  packageId: string;
  packageName: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;   // ISO date string YYYY-MM-DD
  isSuspended: boolean;
  loginEmail: string;
  createdAt: string;
  paymentPending: boolean;
  pendingAmount?: number;
  trade?: string;
}

export interface SubscriptionHistoryRecord {
  id: string;
  businessId: string;
  businessName: string;
  daysAdded: number;
  previousEndDate: string;
  newEndDate: string;
  extendedBy: string;
  createdAt: string;
  note?: string;
}

export interface PlatformPaymentRecord {
  id: string;
  businessId: string;
  businessName: string;
  packageId: string;
  packageName: string;
  amount: number;
  paymentDate: string;
  paymentMethod: "Havale/EFT" | "Kredi Kartı" | "Nakit" | "Diğer";
  status: "COMPLETED" | "PENDING";
  notes?: string;
  invoiceNo?: string;
}

export type BusinessStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "SUSPENDED";

export const PLATFORM_PACKAGES: PlatformPackage[] = [
  {
    id: "pkg-baslangic",
    name: "Başlangıç Paketi",
    code: "baslangic",
    priceMonthly: 1490,
    priceYearly: 14900,
    defaultDays: 30,
    description: "Küçük ölçekli tek şubeli atölyeler ve yeni başlayan servisler için temel paket.",
    features: [
      "1 Şube",
      "3 Personel Hesabı",
      "Dijital Araç Kabul & İş Emri",
      "Müşteri ve Araç Geçmişi",
      "Temel İş Durum Takibi",
      "Standart E-posta Desteği",
    ],
    active: true,
    maxBranches: 1,
    maxUsers: 3,
  },
  {
    id: "pkg-standart",
    name: "Standart Paket",
    code: "standart",
    priceMonthly: 2890,
    priceYearly: 28900,
    defaultDays: 90,
    description: "Büyüyen servisler için parça, stok ve randevu yönetimini içeren ideal çözüm.",
    features: [
      "2 Şube Desteği",
      "10 Personel Hesabı",
      "Stok ve Kritik Parça Uyarıları",
      "Randevu Takvimi",
      "Teklif ve Müşteri Onay Takibi",
      "WhatsApp & SMS Bildirim Altyapısı",
      "Öncelikli Telefon Desteği",
    ],
    active: true,
    maxBranches: 2,
    maxUsers: 10,
  },
  {
    id: "pkg-pro",
    name: "Pro Paket",
    code: "pro",
    priceMonthly: 4490,
    priceYearly: 44900,
    defaultDays: 365,
    description: "Tam yetkili, çok şubeli servisler için plaka okuma, yapay zeka ve eksiksiz finans paketi.",
    features: [
      "Sınırsız Şube",
      "Sınırsız Personel Hesabı",
      "Kamera ile Plaka Okuma (OCR)",
      "Hazır Bakım Şablonları & Hızlı İşlem Masası",
      "Detaylı Gelir / Gider & Bakiye Takibi",
      "Performans ve Verimlilik Raporları",
      "7/24 Kesintisiz VIP Destek & Yedekleme",
    ],
    active: true,
    maxBranches: "unlimited",
    maxUsers: "unlimited",
  },
];

// Helper: Calculate remaining days
export function calculateRemainingDays(endDate: string, fromDateStr = "2026-10-27"): number {
  const target = new Date(endDate);
  const from = new Date(fromDateStr);
  const diffTime = target.getTime() - from.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Helper: Calculate business status
export function calculateBusinessStatus(
  endDate: string,
  isSuspended: boolean,
  fromDateStr = "2026-10-27",
): BusinessStatus {
  if (isSuspended) return "SUSPENDED";
  const days = calculateRemainingDays(endDate, fromDateStr);
  if (days <= 0) return "EXPIRED";
  if (days <= 7) return "EXPIRING_SOON";
  return "ACTIVE";
}

export const STATUS_LABELS: Record<
  BusinessStatus,
  { label: string; tone: "success" | "warning" | "danger" | "neutral"; badgeClass: string }
> = {
  ACTIVE: { label: "Aktif", tone: "success", badgeClass: "badge-active" },
  EXPIRING_SOON: { label: "Süresi Yaklaşıyor", tone: "warning", badgeClass: "badge-expiring" },
  EXPIRED: { label: "Süresi Doldu", tone: "danger", badgeClass: "badge-expired" },
  SUSPENDED: { label: "Askıya Alındı", tone: "neutral", badgeClass: "badge-suspended" },
};

// Initial Seed Data for SanayiPro SaaS Platform
export const INITIAL_BUSINESSES: PlatformBusiness[] = [
  {
    id: "biz-yilmaz",
    organizationId: "00000000-0000-0000-0000-000000000001",
    name: "Yılmaz Oto Servis",
    ownerName: "Mehmet Yılmaz",
    phone: "0532 411 22 33",
    email: "yilmazoto@sanayipro.com",
    address: "Sanayi Sitesi 4. Blok No:12",
    city: "Hatay",
    district: "Dörtyol",
    packageId: "pkg-pro",
    packageName: "Pro Paket",
    startDate: "2026-10-01",
    endDate: "2026-11-01", // 5 days remaining
    isSuspended: false,
    loginEmail: "admin@sanayipro.com",
    createdAt: "2026-04-10",
    paymentPending: false,
    trade: "Motor & Mekanik",
  },
  {
    id: "biz-akboga",
    organizationId: "00000000-0000-0000-0000-000000000002",
    name: "Akboğa Oto",
    ownerName: "Ali Akboğa",
    phone: "0533 555 44 22",
    email: "akboga@sanayipro.com",
    address: "Modern Sanayi Sitesi C-2 Blok No:8",
    city: "Hatay",
    district: "İskenderun",
    packageId: "pkg-standart",
    packageName: "Standart Paket",
    startDate: "2026-07-29",
    endDate: "2026-10-29", // 2 days remaining
    isSuspended: false,
    loginEmail: "ali.akboga@sanayipro.com",
    createdAt: "2026-07-29",
    paymentPending: true,
    pendingAmount: 2890,
  },
  {
    id: "biz-toros",
    organizationId: "00000000-0000-0000-0000-000000000003",
    name: "Toros Dizel Pompa",
    ownerName: "Mustafa Toros",
    phone: "0542 333 11 00",
    email: "toros@sanayipro.com",
    address: "Yeni Sanayi Sitesi 12. Cadde No:4",
    city: "Mersin",
    district: "Tarsus",
    packageId: "pkg-baslangic",
    packageName: "Başlangıç Paketi",
    startDate: "2026-09-20",
    endDate: "2026-10-25", // 0 days remaining (Expired)
    isSuspended: false,
    loginEmail: "mustafa.toros@sanayipro.com",
    createdAt: "2026-09-20",
    paymentPending: true,
    pendingAmount: 1490,
  },
  {
    id: "biz-cukurova",
    organizationId: "00000000-0000-0000-0000-000000000004",
    name: "Çukurova Egzoz & Fren",
    ownerName: "Selim Çukurova",
    phone: "0505 888 77 66",
    email: "cukurova@sanayipro.com",
    address: "Küçük Sanayi Sitesi 3. Kısım",
    city: "Hatay",
    district: "Antakya",
    packageId: "pkg-standart",
    packageName: "Standart Paket",
    startDate: "2026-06-01",
    endDate: "2026-12-01",
    isSuspended: true, // Suspended by admin
    loginEmail: "selim.cukurova@sanayipro.com",
    createdAt: "2026-06-01",
    paymentPending: false,
  },
  {
    id: "biz-kardesler",
    organizationId: "00000000-0000-0000-0000-000000000005",
    name: "Kardeşler Oto Mekanik",
    ownerName: "Hasan Kardeş",
    phone: "0535 222 99 88",
    email: "kardesler@sanayipro.com",
    address: "Yeşiloba Sanayi Sitesi 18. Sok. No:5",
    city: "Adana",
    district: "Seyhan",
    packageId: "pkg-pro",
    packageName: "Pro Paket",
    startDate: "2026-10-15",
    endDate: "2027-01-15",
    isSuspended: false,
    loginEmail: "hasan.kardes@sanayipro.com",
    createdAt: "2026-10-15",
    paymentPending: false,
  },
  {
    id: "biz-yildiz",
    organizationId: "00000000-0000-0000-0000-000000000006",
    name: "Yıldız Bosch Car Service",
    ownerName: "Burak Yıldız",
    phone: "0530 111 22 33",
    email: "yildiz@sanayipro.com",
    address: "KÜSGET Sanayi Sitesi A Blok No:14",
    city: "Gaziantep",
    district: "Şehitkamil",
    packageId: "pkg-pro",
    packageName: "Pro Paket",
    startDate: "2026-08-10",
    endDate: "2027-08-10",
    isSuspended: false,
    loginEmail: "burak.yildiz@sanayipro.com",
    createdAt: "2026-08-10",
    paymentPending: false,
  },
  {
    id: "biz-ugur",
    organizationId: "00000000-0000-0000-0000-000000000007",
    name: "Uğur Motor Revizyon",
    ownerName: "Uğur Can",
    phone: "0534 777 66 55",
    email: "ugurmotor@sanayipro.com",
    address: "Oto Sanatkarları Sanayi Sitesi 2. Cadde",
    city: "Konya",
    district: "Selçuklu",
    packageId: "pkg-standart",
    packageName: "Standart Paket",
    startDate: "2026-09-01",
    endDate: "2026-10-31", // 4 days remaining
    isSuspended: false,
    loginEmail: "ugur.can@sanayipro.com",
    createdAt: "2026-09-01",
    paymentPending: false,
  },
  {
    id: "biz-aslan",
    organizationId: "00000000-0000-0000-0000-000000000008",
    name: "Aslan Kardeşler Kaporta Boya",
    ownerName: "Kemal Aslan",
    phone: "0536 999 00 11",
    email: "aslanoto@sanayipro.com",
    address: "Büyük Sanayi 1. Cadde No:22",
    city: "Ankara",
    district: "İskitler",
    packageId: "pkg-baslangic",
    packageName: "Başlangıç Paketi",
    startDate: "2026-09-26",
    endDate: "2026-10-26", // Expired 1 day ago
    isSuspended: false,
    loginEmail: "kemal.aslan@sanayipro.com",
    createdAt: "2026-09-26",
    paymentPending: true,
    pendingAmount: 1490,
  },
];

export const INITIAL_EXTENSION_LOGS: SubscriptionHistoryRecord[] = [
  {
    id: "ext-1",
    businessId: "biz-yilmaz",
    businessName: "Yılmaz Oto Servis",
    daysAdded: 30,
    previousEndDate: "2026-10-01",
    newEndDate: "2026-11-01",
    extendedBy: "Platform Yöneticisi",
    createdAt: "2026-09-30T10:14:00+03:00",
    note: "Aylık Pro paket yenilemesi",
  },
  {
    id: "ext-2",
    businessId: "biz-kardesler",
    businessName: "Kardeşler Oto Mekanik",
    daysAdded: 90,
    previousEndDate: "2026-10-15",
    newEndDate: "2027-01-15",
    extendedBy: "Platform Yöneticisi",
    createdAt: "2026-10-14T14:30:00+03:00",
    note: "3 aylık Pro paket peşin ödeme",
  },
];

export const INITIAL_PLATFORM_PAYMENTS: PlatformPaymentRecord[] = [
  {
    id: "pay-101",
    businessId: "biz-yilmaz",
    businessName: "Yılmaz Oto Servis",
    packageId: "pkg-pro",
    packageName: "Pro Paket",
    amount: 4490,
    paymentDate: "2026-10-01",
    paymentMethod: "Kredi Kartı",
    status: "COMPLETED",
    invoiceNo: "SP-2026-0089",
    notes: "Ekim 2026 Pro Paket abonelik tahsilatı",
  },
  {
    id: "pay-102",
    businessId: "biz-kardesler",
    businessName: "Kardeşler Oto Mekanik",
    packageId: "pkg-pro",
    packageName: "Pro Paket",
    amount: 11990,
    paymentDate: "2026-10-15",
    paymentMethod: "Havale/EFT",
    status: "COMPLETED",
    invoiceNo: "SP-2026-0094",
    notes: "3 aylık Pro paket abonelik ücreti",
  },
  {
    id: "pay-103",
    businessId: "biz-akboga",
    businessName: "Akboğa Oto",
    packageId: "pkg-standart",
    packageName: "Standart Paket",
    amount: 2890,
    paymentDate: "2026-10-27",
    paymentMethod: "Havale/EFT",
    status: "PENDING",
    notes: "Yenileme faturası gönderildi, dekont bekleniyor",
  },
  {
    id: "pay-104",
    businessId: "biz-toros",
    businessName: "Toros Dizel Pompa",
    packageId: "pkg-baslangic",
    packageName: "Başlangıç Paketi",
    amount: 1490,
    paymentDate: "2026-10-25",
    paymentMethod: "Havale/EFT",
    status: "PENDING",
    notes: "Süresi doldu, müşteri arandı, ödeme sözü alındı",
  },
];
