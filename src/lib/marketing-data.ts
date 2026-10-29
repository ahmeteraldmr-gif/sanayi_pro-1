export const navigation = [
  { label: "Nasıl Çalışır", href: "#nasil-calisir" },
  { label: "Ürün Akışı", href: "#urun-akisi" },
  { label: "Kimler İçin", href: "#kimler-icin" },
  { label: "Sık Sorulanlar", href: "#sik-sorulanlar" },
] as const;

export type DemoStatus =
  "İşlemde" | "Onay Bekliyor" | "Parça Bekliyor" | "Teslime Hazır";
export type DemoVehicle = {
  plate: string;
  model: string;
  technician: string;
  status: DemoStatus;
};

// All people, plates and amounts below are fictional presentation data.
export const demoVehicles: readonly DemoVehicle[] = [
  {
    plate: "31 ABC 123",
    model: "Renault Megane",
    technician: "Mehmet Usta",
    status: "İşlemde",
  },
  {
    plate: "34 XYZ 456",
    model: "Ford Focus",
    technician: "Ali Usta",
    status: "Onay Bekliyor",
  },
  {
    plate: "01 ACB 789",
    model: "Fiat Egea",
    technician: "Mehmet Usta",
    status: "Teslime Hazır",
  },
  {
    plate: "31 DEF 246",
    model: "Toyota Corolla",
    technician: "Ali Usta",
    status: "İşlemde",
  },
  {
    plate: "31 GHI 357",
    model: "Volkswagen Golf",
    technician: "Mehmet Usta",
    status: "Parça Bekliyor",
  },
  {
    plate: "01 JKL 468",
    model: "Opel Astra",
    technician: "Ali Usta",
    status: "Onay Bekliyor",
  },
  {
    plate: "34 MNO 579",
    model: "Peugeot 308",
    technician: "Mehmet Usta",
    status: "İşlemde",
  },
  {
    plate: "31 PRS 680",
    model: "Honda Civic",
    technician: "Ali Usta",
    status: "Teslime Hazır",
  },
];

export const workflowSteps = [
  {
    title: "Araç Kabul",
    description:
      "Kilometre, şikâyet ve giriş fotoğrafları aynı kabul kaydında.",
    status: "Araç Kabul Edildi",
  },
  {
    title: "Tespit",
    description: "Arıza tespiti ve yapılacak işlemler iş emrine kaydedilir.",
    status: "Arıza Tespiti",
  },
  {
    title: "Müşteri Onayı",
    description:
      "Teklifin hangi tutarla ve hangi kanaldan onaylandığı korunur.",
    status: "Onay Bekliyor",
  },
  {
    title: "İşlem",
    description:
      "Usta, işçilik ve kullanılan parçalar aynı işin içinde takip edilir.",
    status: "İşlemde",
  },
  {
    title: "Son Kontrol",
    description: "Tamamlanan işlemler teslim öncesinde gözden geçirilir.",
    status: "Son Kontrol",
  },
  {
    title: "Teslime Hazır",
    description:
      "Hazır araçlar görünür olur; teslim için sonraki adım netleşir.",
    status: "Teslime Hazır",
  },
  {
    title: "Teslim",
    description:
      "Araç teslimi kaydedilir; servis geçmişi ve açık hesap korunur.",
    status: "Teslim Edildi",
  },
] as const;

export const serviceHistory = [
  {
    date: "12 Mart 2026",
    mileage: "90.000 km",
    title: "Yağ + filtre bakımı",
    note: "Periyodik bakım",
  },
  {
    date: "18 Haziran 2026",
    mileage: "94.600 km",
    title: "Ön fren sistemi",
    note: "Balata kontrolü ve değişim",
  },
  {
    date: "7 Ekim 2026",
    mileage: "99.200 km",
    title: "Motor arıza tespiti",
    note: "Arıza tespiti ve kontrol",
  },
] as const;

export const stockExamples = [
  {
    name: "Yağ Filtresi",
    code: "YF-014",
    physical: 8,
    reserved: 2,
    available: 6,
  },
  {
    name: "Ön Fren Balatası",
    code: "FB-028",
    physical: 3,
    reserved: 2,
    available: 1,
  },
] as const;

export const teamExamples = [
  {
    status: "Onay Bekliyor",
    plate: "31 ABC 123",
    customer: "Ahmet Yılmaz",
    technician: "Mehmet Usta",
    initials: "MU",
    note: "Teklif yanıtı bekleniyor",
    tone: "warning",
  },
  {
    status: "Parça Bekliyor",
    plate: "34 XYZ 456",
    customer: "Ayşe Demir",
    technician: "Ali Usta",
    initials: "AU",
    note: "Ön fren balatası",
    tone: "warning",
  },
  {
    status: "Teslime Hazır",
    plate: "01 AAA 001",
    customer: "Murat Kaya",
    technician: "Mehmet Usta",
    initials: "MU",
    note: "Son kontrol tamamlandı",
    tone: "success",
  },
] as const;

export const specialties = [
  "Motor & Mekanik",
  "Oto Elektrik",
  "Fren Sistemleri",
  "Klima",
  "Kaporta & Boya",
  "Lastik & Rot Balans",
] as const;

export const faqs = [
  {
    question: "SanayiPro hangi servis türleri için uygun?",
    answer:
      "Motor, mekanik, elektrik, klima, fren, kaporta ve lastik gibi farklı alanlarda çalışan genel oto servisleri için uygundur. Ortak araç kabul ve iş emri akışı, işletmenin uzmanlıklarıyla birlikte kullanılacak şekilde tasarlandı.",
  },
  {
    question: "Birden fazla şube kullanabilir mi?",
    answer:
      "Bir işletme birden fazla şubeye sahip olabilir. Müşteri ve araç kayıtları işletme içinde ortak; iş emirleri, stok, randevular ve kasa hareketleri şube bazında ele alınır.",
  },
  {
    question: "Ustaların yetkileri farklı olabilir mi?",
    answer:
      "Evet, ürünün yetki modeli farklı görevleri destekler. Ustanın atandığı işleri ilerletmesi, muhasebe kullanıcısının ise tahsilatları takip etmesi hedefleniyor. Maliyet ve finans bilgileri ayrıca yetkilendirilecek.",
  },
  {
    question: "Telefon ve tablette kullanılabilir mi?",
    answer:
      "SanayiPro, tarayıcı üzerinden masaüstü, tablet ve telefon kullanımına uygun geliştirildi. Mobil deneyimde ustanın işlerine erişmesi, not ve fotoğraf eklemesi gibi günlük işlemler öncelikli.",
  },
  {
    question: "Araç geçmişi plakadan bulunabilir mi?",
    answer:
      "Plaka, uygulamanın ana arama yollarından biridir. Araç kaydından, yetkili olunan servis ziyaretlerine ve bakım geçmişine ulaşılabilir. Üst bardaki arama, plaka, müşteri, telefon ve iş emri numarasıyla çalışır.",
  },
  {
    question: "WhatsApp bildirimleri şu anda aktif mi?",
    answer:
      "Altyapı bu entegrasyonu destekleyecek şekilde planlanmaktadır. Gerçek WhatsApp Business entegrasyonu daha sonraki aşamada devreye alınacaktır.",
  },
] as const;

export const previewDate = "21 Ekim 2026";
export const maintenance = {
  nextDate: "15 Mart 2027",
  nextIsoDate: "2027-03-15",
  lastMileage: "108.400 km",
  nextMileage: "120.000 km",
} as const;

export function daysUntilMaintenance() {
  // The mockup uses a fixed, visibly labeled example date rather than a live clock.
  return Math.round(
    (Date.parse(`${maintenance.nextIsoDate}T00:00:00Z`) -
      Date.parse("2026-10-21T00:00:00Z")) /
      86_400_000,
  );
}
