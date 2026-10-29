import type { Customer, Vehicle, WorkOrder } from "./demo-data";
import type {
  StockPart,
  Supplier,
  StockMovement,
  Expense,
} from "@/components/modules/operations-store";

export type CraftsmanBranchId =
  | "motor-mekanik"
  | "sanziman"
  | "on-duzen-rot-balans"
  | "fren-sistemleri"
  | "enjektor-turbo"
  | "oto-elektrik"
  | "oto-beyin-elektronik"
  | "oto-klima"
  | "aku"
  | "kaporta"
  | "oto-boya"
  | "pdr-gocuk"
  | "oto-plastik"
  | "oto-cam"
  | "oto-doseme"
  | "oto-kilit-anahtar"
  | "oto-ses-goruntu"
  | "egzoz"
  | "radyator-petek"
  | "torna-kaynak"
  | "lastik-rot-balans"
  | "hizli-bakim"
  | "lpg-gaz";

export type BranchCategory =
  | "Mekanik & Güç Aktarma"
  | "Elektrik & Elektronik"
  | "Gövde, Boya & Cam"
  | "Donanım, Lastik & Bakım";

export interface BranchQuickAction {
  id: string;
  title: string;
  description: string;
  estimatedDuration: string;
  defaultPrice: number;
  iconName: string;
}

export interface BranchStockItem {
  id: string;
  name: string;
  code: string;
  unit: string;
  physical: number;
  reserved: number;
  minimum: number;
  price: number;
  cost: number;
  supplierName: string;
}

export interface BranchWorkOrderTemplate {
  id: string;
  plate: string;
  vehicleModel: string;
  customerName: string;
  phone: string;
  complaint: string;
  status: "IN_PROGRESS" | "DIAGNOSIS" | "WAITING_PARTS" | "QUALITY_CONTROL" | "READY";
  stageLabel: string;
  total: number;
  paid: number;
  laborName: string;
  partName: string;
}

export interface CraftsmanBranchProfile {
  id: CraftsmanBranchId;
  order: number;
  name: string;
  craftsmanTitle: string;
  businessName: string;
  category: BranchCategory;
  shortDesc: string;
  icon: string;
  dashboardTitle: string;
  dashboardSubtitle: string;
  activeJobsLabel: string;
  quickActions: BranchQuickAction[];
  stockItems: BranchStockItem[];
  suppliers: Array<{ id: string; name: string; contact: string; phone: string }>;
  sampleOrders: BranchWorkOrderTemplate[];
}

export const CRAFTSMAN_BRANCHES: CraftsmanBranchProfile[] = [
  // 1. MOTOR & MEKANİK
  {
    id: "motor-mekanik",
    order: 1,
    name: "Motor & Mekanik",
    craftsmanTitle: "Motor Ustası",
    businessName: "Yılmaz Motor Revizyon & Mekanik",
    category: "Mekanik & Güç Aktarma",
    shortDesc: "Silindir kapak, conta, triger, yağ kaçağı ve komple motor revizyonu.",
    icon: "Cog",
    dashboardTitle: "Motor & Mekanik Atölye Paneli",
    dashboardSubtitle: "Aktif motor revizyonları, periyodik kontroller ve test aşamaları.",
    activeJobsLabel: "İşlemdeki Motor İşleri",
    quickActions: [
      { id: "qa-m1", title: "Motor Arıza Tespiti", description: "Kompresyon testi ve mekanik ses teşhisi", estimatedDuration: "1 saat", defaultPrice: 1200, iconName: "Search" },
      { id: "qa-m2", title: "Triger Kayış Değişimi", description: "Triger seti, gergiler ve devirdaim pompası", estimatedDuration: "4 saat", defaultPrice: 5500, iconName: "RefreshCw" },
      { id: "qa-m3", title: "Silindir Kapak Conta Yenileme", description: "Kapak taşlama, conta ve saplama montajı", estimatedDuration: "2 gün", defaultPrice: 18500, iconName: "Wrench" },
      { id: "qa-m4", title: "Periyodik Yağ & Filtre Bakımı", description: "Motor yağı, yağ/hava/polen filtreleri", estimatedDuration: "45 dk", defaultPrice: 2800, iconName: "Droplet" },
      { id: "qa-m5", title: "Komple Motor Revizyonu", description: "Piston, segman, yatak ve blok rektifiye", estimatedDuration: "5 gün", defaultPrice: 65000, iconName: "Zap" },
    ],
    stockItems: [
      { id: "st-m1", name: "Motor Yağı 5W-30 Tam Sentetik", code: "OIL-5W30-4L", unit: "Kutu (4L)", physical: 28, reserved: 4, minimum: 8, price: 1250, cost: 780, supplierName: "Akdeniz Madeni Yağ" },
      { id: "st-m2", name: "Triger Kayış Seti (1.6 TDI / DCI)", code: "TRG-SET-01", unit: "Set", physical: 6, reserved: 2, minimum: 3, price: 3400, cost: 2200, supplierName: "Öz Motor Yedek Parça" },
      { id: "st-m3", name: "Silindir Kapak Contası Çok Katmanlı", code: "CNT-MLS-08", unit: "Adet", physical: 8, reserved: 1, minimum: 2, price: 1850, cost: 1100, supplierName: "Öz Motor Yedek Parça" },
      { id: "st-m4", name: "Yağ Filtresi Standart Kartuş", code: "FLT-OIL-GEN", unit: "Adet", physical: 35, reserved: 6, minimum: 10, price: 320, cost: 160, supplierName: "Akdeniz Madeni Yağ" },
    ],
    suppliers: [
      { id: "sup-m1", name: "Öz Motor Yedek Parça Toptan", contact: "Hüseyin Motorcu", phone: "0326 712 11 22" },
      { id: "sup-m2", name: "Akdeniz Madeni Yağ & Filtre", contact: "Bülent Yağcı", phone: "0326 614 33 44" },
    ],
    sampleOrders: [
      { id: "WO-M01", plate: "31 ABC 123", vehicleModel: "Renault Megane 1.5 dCi", customerName: "Murat Demir", phone: "0532 111 22 33", complaint: "Motordan şıkırtı geliyor, çekiş düştü.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 16500, paid: 5000, laborName: "Triger ve Su Pompası Değişimi", partName: "Triger Seti + Devirdaim" },
      { id: "WO-M02", plate: "34 KRL 89", vehicleModel: "Volkswagen Passat 2.0 TDI", customerName: "Kemal Kaya", phone: "0533 222 33 44", complaint: "Su eksiltiyor, yağ kapağında beyaz köpük var.", status: "DIAGNOSIS", stageLabel: "Arıza Tespiti", total: 24000, paid: 0, laborName: "Silindir Kapak Söküm & Test", partName: "Conta Takımı" },
      { id: "WO-M03", plate: "06 VR 550", vehicleModel: "Ford Focus 1.6 Ti-VCT", customerName: "Cem Çelik", phone: "0542 333 44 55", complaint: "10.000 km periyodik yağ ve filtre bakımı.", status: "READY", stageLabel: "Teslime Hazır", total: 3200, paid: 3200, laborName: "Periyodik Bakım İşçiliği", partName: "5W-30 Motor Yağı + Filtreler" },
    ],
  },

  // 2. ŞANZIMAN
  {
    id: "sanziman",
    order: 2,
    name: "Şanzıman",
    craftsmanTitle: "Şanzıman Ustası",
    businessName: "Akdeniz Otomatik & Manuel Şanzıman",
    category: "Mekanik & Güç Aktarma",
    shortDesc: "Otomatik vites, DSG, EDC, tork konvertörü, baskı-balata ve dişli onarımı.",
    icon: "Repeat",
    dashboardTitle: "Şanzıman Servis Paneli",
    dashboardSubtitle: "Otomatik kavrama değişimleri, mekatronik testleri ve revizyonlar.",
    activeJobsLabel: "Liftteki Şanzımanlar",
    quickActions: [
      { id: "qa-s1", title: "Kavrama / Baskı-Balata Değişimi", description: "Baskı, balata, bilya ve debriyaj çatalı montajı", estimatedDuration: "5 saat", defaultPrice: 9500, iconName: "Disc" },
      { id: "qa-s2", title: "Otomatik Şanzıman Yağ Değişimi", description: "Diyaliz cihazıyla tam vakumlu yağ ve filtre değişimi", estimatedDuration: "2 saat", defaultPrice: 6800, iconName: "Droplet" },
      { id: "qa-s3", title: "Mekatronik Arıza Tespiti & Onarımı", description: "Basınç tüpü, selonoid valf ve kart testi", estimatedDuration: "1 gün", defaultPrice: 22000, iconName: "Cpu" },
      { id: "qa-s4", title: "Tork Konvertör Revizyonu", description: "Konvertör balata yenileme ve balans", estimatedDuration: "2 gün", defaultPrice: 18000, iconName: "RefreshCw" },
    ],
    stockItems: [
      { id: "st-s1", name: "DSG 7 İleri Kuru Kavrama Seti", code: "DSG-CLU-07", unit: "Set", physical: 4, reserved: 2, minimum: 2, price: 16500, cost: 12000, supplierName: "Transpar Otomotiv" },
      { id: "st-s2", name: "ATF Otomatik Şanzıman Yağı Dexron VI", code: "ATF-DEX6-1L", unit: "Litre", physical: 36, reserved: 8, minimum: 12, price: 480, cost: 290, supplierName: "Transpar Otomotiv" },
      { id: "st-s3", name: "Baskı Balata Seti (Manuel)", code: "CLU-SET-MAN", unit: "Set", physical: 8, reserved: 1, minimum: 3, price: 4200, cost: 2750, supplierName: "Güney Şanzıman Market" },
    ],
    suppliers: [
      { id: "sup-s1", name: "Transpar Otomatik Şanzıman Parçaları", contact: "Erkan Vites", phone: "0326 713 55 66" },
      { id: "sup-s2", name: "Güney Şanzıman Market", contact: "Oğuz Dişli", phone: "0326 615 77 88" },
    ],
    sampleOrders: [
      { id: "WO-S01", plate: "34 DSG 77", vehicleModel: "Volkswagen Golf 7 1.4 TSI DSG", customerName: "Selim Tok", phone: "0532 444 55 66", complaint: "1'den 2'ye geçerken silkeleme ve titreme yapıyor.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 24500, paid: 10000, laborName: "DSG Çift Kavrama Değişimi & Kalibrasyon", partName: "DSG Kavrama Seti + Volan" },
      { id: "WO-S02", plate: "31 MN 404", vehicleModel: "Toyota Corolla 1.6 Manuel", customerName: "Burak Taş", phone: "0535 555 66 77", complaint: "Debriyaj pedalı sertleşti, yokuşta kaçırıyor.", status: "READY", stageLabel: "Teslime Hazır", total: 7200, paid: 7200, laborName: "Debriyaj Baskı Balata Değişimi", partName: "Debriyaj Seti" },
    ],
  },

  // 3. ÖN DÜZEN & ROT-BALANS
  {
    id: "on-duzen-rot-balans",
    order: 3,
    name: "Ön Düzen & Rot-Balans",
    craftsmanTitle: "Rot-Balans Ustası",
    businessName: "Örnek Rot-Balans & Ön Takım",
    category: "Mekanik & Güç Aktarma",
    shortDesc: "3D lazer rot ayarı, tekerlek balansı, salıncak, rot başı ve amortisör.",
    icon: "Navigation",
    dashboardTitle: "Ön Düzen & Lazer Rot Paneli",
    dashboardSubtitle: "Günlük rot ayarları, ön takım boşluk kontrolleri ve test sürüşleri.",
    activeJobsLabel: "Rot Kanalındaki Araçlar",
    quickActions: [
      { id: "qa-od1", title: "3D Lazer Rot Ayarı", description: "Ön ve arka açıların bilgisayarlı hassas ayarı", estimatedDuration: "30 dk", defaultPrice: 650, iconName: "Target" },
      { id: "qa-od2", title: "4 Tekerlek Dinamik Balans", description: "Tekerlek sökme, jant temizliği ve hassas balans", estimatedDuration: "35 dk", defaultPrice: 600, iconName: "Disc" },
      { id: "qa-od3", title: "Ön Takım Boşluk & Arıza Tespiti", description: "Rotil, rot kolu, z-rot ve viraj lastikleri kontrolü", estimatedDuration: "25 dk", defaultPrice: 350, iconName: "Search" },
      { id: "qa-od4", title: "Amortisör ve Helezon Değişimi", description: "Ön amortisörler, takozlar ve bilyalar", estimatedDuration: "3 saat", defaultPrice: 3200, iconName: "Wrench" },
    ],
    stockItems: [
      { id: "st-od1", name: "Z-Rot Ön Salıncak Bağlantısı", code: "LNK-ZROT-01", unit: "Adet", physical: 22, reserved: 4, minimum: 6, price: 450, cost: 240, supplierName: "Rota Ön Düzen Toptan" },
      { id: "st-od2", name: "Rot Başı Sağ/Sol Standart", code: "ROT-END-GEN", unit: "Adet", physical: 18, reserved: 2, minimum: 4, price: 520, cost: 290, supplierName: "Rota Ön Düzen Toptan" },
      { id: "st-od3", name: "Çakma Balans Kurşunu 15gr", code: "BLS-WGT-15", unit: "Kutu (100 Adet)", physical: 12, reserved: 1, minimum: 3, price: 420, cost: 260, supplierName: "Mert Jant Ekipman" },
    ],
    suppliers: [
      { id: "sup-od1", name: "Rota Ön Düzen Yedek Parça", contact: "Fatih Rotçu", phone: "0326 714 88 99" },
      { id: "sup-od2", name: "Mert Jant & Balans Ekipmanları", contact: "Serdar Mert", phone: "0326 616 22 33" },
    ],
    sampleOrders: [
      { id: "WO-OD01", plate: "31 RT 909", vehicleModel: "Honda Civic 1.6 i-VTEC", customerName: "Levent Kurt", phone: "0532 777 88 99", complaint: "100 km/s hızda direksiyonda titreme ve sağa çekme var.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 1850, paid: 500, laborName: "Ön Takım Bakımı + 3D Lazer Rot + 4 Balans", partName: "2x Z-Rot + Balans Kurşunu" },
    ],
  },

  // 4. FREN SİSTEMLERİ
  {
    id: "fren-sistemleri",
    order: 4,
    name: "Fren Sistemleri",
    craftsmanTitle: "Fren Ustası",
    businessName: "Güven Fren Sistemleri & Disk Torna",
    category: "Mekanik & Güç Aktarma",
    shortDesc: "Balata, disk taşlama, kaliper revizyonu, hidrolik değişimi ve ABS testi.",
    icon: "ShieldAlert",
    dashboardTitle: "Fren Sistemleri Servis Paneli",
    dashboardSubtitle: "Balata değişimleri, disk tornaları ve fren testi ölçümleri.",
    activeJobsLabel: "Fren Testindeki Araçlar",
    quickActions: [
      { id: "qa-f1", title: "Ön Fren Balata Değişimi", description: "Balata montajı, kaliper temizliği ve fren spreyi", estimatedDuration: "45 dk", defaultPrice: 850, iconName: "Disc" },
      { id: "qa-f2", title: "Fren Diski Torna / Taşlama", description: "Araç üzerinde sıfır salgılı hassas disk taşlama", estimatedDuration: "1 saat", defaultPrice: 1200, iconName: "RotateCcw" },
      { id: "qa-f3", title: "DOT-4 Fren Hidroliği Değişimi", description: "Basınçlı cihaz ile havası alınarak tam tahliye", estimatedDuration: "45 dk", defaultPrice: 900, iconName: "Droplet" },
      { id: "qa-f4", title: "Arka Fren Kaliper & El Freni Ayarı", description: "Elektrikli el freni kalibrasyonu ve balata", estimatedDuration: "1 saat", defaultPrice: 1400, iconName: "Wrench" },
    ],
    stockItems: [
      { id: "st-f1", name: "Ön Fren Balatası Seramik Katkılı", code: "PAD-FR-CER", unit: "Takım", physical: 14, reserved: 3, minimum: 5, price: 1650, cost: 950, supplierName: "Brempar Fren Toptan" },
      { id: "st-f2", name: "Hava Kanallı Fren Diski Çift", code: "DSC-VENT-02", unit: "Çift", physical: 6, reserved: 1, minimum: 2, price: 3200, cost: 2100, supplierName: "Brempar Fren Toptan" },
      { id: "st-f3", name: "DOT-4 Fren Hidroliği 500ml", code: "FLUID-DOT4-500", unit: "Şişe", physical: 25, reserved: 4, minimum: 8, price: 280, cost: 150, supplierName: "Brempar Fren Toptan" },
    ],
    suppliers: [
      { id: "sup-f1", name: "Brempar Fren Sistemleri Toptan", contact: "Ali Frenci", phone: "0326 715 00 11" },
    ],
    sampleOrders: [
      { id: "WO-F01", plate: "31 FRN 42", vehicleModel: "BMW 320d F30", customerName: "Tarık Aydın", phone: "0533 888 99 00", complaint: "Frene basınca sürtünme sesi geliyor, pedalda titreme var.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 6400, paid: 2000, laborName: "Ön Disk & Balata Değişimi + Hidrolik Yenileme", partName: "Seramik Balata + 2x Disk + DOT4" },
    ],
  },

  // 5. ENJEKTÖR & TURBO
  {
    id: "enjektor-turbo",
    order: 5,
    name: "Enjektör & Turbo",
    craftsmanTitle: "Turbo & Enjektör Ustası",
    businessName: "Poyraz Dizel Turbo & Enjektör Servisi",
    category: "Mekanik & Güç Aktarma",
    shortDesc: "Common rail enjektör kodlama, turbo revizyonu, wastegate ve intercooler.",
    icon: "Wind",
    dashboardTitle: "Dizel Pompa & Turbo Atölyesi",
    dashboardSubtitle: "Enjektör debi testleri, turbo balans tezgahı ve basınç ayarları.",
    activeJobsLabel: "Test Tezgahındaki Parçalar",
    quickActions: [
      { id: "qa-et1", title: "Enjektör Test Tezgahı Ölçümü", description: "Püskürtme debisi, geri dönüş ve basınç testi", estimatedDuration: "1 saat", defaultPrice: 1500, iconName: "Activity" },
      { id: "qa-et2", title: "Turbo Revizyonu & Balans", description: "Mil, pervane, burç takımı ve yüksek hız balans", estimatedDuration: "1 gün", defaultPrice: 14500, iconName: "RotateCw" },
      { id: "qa-et3", title: "Elektronik Wastegate Kalibrasyonu", description: "Aktüatör konumu ve basınç adaptasyonu", estimatedDuration: "2 saat", defaultPrice: 2800, iconName: "Cpu" },
      { id: "qa-et4", title: "Common Rail Enjektör Kodlama (IMA)", description: "Yeni enjektör kodlarının beyne tanıtılması", estimatedDuration: "45 dk", defaultPrice: 950, iconName: "Code" },
    ],
    stockItems: [
      { id: "st-et1", name: "Turbo Kartuş Çekirdek (CHRA)", code: "TRB-CHRA-GT15", unit: "Adet", physical: 5, reserved: 1, minimum: 2, price: 7200, cost: 4800, supplierName: "TurboCenter Dağıtım" },
      { id: "st-et2", name: "Enjektör Memesi Bosch Tipi", code: "INJ-NOZ-0445", unit: "Adet", physical: 16, reserved: 4, minimum: 6, price: 1450, cost: 920, supplierName: "Dizel Teknik Toptan" },
    ],
    suppliers: [
      { id: "sup-et1", name: "TurboCenter Türkiye Dağıtım", contact: "Barış Turbo", phone: "0326 716 33 44" },
      { id: "sup-et2", name: "Dizel Teknik Pompa Parçaları", contact: "Kadir Enjektör", phone: "0326 617 55 66" },
    ],
    sampleOrders: [
      { id: "WO-ET01", plate: "31 TRB 88", vehicleModel: "Ford Transit 2.2 TDCi", customerName: "Mustafa Demirci", phone: "0532 999 00 11", complaint: "Yokuşta siyah duman atıyor, turbo ötüyor.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 18500, paid: 5000, laborName: "Turbo Revizyonu & 4 Enjektör Bakımı", partName: "Turbo Kartuşu + 4x Enjektör Memesi" },
    ],
  },

  // 6. OTO ELEKTRİK
  {
    id: "oto-elektrik",
    order: 6,
    name: "Oto Elektrik",
    craftsmanTitle: "Oto Elektrik Ustası",
    businessName: "Yıldız Oto Elektrik & Tesisat Atölyesi",
    category: "Elektrik & Elektronik",
    shortDesc: "Marş motoru, alternatör şarj, akü testi, sigorta kutusu ve far tesisatı.",
    icon: "Zap",
    dashboardTitle: "Oto Elektrik Servis Paneli",
    dashboardSubtitle: "Şarj/marş revizyonları, akım kaçağı tespitleri ve lamba tesisatları.",
    activeJobsLabel: "Tesisat Açılan Araçlar",
    quickActions: [
      { id: "qa-oe1", title: "Marş Motoru Revizyonu", description: "Kömür, marş otomatiği ve burç değişimi", estimatedDuration: "2 saat", defaultPrice: 2200, iconName: "Power" },
      { id: "qa-oe2", title: "Alternatör Şarj Dinamosu Tamiri", description: "Diyot tablası, konjektör ve rulman değişimi", estimatedDuration: "2.5 saat", defaultPrice: 2800, iconName: "BatteryCharging" },
      { id: "qa-oe3", title: "Akım Kaçağı & Parazit Tespiti", description: "Ampermetre ile uyku modu kaçak testi", estimatedDuration: "1.5 saat", defaultPrice: 1500, iconName: "Search" },
      { id: "qa-oe4", title: "Far Ayarı & Ampul Yenileme", description: "Far ayar cihazıyla optik odaklama", estimatedDuration: "30 dk", defaultPrice: 450, iconName: "Sun" },
    ],
    stockItems: [
      { id: "st-oe1", name: "Marş Kömür Takımı Valeo/Bosch", code: "STR-BRUSH-SET", unit: "Takım", physical: 20, reserved: 3, minimum: 5, price: 380, cost: 180, supplierName: "ElektroOto Dağıtım" },
      { id: "st-oe2", name: "Alternatör Konjektörü 14V", code: "ALT-REG-14V", unit: "Adet", physical: 8, reserved: 1, minimum: 2, price: 950, cost: 580, supplierName: "ElektroOto Dağıtım" },
      { id: "st-oe3", name: "Bıçak Sigorta Seti Karışık", code: "FUS-BLADE-BOX", unit: "Kutu (100 Adet)", physical: 15, reserved: 0, minimum: 4, price: 250, cost: 110, supplierName: "ElektroOto Dağıtım" },
    ],
    suppliers: [
      { id: "sup-oe1", name: "ElektroOto Yedek Parça Dağıtım", contact: "Cahit Elektrikçi", phone: "0326 717 66 77" },
    ],
    sampleOrders: [
      { id: "WO-OE01", plate: "31 ELK 06", vehicleModel: "Fiat Egea 1.3 Multijet", customerName: "Deniz Yener", phone: "0536 123 45 67", complaint: "Sabahları marş basmıyor, tık sesi geliyor.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 2400, paid: 1000, laborName: "Marş Motoru İndirme & Otomatik Değişimi", partName: "Marş Otomatiği + Kömür Takımı" },
    ],
  },

  // 7. OTO BEYİN & ELEKTRONİK
  {
    id: "oto-beyin-elektronik",
    order: 7,
    name: "Oto Beyin & Elektronik",
    craftsmanTitle: "Beyin & Elektronik Ustası",
    businessName: "EcuTech Beyin & Elektronik Laboratuvarı",
    category: "Elektrik & Elektronik",
    shortDesc: "ECU tamiri, BSI konfor beyni, ABS beyni, gösterge paneli ve yazılım.",
    icon: "Cpu",
    dashboardTitle: "Elektronik Laboratuvarı & ECU Paneli",
    dashboardSubtitle: "Masaüstü beyin testleri, eprom okuma, klonlama ve yazılım işlemleri.",
    activeJobsLabel: "Tezgahtaki Beyinler",
    quickActions: [
      { id: "qa-be1", title: "Motor Beyni (ECU) Tamiri", description: "Entegre değişimi, lehim yenileme ve masa testi", estimatedDuration: "1 gün", defaultPrice: 6500, iconName: "Cpu" },
      { id: "qa-be2", title: "ECU Klonlama & Eeprom Aktarımı", description: "BGA lehimleme ve orijinal yazılım kopyalama", estimatedDuration: "3 saat", defaultPrice: 4500, iconName: "Copy" },
      { id: "qa-be3", title: "ABS / ESP Beyni Onarımı", description: "Valf motoru arızası ve mikro lehim tamiri", estimatedDuration: "1 gün", defaultPrice: 5800, iconName: "Shield" },
      { id: "qa-be4", title: "Can-Bus Ağ İletişim Teşhisi", description: "Osiloskop ile hat parazit ve sonlandırıcı testi", estimatedDuration: "2 saat", defaultPrice: 2500, iconName: "Activity" },
    ],
    stockItems: [
      { id: "st-be1", name: "Bosch EDC16/17 Güç Entegresi", code: "CHIP-BOSCH-PWR", unit: "Adet", physical: 14, reserved: 2, minimum: 4, price: 650, cost: 280, supplierName: "MikroElektronik Market" },
      { id: "st-be2", name: "Can-Bus İletişim Alıcı-Verici Çip", code: "CHIP-CAN-TJA", unit: "Adet", physical: 25, reserved: 3, minimum: 6, price: 220, cost: 85, supplierName: "MikroElektronik Market" },
    ],
    suppliers: [
      { id: "sup-be1", name: "MikroElektronik Oto Çip Pazarı", contact: "Murat Çipçi", phone: "0326 718 88 99" },
    ],
    sampleOrders: [
      { id: "WO-BE01", plate: "34 ECU 10", vehicleModel: "Opel Astra H 1.3 CDTI", customerName: "Fırat Karaca", phone: "0537 234 56 78", complaint: "Araba aniden stop ediyor, gaz yemiyor. U0100 arızası var.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 7500, paid: 2500, laborName: "ECU Söküm & Güç Katı Entegre Değişimi", partName: "Güç Katı Çipi + Jel Yalıtım" },
    ],
  },

  // 8. OTO KLİMA
  {
    id: "oto-klima",
    order: 8,
    name: "Oto Klima",
    craftsmanTitle: "Oto Klima Ustası",
    businessName: "Maviay Oto Klima & Isıtma Servisi",
    category: "Donanım, Lastik & Bakım",
    shortDesc: "R134a / R1234yf gaz dolumu, kaçak testi, kompresör tamiri ve evaporatör.",
    icon: "Snowflake",
    dashboardTitle: "Oto Klima Servis Paneli",
    dashboardSubtitle: "Gaz dolum cihazları, azot kaçak testleri ve antibakteriyel temizlik.",
    activeJobsLabel: "Gaz Dolumundaki Araçlar",
    quickActions: [
      { id: "qa-k1", title: "R134a Otomatik Klima Gaz Dolumu", description: "Vakum, yağ basma, UV boya ve gramajlı gaz", estimatedDuration: "40 dk", defaultPrice: 1600, iconName: "Droplet" },
      { id: "qa-k2", title: "Azotlu Basınçlı Kaçak Testi", description: "25 bar azot basılarak köpük ve dedektör kontrolü", estimatedDuration: "1 saat", defaultPrice: 950, iconName: "Search" },
      { id: "qa-k3", title: "Klima Kompresör Kasnak & Manyetik", description: "Rulman değişimi, kavrama boşluk ayarı", estimatedDuration: "2.5 saat", defaultPrice: 3800, iconName: "RotateCw" },
      { id: "qa-k4", title: "Ozonla Antibakteriyel Dezenfeksiyon", description: "Klima kanalları küf ve koku giderme işlemi", estimatedDuration: "30 dk", defaultPrice: 600, iconName: "Sparkles" },
    ],
    stockItems: [
      { id: "st-k1", name: "R134a Saf Klima Gazı Tüpü (13.6 kg)", code: "GAS-R134A-13KG", unit: "Tüp", physical: 4, reserved: 1, minimum: 2, price: 6800, cost: 4400, supplierName: "Soğutma Kimya Toptan" },
      { id: "st-k2", name: "PAG-46 Sentetik Kompresör Yağı 1L", code: "OIL-PAG46-1L", unit: "Şişe", physical: 8, reserved: 1, minimum: 3, price: 750, cost: 420, supplierName: "Soğutma Kimya Toptan" },
    ],
    suppliers: [
      { id: "sup-k1", name: "Soğutma Kimya & Gaz Dağıtım", contact: "Engin Soğuk", phone: "0326 719 22 33" },
    ],
    sampleOrders: [
      { id: "WO-K01", plate: "31 KLM 55", vehicleModel: "Hyundai i20 1.4 MPI", customerName: "Ender Şen", phone: "0538 345 67 89", complaint: "Klima sıcak üflüyor, kompresör devreye girmiyor.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 2800, paid: 1000, laborName: "Kaçak Tespiti & Manyetik Bobin Tamiri + Gaz Basımı", partName: "Klima Gazı 450gr + PAG Yağ" },
    ],
  },

  // 9. AKÜ
  {
    id: "aku",
    order: 9,
    name: "Akü",
    craftsmanTitle: "Akü Teknisyeni",
    businessName: "Güçlü Akü Dünyası & Test Merkezi",
    category: "Elektrik & Elektronik",
    shortDesc: "Akü değişimi, AGM/EFB start-stop kodlama, şarj testi ve yerinde servis.",
    icon: "Battery",
    dashboardTitle: "Akü Satış & Test Merkezi Paneli",
    dashboardSubtitle: "CCA marş akımı testleri, start-stop kodlamaları ve hurda akü takibi.",
    activeJobsLabel: "Test ve Montajdaki Araçlar",
    quickActions: [
      { id: "qa-ak1", title: "Akü Sağlık (SOH/SOC) Testi", description: "Dijital iletkenlik testi ve alternatör şarj kontrolü", estimatedDuration: "15 dk", defaultPrice: 200, iconName: "Activity" },
      { id: "qa-ak2", title: "AGM / EFB Start-Stop Akü Değişimi", description: "Hafıza koruyucu ile akü değişimi ve BMS kodlama", estimatedDuration: "30 dk", defaultPrice: 4800, iconName: "BatteryCharging" },
      { id: "qa-ak3", title: "Yerinde / Mobil Akü Takviye & Montaj", description: "Acil yol yardım servis aracı ile yerinde montaj", estimatedDuration: "45 dk", defaultPrice: 750, iconName: "Truck" },
    ],
    stockItems: [
      { id: "st-ak1", name: "72 Ah 680 CCA Standart Kurşun-Asit Akü", code: "BAT-72AH-STD", unit: "Adet", physical: 14, reserved: 2, minimum: 5, price: 3400, cost: 2450, supplierName: "İnci-Mutlu Bölge Bayi" },
      { id: "st-ak2", name: "70 Ah 760 CCA AGM Start-Stop Akü", code: "BAT-70AH-AGM", unit: "Adet", physical: 8, reserved: 1, minimum: 3, price: 5900, cost: 4300, supplierName: "İnci-Mutlu Bölge Bayi" },
    ],
    suppliers: [
      { id: "sup-ak1", name: "İnci-Mutlu Akü Bölge Distribütörü", contact: "Süleyman Akücü", phone: "0326 720 44 55" },
    ],
    sampleOrders: [
      { id: "WO-AK01", plate: "31 AKU 01", vehicleModel: "Skoda Octavia 1.6 TDI Start-Stop", customerName: "İsmail Koç", phone: "0539 456 78 90", complaint: "Sabah geç çalışıyor, start-stop devre dışı kaldı.", status: "READY", stageLabel: "Teslime Hazır", total: 5900, paid: 5900, laborName: "AGM Akü Montajı & BMS Tanıtımı", partName: "70Ah AGM Akü" },
    ],
  },

  // 10. KAPORTA
  {
    id: "kaporta",
    order: 10,
    name: "Kaporta",
    craftsmanTitle: "Kaporta Ustası",
    businessName: "Usta Eller Kaporta & Çektirme Atölyesi",
    category: "Gövde, Boya & Cam",
    shortDesc: "Şasi düzeltme, çamurluk, kapı onarımı, punto kaynak ve parça değişimi.",
    icon: "Shield",
    dashboardTitle: "Kaporta & Şasi Atölyesi Paneli",
    dashboardSubtitle: "Şasi tezgahı ölçümleri, çamurluk düzeltmeleri ve kaza onarımları.",
    activeJobsLabel: "Tezgahtaki Hasarlı Araçlar",
    quickActions: [
      { id: "qa-kp1", title: "Ön Çamurluk Düzeltme & Alıştırma", description: "Çekiç, örs ve punta ile sac forma sokma", estimatedDuration: "4 saat", defaultPrice: 3500, iconName: "Hammer" },
      { id: "qa-kp2", title: "Kapı Hasarı Düzeltme", description: "Kapı içi kilit ve cam sökülerek sac düzeltme", estimatedDuration: "5 saat", defaultPrice: 4200, iconName: "Shield" },
      { id: "qa-kp3", title: "Şasi Çektirme & Lazer Hizalama", description: "Dozer şasi tezgahında milimetrik gerdirme", estimatedDuration: "2 gün", defaultPrice: 18000, iconName: "Maximize2" },
      { id: "qa-kp4", title: "Tampon & Far Ayar Alıştırması", description: "Tampon klipsleri, far ayakları ve panel boşlukları", estimatedDuration: "1.5 saat", defaultPrice: 1200, iconName: "Sliders" },
    ],
    stockItems: [
      { id: "st-kp1", name: "Kaporta Klips Seti Karışık Kutu", code: "CLP-BODY-200", unit: "Kutu (200 Adet)", physical: 10, reserved: 1, minimum: 3, price: 650, cost: 320, supplierName: "Sanayi Kaporta Market" },
      { id: "st-kp2", name: "Punta Kaynak Teli 0.8mm Gazaltı", code: "WIR-MIG-08MM", unit: "Makara (15kg)", physical: 5, reserved: 0, minimum: 2, price: 1800, cost: 1150, supplierName: "Sanayi Kaporta Market" },
    ],
    suppliers: [
      { id: "sup-kp1", name: "Sanayi Kaporta Malzemeleri", contact: "İrfan Kaportacı", phone: "0326 721 77 88" },
    ],
    sampleOrders: [
      { id: "WO-KP01", plate: "31 KPR 19", vehicleModel: "Peugeot 3008 1.5 BlueHDi", customerName: "Tolga Aksoy", phone: "0530 567 89 01", complaint: "Sağ ön çamurluk ve kapı sürtme hasarı.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 8500, paid: 3000, laborName: "Sağ Çamurluk & Kapı Düzeltme İşçiliği", partName: "Klipsler + İzolasyon" },
    ],
  },

  // 11. OTO BOYA
  {
    id: "oto-boya",
    order: 11,
    name: "Oto Boya",
    craftsmanTitle: "Oto Boya Ustası",
    businessName: "Metin Fırınlı Oto Boya & Mikron Eşleme",
    category: "Gövde, Boya & Cam",
    shortDesc: "Fırın boya, lokal boya, pasta-cila, mikron eşleme ve renk kodlama.",
    icon: "Palette",
    dashboardTitle: "Fırınlı Boya Atölyesi Paneli",
    dashboardSubtitle: "Fırınlama sıralaması, astar kuruma süreleri ve renk eşleme.",
    activeJobsLabel: "Boya Fırınındaki Araçlar",
    quickActions: [
      { id: "qa-by1", title: "Tampon Lokal Boyama", description: "Zımpara, plastik astar, bazkat ve vernik", estimatedDuration: "6 saat", defaultPrice: 3800, iconName: "Paintbrush" },
      { id: "qa-by2", title: "Tek Parça Fırın Boya (Çamurluk/Kapı)", description: "Macun, astar, fırında 60°C kurutma ve pasta", estimatedDuration: "1 gün", defaultPrice: 5200, iconName: "Layers" },
      { id: "qa-by3", title: "Spektrofotometre ile Renk Eşleme", description: "Boya kodu ve solma payına göre özel karışım", estimatedDuration: "30 dk", defaultPrice: 650, iconName: "Eye" },
      { id: "qa-by4", title: "Komple Pasta, Cila & Seramik Kaplama", description: "Hale giderme, parlatma ve 9H seramik koruma", estimatedDuration: "1 gün", defaultPrice: 9500, iconName: "Sparkles" },
    ],
    stockItems: [
      { id: "st-by1", name: "2K Akrilik Şeffaf Vernik + Sertleştirici", code: "CLR-2K-5L", unit: "Set (5L+2.5L)", physical: 6, reserved: 2, minimum: 2, price: 4200, cost: 2600, supplierName: "Duxone-Akzo Bölge Bayi" },
      { id: "st-by2", name: "Gri Dolgu Astarı 4:1", code: "PRM-GRY-1L", unit: "Kutu (1L)", physical: 14, reserved: 3, minimum: 4, price: 780, cost: 450, supplierName: "Duxone-Akzo Bölge Bayi" },
      { id: "st-by3", name: "Su Zımparası P2000 / P3000", code: "SND-P2000", unit: "Paket (50 Adet)", physical: 18, reserved: 2, minimum: 5, price: 450, cost: 240, supplierName: "Duxone-Akzo Bölge Bayi" },
    ],
    suppliers: [
      { id: "sup-by1", name: "Duxone & Standox Boya Toptan", contact: "Metin Boyacı", phone: "0326 722 99 00" },
    ],
    sampleOrders: [
      { id: "WO-BY01", plate: "31 BOY 74", vehicleModel: "Mercedes C200d W205", customerName: "Bora Güler", phone: "0531 678 90 12", complaint: "Ön tampon sol köşe çizik ve sürtme, arka çamurluk lokal.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 7800, paid: 3500, laborName: "Ön Tampon + Arka Çamurluk Lokal Fırın Boya", partName: "Bazkat Boya + 2K Vernik + Astar" },
    ],
  },

  // 12. BOYASIZ GÖÇÜK DÜZELTME (PDR)
  {
    id: "pdr-gocuk",
    order: 12,
    name: "Boyasız Göçük Düzeltme (PDR)",
    craftsmanTitle: "PDR Göçük Ustası",
    businessName: "Hassas PDR Boyasız Göçük Onarım",
    category: "Gövde, Boya & Cam",
    shortDesc: "Dolu hasarı, masaj yöntemi, silikonlu çektirme ve orijinal boyayı koruma.",
    icon: "Target",
    dashboardTitle: "PDR Göçük Onarım Paneli",
    dashboardSubtitle: "Işıklı lamba altında göçük masajı ve orijinal değer koruma.",
    activeJobsLabel: "PDR Işığında Çalışılan Araçlar",
    quickActions: [
      { id: "qa-pd1", title: "Tekil Park Göçüğü Onarımı", description: "Çiziksiz sac masajı ve silikonlu çektirme", estimatedDuration: "45 dk", defaultPrice: 950, iconName: "Target" },
      { id: "qa-pd2", title: "Kapı Kordon / Çizgili Göçük Tamiri", description: "Özel şişlerle kordon çizgisini orijinal forma getirme", estimatedDuration: "2 saat", defaultPrice: 2400, iconName: "Sliders" },
      { id: "qa-pd3", title: "Komple Dolu Hasarı Onarımı", description: "Tavan, kaput ve bagajdaki 100+ göçüğün boyasız tamiri", estimatedDuration: "3 gün", defaultPrice: 28000, iconName: "CloudRain" },
    ],
    stockItems: [
      { id: "st-pd1", name: "PDR Özel Sıcak Silikon Çubukları (Siyah)", code: "PDR-GLU-BLK", unit: "Paket (1kg)", physical: 12, reserved: 1, minimum: 3, price: 480, cost: 260, supplierName: "PDR Teknik Ekipman" },
      { id: "st-pd2", name: "Çektirme Vantuz Seti Çeşitli Boy", code: "PDR-TAB-SET", unit: "Takım", physical: 8, reserved: 0, minimum: 2, price: 650, cost: 350, supplierName: "PDR Teknik Ekipman" },
    ],
    suppliers: [
      { id: "sup-pd1", name: "PDR Teknik Profesyonel Aletler", contact: "Gökhan Göçükçü", phone: "0326 723 11 22" },
    ],
    sampleOrders: [
      { id: "WO-PD01", plate: "31 PDR 11", vehicleModel: "Audi A4 2.0 TDI", customerName: "Caner Vural", phone: "0532 789 01 23", complaint: "Sol ön kapıda market arabası çarpması sonucu 2 adet göçük.", status: "READY", stageLabel: "Teslime Hazır", total: 1800, paid: 1800, laborName: "PDR Masaj Yöntemiyle Boyasız Onarım", partName: "Özel Silikon ve Mum Temizleme" },
    ],
  },

  // 13. OTO PLASTİK
  {
    id: "oto-plastik",
    order: 13,
    name: "Oto Plastik",
    craftsmanTitle: "Plastik Onarım Ustası",
    businessName: "Form Plastik Tamir & Tampon Kaynak",
    category: "Gövde, Boya & Cam",
    shortDesc: "Tampon çatlak kaynağı, far ayağı tamiri, ızgara, ayna kapağı ve torpido.",
    icon: "ShieldAlert",
    dashboardTitle: "Plastik Kaynak & Onarım Paneli",
    dashboardSubtitle: "PP/ABS elektrotlu sıcak hava kaynağı ve tırnak revizyonları.",
    activeJobsLabel: "Kaynaktaki Tamponlar",
    quickActions: [
      { id: "qa-pl1", title: "Tampon Kırık / Çatlak Sıcak Kaynak", description: "PP/EPDM elektrot ve paslanmaz çelik tel takviyesi", estimatedDuration: "2 saat", defaultPrice: 1600, iconName: "Flame" },
      { id: "qa-pl2", title: "Kırık Far Ayağı Yeniden İmalat", description: "Orijinal açıya uygun plastik ayak montajı", estimatedDuration: "1 saat", defaultPrice: 850, iconName: "Wrench" },
      { id: "qa-pl3", title: "Yan Ayna Gövde & Mekanizma Onarımı", description: "İç iskelet çatlağı ve dişli tamiri", estimatedDuration: "1.5 saat", defaultPrice: 1200, iconName: "Settings" },
    ],
    stockItems: [
      { id: "st-pl1", name: "PP-EPDM Tampon Kaynak Teli Elektrot", code: "PL-WLD-PP", unit: "Paket (1kg)", physical: 8, reserved: 1, minimum: 2, price: 380, cost: 190, supplierName: "Plastik Kimya Market" },
      { id: "st-pl2", name: "Takviye Çelik Tel Ağı Paslanmaz", code: "PL-MSH-STL", unit: "Rulo", physical: 6, reserved: 0, minimum: 2, price: 290, cost: 140, supplierName: "Plastik Kimya Market" },
    ],
    suppliers: [
      { id: "sup-pl1", name: "Plastik Kimya & Kaynak Sanayi", contact: "Hakan Plastikçi", phone: "0326 724 33 44" },
    ],
    sampleOrders: [
      { id: "WO-PL01", plate: "31 PLS 99", vehicleModel: "Nissan Qashqai 1.2 DIG-T", customerName: "Murat Can", phone: "0533 890 12 34", complaint: "Ön tampon alt ızgarası kırık, sağ farın 2 ayağı kopmuş.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 2450, paid: 1000, laborName: "Tampon Çatlak Kaynağı + 2x Far Ayağı Tamiri", partName: "PP Kaynak Teli + Çelik Tel Takviyesi" },
    ],
  },

  // 14. OTO CAM
  {
    id: "oto-cam",
    order: 14,
    name: "Oto Cam",
    craftsmanTitle: "Oto Cam Ustası",
    businessName: "Dostlar Oto Cam & Kasko Değişim",
    category: "Gövde, Boya & Cam",
    shortDesc: "Ön cam değişimi, taş izi tamiri, kasko anlaşmalı cam ve fitil yenileme.",
    icon: "Square",
    dashboardTitle: "Oto Cam Değişim & Onarım Paneli",
    dashboardSubtitle: "Ön cam poliüretan yapıştırmaları, sensör jeli ve taş izi vakum.",
    activeJobsLabel: "Yapıştırılan Ön Camlar",
    quickActions: [
      { id: "qa-cm1", title: "Ön Cam Taş İzi Vakumlu Reçine Tamiri", description: "Çatlağın büyümesini engelleyen UV reçine dolgusu", estimatedDuration: "30 dk", defaultPrice: 650, iconName: "Sparkles" },
      { id: "qa-cm2", title: "Ön Cam Değişimi & Poliüretan Montaj", description: "Orijinal sensörlü ön cam montajı ve fitil yenileme", estimatedDuration: "2 saat", defaultPrice: 4800, iconName: "Maximize2" },
      { id: "qa-cm3", title: "Yağmur & Far Sensörü Jel Değişimi", description: "Optik silikon ped yenileme ve kalibrasyon", estimatedDuration: "25 dk", defaultPrice: 450, iconName: "Eye" },
    ],
    stockItems: [
      { id: "st-cm1", name: "Hızlı Kuruyan Oto Cam Poliüretan Yapıştırıcı", code: "GLS-ADH-310", unit: "Kartuş (310ml)", physical: 24, reserved: 4, minimum: 8, price: 420, cost: 230, supplierName: "Oto Cam Sanayi Dağıtım" },
      { id: "st-cm2", name: "Cam Taş İzi Tamir Reçinesi UV", code: "GLS-RES-15ML", unit: "Şişe", physical: 6, reserved: 0, minimum: 2, price: 650, cost: 340, supplierName: "Oto Cam Sanayi Dağıtım" },
    ],
    suppliers: [
      { id: "sup-cm1", name: "Oto Cam Sanayi & Toptan Dağıtım", contact: "Şükrü Camcı", phone: "0326 725 55 66" },
    ],
    sampleOrders: [
      { id: "WO-CM01", plate: "31 CAM 82", vehicleModel: "Dacia Duster 1.5 dCi", customerName: "Yasin Kaya", phone: "0534 901 23 45", complaint: "Ön cama otoyolda taş geldi, sürücü görüş alanında çatlak.", status: "READY", stageLabel: "Teslime Hazır", total: 4200, paid: 4200, laborName: "Ön Cam Değişimi & Yağmur Sensörü Jel Montajı", partName: "Renkli Ön Cam + Poliüretan Mastik" },
    ],
  },

  // 15. OTO DÖŞEME
  {
    id: "oto-doseme",
    order: 15,
    name: "Oto Döşeme",
    craftsmanTitle: "Döşeme Ustası",
    businessName: "Lider Oto Döşeme & İç Dizayn",
    category: "Gövde, Boya & Cam",
    shortDesc: "Deri/kumaş koltuk kaplama, tavan sarkması tamiri, direksiyon dikimi ve taban halısı.",
    icon: "Armchair",
    dashboardTitle: "Oto Döşeme & İç Tasarım Paneli",
    dashboardSubtitle: "Koltuk süngeri onarımları, tavan kumaşı yapıştırmaları ve deri dikişi.",
    activeJobsLabel: "Döşemedeki Araçlar",
    quickActions: [
      { id: "qa-ds1", title: "Sarkan Tavan Döşemesi Yenileme", description: "Orijinal süngerli tavan kumaşı ve ısıya dayanıklı yapıştırıcı", estimatedDuration: "1 gün", defaultPrice: 4200, iconName: "Layers" },
      { id: "qa-ds2", title: "Hakiki Deri Direksiyon Dikimi", description: "Elden dikişli delikli deri kaplama", estimatedDuration: "2 saat", defaultPrice: 1400, iconName: "Circle" },
      { id: "qa-ds3", title: "Sürücü Koltuk Süngeri & Yanak Onarımı", description: "Çöken sünger dolgusu ve kumaş dikimi", estimatedDuration: "3 saat", defaultPrice: 1850, iconName: "Scissors" },
    ],
    stockItems: [
      { id: "st-ds1", name: "Süngerli İthal Tavan Kumaşı Gri/Antrasit", code: "FAB-ROOF-GRY", unit: "Metretül", physical: 30, reserved: 5, minimum: 10, price: 380, cost: 210, supplierName: "Kumaş-Deri Pazarlama" },
      { id: "st-ds2", name: "Isıya Dayanıklı Sprey Kontak Yapıştırıcı", code: "ADH-SPRY-HEAT", unit: "Teneke (15kg)", physical: 4, reserved: 1, minimum: 2, price: 2800, cost: 1750, supplierName: "Kumaş-Deri Pazarlama" },
    ],
    suppliers: [
      { id: "sup-ds1", name: "Kumaş-Deri & Döşeme Malzemeleri", contact: "Bekir Döşemeci", phone: "0326 726 77 88" },
    ],
    sampleOrders: [
      { id: "WO-DS01", plate: "31 DSM 23", vehicleModel: "Volkswagen Passat B6", customerName: "Ahmet Erdem", phone: "0535 012 34 56", complaint: "Tavan kumaşı tamamen sarktı, başa değiyor.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 4200, paid: 2000, laborName: "Tavan Kartonu İndirme, Temizleme & Yeni Kumaş Kaplama", partName: "3 Metre Süngerli Antrasit Kumaş + Yapıştırıcı" },
    ],
  },

  // 16. OTO KİLİT & İMMOBİLİZER
  {
    id: "oto-kilit-anahtar",
    order: 16,
    name: "Oto Kilit & İmmobilizer",
    craftsmanTitle: "Oto Kilit & Anahtar Ustası",
    businessName: "Anahtar Dünyası Oto Kilit & İmmobilizer",
    category: "Elektrik & Elektronik",
    shortDesc: "Yedek anahtar kopyalama, immobilizer çip, kayıp anahtar çıkarma ve kilit tamiri.",
    icon: "Key",
    dashboardTitle: "Oto Kilit & İmmobilizer Paneli",
    dashboardSubtitle: "OBD'den anahtar programlama, kilit şifresi dizme ve sustalı kap değişimi.",
    activeJobsLabel: "Anahtar Kodlanan Araçlar",
    quickActions: [
      { id: "qa-kl1", title: "Sustalı Uzaktan Kumandalı Yedek Anahtar", description: "Lazer uç kesimi, kumanda ve immobilizer kodlama", estimatedDuration: "40 dk", defaultPrice: 1800, iconName: "Key" },
      { id: "qa-kl2", title: "Tamamen Kayıp Anahtardan Yeniden Yapma", description: "Kapı kilidinden şifre okuma ve araç başında kodlama", estimatedDuration: "2 saat", defaultPrice: 4500, iconName: "Unlock" },
      { id: "qa-kl3", title: "Kapı Kilit Motoru & Tel Onarımı", description: "Merkezi kilit açmama arızası ve motor değişimi", estimatedDuration: "1 saat", defaultPrice: 1200, iconName: "Lock" },
    ],
    stockItems: [
      { id: "st-kl1", name: "Evrensel Akıllı Kumandalı Anahtar Kartı", code: "KEY-SMART-GEN", unit: "Adet", physical: 25, reserved: 3, minimum: 6, price: 450, cost: 220, supplierName: "Anahtar Toptan Dağıtım" },
      { id: "st-kl2", name: "ID46 / ID48 İmmobilizer Transponder Çip", code: "CHP-ID46-TRN", unit: "Adet", physical: 40, reserved: 5, minimum: 10, price: 180, cost: 75, supplierName: "Anahtar Toptan Dağıtım" },
    ],
    suppliers: [
      { id: "sup-kl1", name: "Anahtar Toptan & Çip Sistemleri", contact: "Harun Anahtarcı", phone: "0326 727 99 00" },
    ],
    sampleOrders: [
      { id: "WO-KL01", plate: "31 KLT 35", vehicleModel: "Renault Clio 4", customerName: "Ercan Şahin", phone: "0536 123 78 90", complaint: "Yedek anahtar yok, mevcut anahtar pili çabuk bitiyor.", status: "READY", stageLabel: "Teslime Hazır", total: 1950, paid: 1950, laborName: "Handsfree Akıllı Kart Anahtar Kodlama", partName: "Clio 4 Kart Kumanda + Pil" },
    ],
  },

  // 17. OTO SES & MULTİMEDYA
  {
    id: "oto-ses-goruntu",
    order: 17,
    name: "Oto Ses & Multimedya",
    craftsmanTitle: "Multimedya & Ses Ustası",
    businessName: "SoundMaster Oto Ses & Android Ekran",
    category: "Elektrik & Elektronik",
    shortDesc: "Android ekran montajı, geri görüş kamerası, amfi, subwoofer ve ses yalıtımı.",
    icon: "Volume2",
    dashboardTitle: "Multimedya & Ses Sistemleri Paneli",
    dashboardSubtitle: "Android OEM ekran montajları, can-bus adaptörleri ve amfi ayarları.",
    activeJobsLabel: "Tesisat Yapılan Araçlar",
    quickActions: [
      { id: "qa-sm1", title: "Android OEM Multimedya & Çerçeve Montajı", description: "CarPlay/Android Auto ekran, canbus ve direksiyon tuşu", estimatedDuration: "2 saat", defaultPrice: 6500, iconName: "Tv" },
      { id: "qa-sm2", title: "AHD Geniş Açı Geri Görüş Kamerası", description: "Bagaj kolu tipi kamera montajı ve hat gizleme", estimatedDuration: "1 saat", defaultPrice: 1400, iconName: "Camera" },
      { id: "qa-sm3", title: "Amfi & Subwoofer Tesisat Çekimi", description: "Kalın güç kablosu, RCA ve sigortalı tesisat", estimatedDuration: "3 saat", defaultPrice: 3200, iconName: "Radio" },
    ],
    stockItems: [
      { id: "st-sm1", name: "Evrensel 9 inç Android 4GB/64GB Ekran", code: "MED-AND9-464", unit: "Adet", physical: 6, reserved: 1, minimum: 2, price: 4800, cost: 3200, supplierName: "AudioTek Dağıtım" },
      { id: "st-sm2", name: "AHD Gece Görüşlü Geri Vites Kamerası", code: "CAM-AHD-1080", unit: "Adet", physical: 14, reserved: 2, minimum: 4, price: 650, cost: 340, supplierName: "AudioTek Dağıtım" },
    ],
    suppliers: [
      { id: "sup-sm1", name: "AudioTek Elektronik & Multimedya", contact: "Cem Sesçi", phone: "0326 728 11 22" },
    ],
    sampleOrders: [
      { id: "WO-SM01", plate: "31 SES 80", vehicleModel: "Toyota Corolla 2017", customerName: "Serkan Ateş", phone: "0537 234 89 01", complaint: "Eski teyp sökülüp Apple CarPlay destekli ekran ve kamera takılacak.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 7900, paid: 3000, laborName: "Android Ekran + Geri Görüş Kamerası Montajı", partName: "9 inç Ekran + Çerçeve + AHD Kamera" },
    ],
  },

  // 18. EGZOZ
  {
    id: "egzoz",
    order: 18,
    name: "Egzoz",
    craftsmanTitle: "Egzoz Ustası",
    businessName: "Gürlek Egzoz & DPF Emisyon Servisi",
    category: "Mekanik & Güç Aktarma",
    shortDesc: "Partikül filtresi (DPF), katalizör, spiral boru, susturucu ve emisyon onarımı.",
    icon: "Activity",
    dashboardTitle: "Egzoz & Emisyon Servis Paneli",
    dashboardSubtitle: "DPF makinesinde kurum temizliği, spiral kaynakları ve susturucu.",
    activeJobsLabel: "Egzoz Kanalındaki Araçlar",
    quickActions: [
      { id: "qa-eg1", title: "Dizel Partikül Filtresi (DPF) Makine Temizliği", description: "İlaçlı hidrotermal makinede tam kurum tahliyesi", estimatedDuration: "3 saat", defaultPrice: 4200, iconName: "RotateCcw" },
      { id: "qa-eg2", title: "Egzoz Spiral Boru Kesme & Kaynak", description: "Titreşim önleyici çift katmanlı çelik spiral montajı", estimatedDuration: "1 saat", defaultPrice: 1800, iconName: "Flame" },
      { id: "qa-eg3", title: "Katalitik Konvertör Arıza Kontrolü", description: "Basınç sensörü, seramik petek ve gaz kaçak testi", estimatedDuration: "45 dk", defaultPrice: 750, iconName: "Search" },
    ],
    stockItems: [
      { id: "st-eg1", name: "Çift Katmanlı Esnek Egzoz Spirali 50x200", code: "EXH-FLX-50200", unit: "Adet", physical: 12, reserved: 2, minimum: 4, price: 680, cost: 360, supplierName: "Egzozsan Toptan" },
      { id: "st-eg2", name: "DPF Partikül Temizleme Kimyasal Sıvısı (5L)", code: "CHM-DPF-CLN-5L", unit: "Bidon", physical: 6, reserved: 1, minimum: 2, price: 950, cost: 580, supplierName: "Egzozsan Toptan" },
    ],
    suppliers: [
      { id: "sup-eg1", name: "Egzozsan Katalizör & Boru Sanayi", contact: "Necmi Egzozcu", phone: "0326 729 33 44" },
    ],
    sampleOrders: [
      { id: "WO-EG01", plate: "31 EGZ 44", vehicleModel: "BMW 520d F10", customerName: "İlhan Polat", phone: "0538 345 90 12", complaint: "DPF tıkalı uyarısı veriyor, çekiş düştü, alttan zırıltı geliyor.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 6200, paid: 2000, laborName: "DPF Söküm, Makinede Yıkama & Spiral Değişimi", partName: "DPF Yıkama Kimyasalı + 60x200 Spiral" },
    ],
  },

  // 19. RADYATÖR & PETEK
  {
    id: "radyator-petek",
    order: 19,
    name: "Radyatör & Petek",
    craftsmanTitle: "Radyatör & Petek Ustası",
    businessName: "TermoPetek Radyatör & Kalorifer Servisi",
    category: "Mekanik & Güç Aktarma",
    shortDesc: "Torpidoyu sökmeden kalorifer peteği temizliği, radyatör kaçak tamiri ve antifriz.",
    icon: "Thermometer",
    dashboardTitle: "Radyatör & Kalorifer Petek Paneli",
    dashboardSubtitle: "Darbeli makineyle petek yıkama, radyatör şişleme ve basınç testi.",
    activeJobsLabel: "Yıkama Makinesine Bağlı Araçlar",
    quickActions: [
      { id: "qa-rd1", title: "Torpidoyu Sökmeden Makineyle Petek Temizliği", description: "Çift yönlü darbeli sıcak kimyasallı petek yıkama", estimatedDuration: "1 saat", defaultPrice: 1200, iconName: "RotateCcw" },
      { id: "qa-rd2", title: "Su Radyatörü Kaçak Tamiri & Şişleme", description: "Kazan sökümü, tıkanmış kanalların açılması ve test", estimatedDuration: "3 saat", defaultPrice: 1950, iconName: "Wrench" },
      { id: "qa-rd3", title: "G12/G13 Kırmızı Organik Antifriz Yenileme", description: "Saf su karışımlı -36°C tam soğutma sıvısı değişimi", estimatedDuration: "40 dk", defaultPrice: 900, iconName: "Droplet" },
    ],
    stockItems: [
      { id: "st-rd1", name: "Organik Kırmızı Antifriz Konsantre (3L)", code: "ANT-RED-3L", unit: "Kutu (3L)", physical: 25, reserved: 4, minimum: 8, price: 450, cost: 260, supplierName: "Termo Radyatör Malzemeleri" },
      { id: "st-rd2", name: "Petek Yıkama Özel Kireç Çözücü Kimyasal (1L)", code: "CHM-RAD-FLSH", unit: "Şişe", physical: 30, reserved: 3, minimum: 10, price: 180, cost: 85, supplierName: "Termo Radyatör Malzemeleri" },
    ],
    suppliers: [
      { id: "sup-rd1", name: "Termo Radyatör & Soğutma Parçaları", contact: "Vedat Radyatörcü", phone: "0326 730 55 66" },
    ],
    sampleOrders: [
      { id: "WO-RD01", plate: "31 PET 14", vehicleModel: "Renault Megane 3", customerName: "Onur Kılıç", phone: "0539 456 01 23", complaint: "Sağ taraf soğuk üflüyor, kalorifer ısıtmıyor.", status: "READY", stageLabel: "Teslime Hazır", total: 1800, paid: 1800, laborName: "Makine ile Çift Yönlü Kalorifer Peteği Temizliği + Antifriz", partName: "Petek Yıkama Kimyasalı + 3L Kırmızı Antifriz" },
    ],
  },

  // 20. TORNA & KAYNAK
  {
    id: "torna-kaynak",
    order: 20,
    name: "Torna & Kaynak",
    craftsmanTitle: "Torna & Kaynak Ustası",
    businessName: "Özkan Torna, Freze & Alüminyum Kaynak",
    category: "Mekanik & Güç Aktarma",
    shortDesc: "Kırık civata çıkarma, helikoil diş açma, volan taşlama, alüminyum TIG kaynak.",
    icon: "Wrench",
    dashboardTitle: "Torna & Kaynak Atölyesi Paneli",
    dashboardSubtitle: "Masaüstü torna işleri, blok diş kurtarma ve argon kaynağı.",
    activeJobsLabel: "Torna Aynasındaki Parçalar",
    quickActions: [
      { id: "qa-tn1", title: "Kırık Civata & Saplama Çıkarma", description: "Blok veya kapak içindeki kırık civatanın çıkarılması", estimatedDuration: "1 saat", defaultPrice: 950, iconName: "Tool" },
      { id: "qa-tn2", title: "Helikoil Yaylı Diş Açma / Onarımı", description: "Yalama olan buji veya karter dişinin yenilenmesi", estimatedDuration: "45 dk", defaultPrice: 700, iconName: "RotateCcw" },
      { id: "qa-tn3", title: "Karter / Blok Alüminyum TIG Argon Kaynağı", description: "Çatlak karterin temizlenip alüminyum kaynağı", estimatedDuration: "1.5 saat", defaultPrice: 1500, iconName: "Flame" },
      { id: "qa-tn4", title: "Volan & Kampana Hassas Taşlama", description: "Salgısız pürüzsüz kavrama yüzeyi tornalanması", estimatedDuration: "1 saat", defaultPrice: 1100, iconName: "Disc" },
    ],
    stockItems: [
      { id: "st-tn1", name: "Helikoil Çelik Yay Diş Takımı (M10-M12-M14)", code: "HLK-SET-MIX", unit: "Kutu", physical: 8, reserved: 1, minimum: 2, price: 850, cost: 420, supplierName: "Hırdavat Teknik Torna" },
      { id: "st-tn2", name: "Alüminyum TIG Kaynak Teli AlSi5", code: "WLD-TIG-ALSI", unit: "Paket (1kg)", physical: 10, reserved: 0, minimum: 3, price: 420, cost: 230, supplierName: "Hırdavat Teknik Torna" },
    ],
    suppliers: [
      { id: "sup-tn1", name: "Hırdavat Teknik Torna Ekipmanları", contact: "Salih Tornacı", phone: "0326 731 77 88" },
    ],
    sampleOrders: [
      { id: "WO-TN01", plate: "31 TRN 50", vehicleModel: "Volkswagen Caddy 1.6 TDI", customerName: "Ferhat Bilgin", phone: "0530 567 12 34", complaint: "Karter tapa dişi yalama olmuş yağ damlatıyor, 1 buji saplaması kırık.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 1950, paid: 1000, laborName: "Karter Diş Helikoil + Kırık Buji Saplama Çıkarma", partName: "M14 Helikoil Yayı + Özel Tapa" },
    ],
  },

  // 21. LASTİK & ROT-BALANS
  {
    id: "lastik-rot-balans",
    order: 21,
    name: "Lastik & Rot-Balans",
    craftsmanTitle: "Lastik Ustası",
    businessName: "Kardeşler Lastik Park & Rot-Balans",
    category: "Donanım, Lastik & Bakım",
    shortDesc: "Lastik sökme-takma, mevsimlik otel, fitil tamiri, jant doğrultma ve nitrojen.",
    icon: "Disc",
    dashboardTitle: "Lastik & Jant Servis Paneli",
    dashboardSubtitle: "Günlük lastik değişimleri, balans ayarları ve lastik oteli stokları.",
    activeJobsLabel: "Liftteki Lastik İşleri",
    quickActions: [
      { id: "qa-lt1", title: "4 Lastik Sökme, Takma & Balans", description: "Jant temizliği, yeni sibop ve bilgisayarlı balans", estimatedDuration: "40 dk", defaultPrice: 900, iconName: "Disc" },
      { id: "qa-lt2", title: "Lastik Patlak Mantar / Yama Tamiri", description: "İçten sıcak pres yama veya fitil uygulaması", estimatedDuration: "20 dk", defaultPrice: 250, iconName: "Shield" },
      { id: "qa-lt3", title: "Lastik Oteli Sezonluk Saklama", description: "Barkodlu 4 lastik yıkama, poşetleme ve depolama", estimatedDuration: "15 dk", defaultPrice: 1200, iconName: "Package" },
      { id: "qa-lt4", title: "Jant Eğrilik Doğrultma (Pres)", description: "Alüminyum alaşım jant salgı ve ezik düzeltme", estimatedDuration: "1 saat", defaultPrice: 850, iconName: "RotateCcw" },
    ],
    stockItems: [
      { id: "st-lt1", name: "205/55 R16 91V Dört Mevsim Lastik", code: "TIR-2055516-4S", unit: "Adet", physical: 16, reserved: 4, minimum: 8, price: 2450, cost: 1850, supplierName: "Lassa-Bridgestone Bölge Bayi" },
      { id: "st-lt2", name: "TR414 Standart Kauçuk Sibop", code: "VLV-TR414", unit: "Paket (100 Adet)", physical: 8, reserved: 1, minimum: 2, price: 350, cost: 180, supplierName: "Lassa-Bridgestone Bölge Bayi" },
      { id: "st-lt3", name: "Yapışkanlı Jant Balans Kurşunu (60gr)", code: "BLS-STK-60G", unit: "Kutu (50 Adet)", physical: 14, reserved: 2, minimum: 4, price: 420, cost: 240, supplierName: "Lassa-Bridgestone Bölge Bayi" },
    ],
    suppliers: [
      { id: "sup-lt1", name: "Lassa-Bridgestone Bölge Dağıtım", contact: "Ersin Lastikçi", phone: "0326 732 99 00" },
    ],
    sampleOrders: [
      { id: "WO-LT01", plate: "31 LST 67", vehicleModel: "Fiat Egea Cross 1.6", customerName: "Kemal Uysal", phone: "0531 678 23 45", complaint: "Kışlık lastikler sökülüp 4 adet yeni 205/55 R16 takılacak, kışlıklar otele.", status: "READY", stageLabel: "Teslime Hazır", total: 11000, paid: 11000, laborName: "4 Lastik Değişim, Balans + Lastik Oteli Kaydı", partName: "4x 205/55 R16 Lastik + 4x Sibop" },
    ],
  },

  // 22. PERİYODİK HIZLI BAKIM
  {
    id: "hizli-bakim",
    order: 22,
    name: "Periyodik Hızlı Bakım",
    craftsmanTitle: "Hızlı Bakım Ustası",
    businessName: "Express Hızlı Servis & Periyodik Bakım",
    category: "Donanım, Lastik & Bakım",
    shortDesc: "30 dakikada yağ, 4 filtre, antifriz, fren balatası ve 32 nokta güvenlik kontrolü.",
    icon: "Clock",
    dashboardTitle: "Express Hızlı Bakım İstasyonu",
    dashboardSubtitle: "30 dakikalık hızlı servis peronları ve 32 nokta güvenlik kontrolü.",
    activeJobsLabel: "Perondaki Araçlar",
    quickActions: [
      { id: "qa-hb1", title: "Full Periyodik Bakım Paketi", description: "Motor yağı + yağ/hava/polen/yakıt filtreleri değişimi", estimatedDuration: "40 dk", defaultPrice: 3400, iconName: "CheckCircle" },
      { id: "qa-hb2", title: "32 Nokta Güvenlik Kontrolü", description: "Fren, süspansiyon, akü, aydınlatma ve sıvı seviyeleri", estimatedDuration: "20 dk", defaultPrice: 450, iconName: "ShieldCheck" },
      { id: "qa-hb3", title: "Karterden Vakumlu / Tapalı Yağ Değişimi", description: "Orijinal viskoziteli yağ dolumu ve servis sıfırlama", estimatedDuration: "25 dk", defaultPrice: 1950, iconName: "Droplet" },
    ],
    stockItems: [
      { id: "st-hb1", name: "Motor Yağı 5W-30 DPF Uyumlu (5L)", code: "OIL-5W30-5L", unit: "Bidon", physical: 30, reserved: 6, minimum: 10, price: 1550, cost: 980, supplierName: "Mobil-Castrol Dağıtım" },
      { id: "st-hb2", name: "Karbonlu Polen Filtresi Standart", code: "FLT-PLN-CRB", unit: "Adet", physical: 22, reserved: 4, minimum: 6, price: 380, cost: 190, supplierName: "Mann-Filter Toptan" },
    ],
    suppliers: [
      { id: "sup-hb1", name: "Mobil & Castrol Yetkili Distribütör", contact: "Zafer Yağ", phone: "0326 733 11 22" },
      { id: "sup-hb2", name: "Mann-Filter Filtre Sistemleri", contact: "Ertan Filtre", phone: "0326 618 33 44" },
    ],
    sampleOrders: [
      { id: "WO-HB01", plate: "31 HB 101", vehicleModel: "Renault Megane 4 1.3 TCe", customerName: "Mert Yılmaz", phone: "0532 789 34 56", complaint: "15.000 km periyodik bakımı ve tatil öncesi kontrol.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 3650, paid: 1500, laborName: "Periyodik Bakım İşçiliği + 32 Nokta Kontrol", partName: "5W-30 Motor Yağı + 4 Filtre Seti" },
    ],
  },

  // 23. LPG & GAZ SİSTEMLERİ
  {
    id: "lpg-gaz",
    order: 23,
    name: "LPG & Gaz Sistemleri",
    craftsmanTitle: "LPG & Otogaz Ustası",
    businessName: "MaviGaz LPG & Otogaz Dönüşüm Servisi",
    category: "Mekanik & Güç Aktarma",
    shortDesc: "LPG filtresi, gaz ayarı, enjektör, regülatör revizyonu, kaçak testi ve tank değişimi.",
    icon: "Flame",
    dashboardTitle: "LPG & Otogaz Dönüşüm Paneli",
    dashboardSubtitle: "Gaz kaçak dedektörü testleri, kalibrasyon ve tank periyot takibi.",
    activeJobsLabel: "Gaz Kanalındaki Araçlar",
    quickActions: [
      { id: "qa-lp1", title: "LPG Filtre Değişimi & Bilgisayarlı Gaz Ayarı", description: "Sıvı/gaz fazı filtre değişimi ve yol ayarı kalibrasyonu", estimatedDuration: "35 dk", defaultPrice: 850, iconName: "Sliders" },
      { id: "qa-lp2", title: "LPG Kaçak Dedektör Testi & Sızdırmazlık", description: "Tank, boru hattı ve regülatör sızdırmazlık raporu", estimatedDuration: "25 dk", defaultPrice: 400, iconName: "ShieldAlert" },
      { id: "qa-lp3", title: "LPG Regülatör / Beyin Revizyonu", description: "Diyafram seti yenileme ve gaz basınç ayarı", estimatedDuration: "1.5 saat", defaultPrice: 1800, iconName: "Wrench" },
      { id: "qa-lp4", title: "10 Yıllık Simit / Silindir LPG Tank Değişimi", description: "TSE onaylı yeni tank montajı ve montaj tespit raporu", estimatedDuration: "2 saat", defaultPrice: 6200, iconName: "RotateCw" },
    ],
    stockItems: [
      { id: "st-lp1", name: "LPG Gaz Filtresi 12x12mm Tekli", code: "LPG-FLT-1212", unit: "Adet", physical: 40, reserved: 5, minimum: 10, price: 180, cost: 75, supplierName: "Atiker-Prins Dağıtım" },
      { id: "st-lp2", name: "Simit LPG Tankı 42 Litre (TSE Onaylı)", code: "LPG-TNK-42TR", unit: "Adet", physical: 5, reserved: 1, minimum: 2, price: 3400, cost: 2350, supplierName: "Atiker-Prins Dağıtım" },
      { id: "st-lp3", name: "4 Silindir LPG Enjektör Kütüğü 2 Ohm", code: "LPG-INJ-4CYL", unit: "Kütük", physical: 6, reserved: 1, minimum: 2, price: 1650, cost: 1050, supplierName: "Atiker-Prins Dağıtım" },
    ],
    suppliers: [
      { id: "sup-lp1", name: "Atiker & Prins Yetkili Parça Dağıtım", contact: "Yavuz Gazcı", phone: "0326 734 55 66" },
    ],
    sampleOrders: [
      { id: "WO-LP01", plate: "31 LPG 09", vehicleModel: "Honda Civic 1.6 Eco", customerName: "Serhat Kaya", phone: "0533 890 45 67", complaint: "Gaza geçince tekleme yapıyor, sabahları gaz kokusu geliyor.", status: "IN_PROGRESS", stageLabel: "İşlemde", total: 2450, paid: 1000, laborName: "Kaçak Tespiti + Filtre Değişimi + Bilgisayarlı Yol Ayarı", partName: "2x LPG Filtresi + Kelepçeler" },
    ],
  },
];

export const BRANCH_CATEGORIES: BranchCategory[] = [
  "Mekanik & Güç Aktarma",
  "Elektrik & Elektronik",
  "Gövde, Boya & Cam",
  "Donanım, Lastik & Bakım",
];

export function getBranchProfile(id?: string | null): CraftsmanBranchProfile {
  if (!id) return CRAFTSMAN_BRANCHES[0];
  const found = CRAFTSMAN_BRANCHES.find(
    (b) => b.id === id || b.name.toLowerCase() === id.toLowerCase(),
  );
  return found ?? CRAFTSMAN_BRANCHES[0];
}

export function getBranchInitialData(branchId?: string | null) {
  const profile = getBranchProfile(branchId);
  const customers: Customer[] = profile.sampleOrders.map((o, idx) => ({
    id: `c-${profile.id}-${idx + 1}`,
    name: o.customerName,
    phone: o.phone,
    email: `${o.customerName.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
  }));

  const vehicles: Vehicle[] = profile.sampleOrders.map((o, idx) => ({
    id: `v-${profile.id}-${idx + 1}`,
    plate: o.plate,
    model: o.vehicleModel,
    brand: o.vehicleModel.split(" ")[0],
    year: 2018 + (idx % 5),
    customerId: `c-${profile.id}-${idx + 1}`,
    mileage: 85000 + idx * 12500,
    active: true,
    fuelType: "Dizel",
    lastService: {
      date: "10 Ekim 2026",
      title: o.laborName,
      mileage: 80000 + idx * 12000,
    },
  }));

  const orders: WorkOrder[] = profile.sampleOrders.map((o, idx) => ({
    id: o.id,
    vehicleId: `v-${profile.id}-${idx + 1}`,
    customerId: `c-${profile.id}-${idx + 1}`,
    branchId: "dortyol",
    technicianId: "mehmet",
    assigneeIds: ["mehmet"],
    status: o.status,
    createdAt: "2026-10-21T08:30:00+03:00",
    dueAt: "2026-10-21T17:30:00+03:00",
    updatedLabel: "Bugün",
    stageDuration: "2 saat",
    complaint: o.complaint,
    diagnosis: `${profile.name} uzman kontrolü yapıldı. ${o.laborName} işlemi uygulanıyor.`,
    intakeMileage: 85000 + idx * 12500,
    fuel: 50,
    labor: [{ id: `l-${idx}`, name: o.laborName, amount: Math.round(o.total * 0.45) }],
    parts: [
      {
        id: `p-${idx}`,
        name: o.partName,
        quantity: 1,
        price: Math.round(o.total * 0.55),
        historicCost: Math.round(o.total * 0.35),
        state: "CONSUMED",
      },
    ],
    total: o.total,
    paid: o.paid,
    quoteRevision: 1,
    approval: "APPROVED",
    approvalChannel: "SMS / Telefon Onayı",
    quoteStatus: "APPROVED",
    quoteItems: [],
    partRequests: [],
    notes: [
      {
        id: `n-${profile.id}-${idx}`,
        author: profile.craftsmanTitle,
        text: `${o.complaint} için giriş yapıldı. ${o.laborName} işlemi başlatıldı.`,
        at: "Bugün 09:00",
      },
    ],
    additionalCosts: 0,
    timeline: [
      {
        id: `t-${profile.id}-${idx}-1`,
        time: "08:30",
        text: "Araç atölyeye kabul edildi ve ön kayıt açıldı.",
      },
      {
        id: `t-${profile.id}-${idx}-2`,
        time: "09:15",
        text: `${o.laborName} işlemi başlatıldı.`,
      },
    ],
  }));

  const parts: StockPart[] = profile.stockItems.map((item, idx) => ({
    id: item.id,
    name: item.name,
    code: item.code,
    physical: item.physical,
    reserved: item.reserved,
    minimum: item.minimum,
    price: item.price,
    cost: item.cost,
    supplierId: `sup-${profile.id}-${(idx % 2) + 1}`,
    branchId: "dortyol",
  }));

  const suppliers: Supplier[] = profile.suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    contact: s.contact,
    phone: s.phone,
    email: "",
  }));

  const movements: StockMovement[] = profile.stockItems.map((item, idx) => ({
    id: `m-${profile.id}-${idx}`,
    partId: item.id,
    amount: item.physical,
    at: "2026-10-21T08:00:00+03:00",
    note: "Dönem açılış stoku",
  }));

  const expenses: Expense[] = [
    {
      id: `exp-${profile.id}-1`,
      title: `${profile.name} atölye sarf malzemesi`,
      amount: 1450,
      at: "2026-10-21T09:15:00+03:00",
      branchId: "dortyol",
      kind: "expense",
    },
  ];

  return { customers, vehicles, orders, parts, suppliers, movements, expenses };
}

export function findWorkOrderAcrossAllBranches(orderId: string): {
  order: WorkOrder;
  customer?: Customer;
  vehicle?: Vehicle;
} | null {
  if (!orderId) return null;
  const normalized = orderId.trim().toUpperCase();
  for (const branch of CRAFTSMAN_BRANCHES) {
    const data = getBranchInitialData(branch.id);
    const foundOrder = data.orders.find((o) => o.id.toUpperCase() === normalized);
    if (foundOrder) {
      const foundCustomer = data.customers.find((c) => c.id === foundOrder.customerId);
      const foundVehicle = data.vehicles.find((v) => v.id === foundOrder.vehicleId);
      return { order: foundOrder, customer: foundCustomer, vehicle: foundVehicle };
    }
  }
  return null;
}
