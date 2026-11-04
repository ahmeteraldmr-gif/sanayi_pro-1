export type TrainingTrackId =
  | "overview"
  | "customer-vehicle"
  | "plate-reading"
  | "vehicle-intake"
  | "work-orders"
  | "team-management"
  | "stock-suppliers"
  | "finance-collection"
  | "calendar-appointments"
  | "vehicle-delivery";

export type TrainingStepType = "info" | "action";

export type TrainingStep = {
  id: string;
  stepType?: TrainingStepType;
  title: string;
  instruction: string;
  detail?: string;
  expectedRoute: string;
  targetRoute?: string;
  targetSelector: string;
  successMessage: string;
  actionType?: "click" | "input" | "navigate" | "custom";
  demoHint?: string;
  highlightPosition?: "bottom" | "top" | "left" | "right" | "center";
};

export function getStepType(step: TrainingStep): TrainingStepType {
  if (step.stepType) return step.stepType;
  if (step.actionType === "click" || step.actionType === "navigate" || step.actionType === "input") {
    return "action";
  }
  return "info";
}

export function isRouteMatching(expectedRoute: string, pathname: string): boolean {
  if (!expectedRoute) return true;
  const p = (pathname || "").replace(/^\/sanayipro/, "").replace(/\/+$/, "") || "/";
  const e = (expectedRoute || "").replace(/^\/sanayipro/, "").replace(/\/+$/, "") || "/";

  if (e === "/app/work-orders/[id]") return /^\/app\/work-orders\/[^/]+/.test(p);
  if (e === "/app/customers/[id]") return /^\/app\/customers\/[^/]+/.test(p);
  if (e === "/app/vehicles/[id]") return /^\/app\/vehicles\/[^/]+/.test(p);
  if (e === "/app/suppliers/[id]") return /^\/app\/suppliers\/[^/]+/.test(p);
  if (e === "/app/stock/[id]") return /^\/app\/stock\/[^/]+/.test(p);
  if (e === "/app/team/[id]") return /^\/app\/team\/[^/]+/.test(p);

  return p === e || p.startsWith(e + "/");
}

export type TrainingTrack = {
  id: TrainingTrackId;
  order: number;
  title: string;
  shortDesc: string;
  iconName: string;
  durationMinutes: number;
  category: "Temel" | "Operasyon" | "Yönetim";
  steps: TrainingStep[];
};

export const TRAINING_TRACKS: TrainingTrack[] = [
  {
    id: "overview",
    order: 1,
    title: "1. Paneli Tanı",
    shortDesc: "Genel bakış, menü, arama, bildirimler ve şube yönetimini keşfedin.",
    iconName: "LayoutDashboard",
    durationMinutes: 3,
    category: "Temel",
    steps: [
      {
        id: "ov-sidebar",
        stepType: "info",
        title: "Menü ve Modüller",
        instruction: "Sol taraftaki menü üzerinden tüm servis modüllerine tek tıkla ulaşabilirsiniz.",
        detail: "İş emirleri, araç kabul, müşteri takibi, stok ve finans modülleri bu menüde yer alır.",
        expectedRoute: "/app",
        targetSelector: '[data-tour="sidebar-nav"]',
        successMessage: "Harika! Menü yapısını incelediniz.",
        highlightPosition: "right",
      },
      {
        id: "ov-search",
        stepType: "action",
        title: "Global Arama (Plaka & Müşteri)",
        instruction: "Şimdi üst bardaki Global Arama kutusuna tıklayın.",
        detail: "Buradan herhangi bir plaka, müşteri adı veya telefon numarası yazarak anında kayda gidebilirsiniz.",
        expectedRoute: "/app",
        targetSelector: '[data-tour="global-search"]',
        successMessage: "Süper! Arama çubuğu her an elinizin altındadır.",
        actionType: "click",
        highlightPosition: "bottom",
      },
      {
        id: "ov-quick-action",
        stepType: "action",
        title: "Hızlı İşlem Butonu",
        instruction: "Şimdi mavi çerçeveyle gösterilen Hızlı İşlem butonuna tıklayın.",
        detail: "Yeni iş emri, araç kabul, plaka okuma veya tahsilat ekleme gibi kritik işlemleri buradan başlatabilirsiniz.",
        expectedRoute: "/app",
        targetSelector: '[data-tour-id="quick-action-button"], [data-tour="quick-actions"], .ux-quick-trigger',
        successMessage: "Çok iyi! Hızlı işlem menüsünü açtınız.",
        actionType: "click",
        highlightPosition: "bottom",
      },
      {
        id: "ov-branch",
        stepType: "info",
        title: "Şube Seçimi",
        instruction: "Üst bardaki şube seçiciyi inceleyin.",
        detail: "Birden fazla atölyeniz veya şubeniz varsa, aralarında tek tıkla geçiş yapabilirsiniz.",
        expectedRoute: "/app",
        targetSelector: '[data-tour="branch-selector"]',
        successMessage: "Doğru! Şube bazlı izolasyon otomatik çalışır.",
        highlightPosition: "bottom",
      },
      {
        id: "ov-notif",
        stepType: "action",
        title: "Akıllı Bildirimler",
        instruction: "Bildirim çanına tıklayarak servis uyarılarını görün.",
        detail: "Onay bekleyen teklifler, geciken teslimatlar ve azalan kritik stoklar burada listelenir.",
        expectedRoute: "/app",
        targetSelector: '[data-tour="notifications"]',
        successMessage: "Tebrikler! Paneli Tanı eğitimini başarıyla tamamladınız.",
        actionType: "click",
        highlightPosition: "bottom",
      },
    ],
  },
  {
    id: "customer-vehicle",
    order: 2,
    title: "2. Müşteri ve Araç Kaydı",
    shortDesc: "Yeni müşteri profili oluşturup araca bağlamayı ve geçmişi görmeyi öğrenin.",
    iconName: "Users",
    durationMinutes: 4,
    category: "Temel",
    steps: [
      {
        id: "cv-nav",
        title: "Müşteri & Araçlar Modülü",
        instruction: "Sol menüden 'Müşteri & Araçlar' bölümüne tıklayın.",
        detail: "Kayıtlı tüm müşteriler ve araç filoları bu alanda yönetilir.",
        expectedRoute: "/app/customers",
        targetSelector: '[data-tour="nav-customers"]',
        successMessage: "Harika! Müşteri ve araç listesine ulaştınız.",
        actionType: "navigate",
        highlightPosition: "right",
      },
      {
        id: "cv-new-btn",
        title: "Yeni Müşteri & Araç Ekle",
        instruction: "Üst sağdaki '+ Yeni Kayıt' butonuna tıklayın.",
        detail: "Müşteriyi ve ilk aracını tek formda birlikte kaydedebilirsiniz.",
        expectedRoute: "/app/customers",
        targetSelector: '[data-tour="new-customer-trigger"]',
        successMessage: "Kayıt formu açıldı.",
        actionType: "click",
        highlightPosition: "bottom",
      },
      {
        id: "cv-fill",
        title: "Bilgileri Kaydet",
        instruction: "Örnek müşteri ve plaka bilgilerini girip 'Kaydet' butonuna basın.",
        detail: "Demo: Mehmet Çetin · 0532 555 12 34 · 34 ABC 789 (Volkswagen Passat 2021).",
        expectedRoute: "/app/customers/new",
        targetSelector: '[data-tour="customer-form-save"]',
        successMessage: "Müşteri ve araç başarıyla sisteme kaydedildi!",
        demoHint: "Demo: İsim: 'Mehmet Çetin', Tel: '05325551234', Plaka: '34 ABC 789'",
        actionType: "click",
        highlightPosition: "top",
      },
      {
        id: "cv-detail",
        title: "Müşteri Detayını İncele",
        instruction: "Müşteri detayında araçları, harcamaları ve servis geçmişini inceleyin.",
        detail: "Müşteri profilinde kayıtlı araçlar, toplam servis harcamaları ve açık iş emirleri tek ekranda özetlenir.",
        expectedRoute: "/app/customers",
        targetSelector: '[data-tour="customer-detail-summary"], [data-tour="customer-first-row"]',
        successMessage: "Tebrikler! Müşteri ve Araç Kaydı eğitimini tamamladınız.",
        actionType: "click",
        highlightPosition: "right",
      },
    ],
  },
  {
    id: "plate-reading",
    order: 3,
    title: "3. Plaka Okuma",
    shortDesc: "Kamera veya demo plaka girişi ile aracı 1 saniyede tanıyın.",
    iconName: "Camera",
    durationMinutes: 2,
    category: "Operasyon",
    steps: [
      {
        id: "pr-open",
        title: "Plaka Oku Aracını Başlat",
        instruction: "Ana sayfadaki veya hızlı işlemdeki 'Plaka Oku / Araç Bul' butonuna tıklayın.",
        detail: "Mobil cihazlarda kamerayı kullanarak aracı anında plakasından tanıyabilirsiniz.",
        expectedRoute: "/app",
        targetSelector: '[data-tour="plate-scanner-btn"]',
        successMessage: "Plaka tanıma penceresi açıldı.",
        actionType: "click",
        highlightPosition: "bottom",
      },
      {
        id: "pr-enter",
        title: "Örnek Plakayı Seçin",
        instruction: "Demo plaka seçeneğine (31 ABC 123) tıklayın veya plaka kutusuna yazın.",
        detail: "Sistem mevcut plaka ile geçmiş servis kayıtlarını ve araç sahibini anında eşleştirir.",
        expectedRoute: "/app",
        targetSelector: '[data-tour="demo-plate-chip"]',
        successMessage: "Araç bulundu: 31 ABC 123 - Renault Megane.",
        actionType: "click",
        highlightPosition: "top",
      },
      {
        id: "pr-confirm",
        title: "Doğrula ve Araca Git",
        instruction: "Eşleşen aracın detayını açmak için 'Aracı İncele / İş Emri Aç' butonuna tıklayın.",
        detail: "Plaka okuma sonucu ustanın veya danışmanın teyidi ile işleme alınır.",
        expectedRoute: "/app",
        targetSelector: '[data-tour="plate-inspect-btn"]',
        successMessage: "Mükemmel! Plaka Okuma eğitimini tamamladınız.",
        actionType: "click",
        highlightPosition: "bottom",
      },
    ],
  },
  {
    id: "vehicle-intake",
    order: 4,
    title: "4. Araç Kabul",
    shortDesc: "Km, yakıt, şikâyet, hasar tespiti ve usta atamasıyla tam kabul yapın.",
    iconName: "CarFront",
    durationMinutes: 4,
    category: "Operasyon",
    steps: [
      {
        id: "vi-nav",
        title: "Araç Kabul Sayfasına Git",
        instruction: "Sol menüden 'Araç Kabul' butonuna tıklayın.",
        detail: "Servise fiziki olarak gelen araçların kabul kontrolü bu ekranda yapılır.",
        expectedRoute: "/app/intake",
        targetSelector: '[data-tour="nav-intake"]',
        successMessage: "Araç kabul ekranındasınız.",
        actionType: "navigate",
        highlightPosition: "right",
      },
      {
        id: "vi-select",
        title: "Araç Seç",
        instruction: "Kabul edilecek aracı listeden seçin veya plakayı arayın.",
        detail: "Örnek: 31 ABC 123 seçin.",
        expectedRoute: "/app/intake",
        targetSelector: '[data-tour="intake-vehicle-select"]',
        successMessage: "Araç seçildi.",
        actionType: "click",
        highlightPosition: "bottom",
      },
      {
        id: "vi-fill",
        title: "Kabul Bilgilerini Doldur",
        instruction: "Kilometre, şikâyet ve yakıt seviyesini belirleyin.",
        detail: "Giriş kilometresi önceki servis kilometresinden düşük girilirse sistem akıllı uyarı verir.",
        expectedRoute: "/app/intake",
        targetSelector: '[data-tour="intake-mileage-input"]',
        successMessage: "Metrikler girildi.",
        demoHint: "Km: 98.450, Yakıt: %50, Şikayet: 'Frenlerden sürtünme sesi geliyor.'",
        highlightPosition: "bottom",
      },
      {
        id: "vi-tech",
        title: "Sorumlu Usta Ata",
        instruction: "İşi yapacak sorumlu ustayı seçin (Örn: Mehmet Usta).",
        detail: "Araç kabul edildiği anda ilgili ustanın ekranına düşer.",
        expectedRoute: "/app/intake",
        targetSelector: '[data-tour="intake-tech-select"]',
        successMessage: "Usta atandı.",
        highlightPosition: "bottom",
      },
      {
        id: "vi-submit",
        title: "Kabulü Tamamla ve İş Emri Aç",
        instruction: "'Araç Kabulünü Tamamla' butonuna tıklayın.",
        detail: "Bu işlem aracı servise alır ve otomatik olarak yeni bir iş emri üretir.",
        expectedRoute: "/app/intake",
        targetSelector: '[data-tour="intake-complete-btn"]',
        successMessage: "Harika! Araç kabul edildi ve iş emri oluşturuldu.",
        actionType: "click",
        highlightPosition: "top",
      },
    ],
  },
  {
    id: "work-orders",
    order: 5,
    title: "5. İş Emirleri",
    shortDesc: "Aşama değiştirme, teşhis ekleme, parça ve iç not yönetimini öğrenin.",
    iconName: "ClipboardList",
    durationMinutes: 4,
    category: "Operasyon",
    steps: [
      {
        id: "wo-nav",
        stepType: "action",
        title: "İş Emirleri Listesi",
        instruction: "Sol menüden 'İş Emirleri'ne tıklayın.",
        detail: "Servisteki tüm araçların durumunu Kanban veya Liste görünümünde inceleyin.",
        expectedRoute: "/app/work-orders",
        targetSelector: '[data-tour="nav-work-orders"]',
        successMessage: "İş emirleri listesindesiniz.",
        actionType: "navigate",
        highlightPosition: "right",
      },
      {
        id: "wo-open",
        stepType: "action",
        title: "İş Emri Detayını Aç",
        instruction: "Listeden üzerinde çalışılan ilk iş emrine tıklayın.",
        detail: "Kompakt başlık, operasyon şeridi ve sticky finans paneli tek ekranda açılır.",
        expectedRoute: "/app/work-orders",
        targetRoute: "/app/work-orders/[id]",
        targetSelector: '[data-tour="work-order-row-first"]',
        successMessage: "İş emri detayı açıldı.",
        actionType: "navigate",
        highlightPosition: "bottom",
      },
      {
        id: "wo-next-action",
        stepType: "action",
        title: "Sıradaki İşlem Butonu",
        instruction: "Operasyon şeridindeki ana butona tıklayarak işi bir sonraki aşamaya geçirin.",
        detail: "Örn: 'İşi Başlat' veya 'Son Kontrole Gönder'. Durumlar tek tıkla güncellenir.",
        expectedRoute: "/app/work-orders/[id]",
        targetSelector: '[data-tour="order-primary-action"]',
        successMessage: "İş emri durumu güncellendi!",
        actionType: "click",
        highlightPosition: "bottom",
      },
      {
        id: "wo-notes",
        stepType: "action",
        title: "Personel İç Notu Bırak",
        instruction: "'Geçmiş' sekmesine geçin veya 'Not Ekle' butonuna basarak ustanıza dahili not bırakın.",
        detail: "İç notlar sadece atölye personeli tarafından görülür; müşteriye yansımaz.",
        expectedRoute: "/app/work-orders/[id]",
        targetSelector: '[data-tour="order-add-note-btn"]',
        successMessage: "Tebrikler! İş Emirleri eğitimini tamamladınız.",
        actionType: "click",
        highlightPosition: "left",
      },
    ],
  },
  {
    id: "team-management",
    order: 6,
    title: "6. Ekip Yönetimi",
    shortDesc: "Ustaların aktif iş yükünü, uzmanlıklarını ve iş atamalarını yönetin.",
    iconName: "UsersRound",
    durationMinutes: 3,
    category: "Yönetim",
    steps: [
      {
        id: "tm-nav",
        title: "Ekip Modülü",
        instruction: "Sol menüden 'Ekip' sayfasına tıklayın.",
        detail: "Atölyenizdeki ustaları, hangi araç üzerinde çalıştıklarını ve iş yüklerini görün.",
        expectedRoute: "/app/team",
        targetSelector: '[data-tour="nav-team"]',
        successMessage: "Ekip yönetim ekranındasınız.",
        actionType: "navigate",
        highlightPosition: "right",
      },
      {
        id: "tm-status",
        title: "Usta Durumlarını İncele",
        instruction: "Hangi ustanın meşgul ('İşlemde') veya 'Boşta' olduğunu kartlardan inceleyin.",
        detail: "Ustanın uzmanlık alanı ve üzerinde çalıştığı aracın plakası anlık gösterilir.",
        expectedRoute: "/app/team",
        targetSelector: '[data-tour="team-member-card"]',
        successMessage: "Usta iş yükü kontrol edildi.",
        highlightPosition: "bottom",
      },
      {
        id: "tm-detail",
        title: "Usta Detayını Aç",
        instruction: "Bir ustanın kartına tıklayarak detay ve tamamladığı iş geçmişini açın.",
        detail: "Bu ekranda ustanın son 30 günlük tamamlanan işleri ve aktif performansı yer alır.",
        expectedRoute: "/app/team",
        targetSelector: '[data-tour="team-member-link"]',
        successMessage: "Tebrikler! Ekip Yönetimi eğitimini tamamladınız.",
        actionType: "click",
        highlightPosition: "right",
      },
    ],
  },
  {
    id: "stock-suppliers",
    order: 7,
    title: "7. Stok ve Tedarikçiler",
    shortDesc: "Kritik stok uyarısı, stok girişi ve parçayı iş emrine bağlama süreci.",
    iconName: "Package",
    durationMinutes: 4,
    category: "Operasyon",
    steps: [
      {
        id: "ss-nav",
        title: "Stok Modülüne Git",
        instruction: "Sol menüden 'Stok' sekmesine tıklayın.",
        detail: "Fiziksel stok, iş için ayrılan (rezerve) adet ve tedarikçi bilgileri bu ekrandadır.",
        expectedRoute: "/app/stock",
        targetSelector: '[data-tour="nav-stock"]',
        successMessage: "Stok ekranına ulaştınız.",
        actionType: "navigate",
        highlightPosition: "right",
      },
      {
        id: "ss-item",
        title: "Kritik Parçayı Bul",
        instruction: "Listeden 'Ön fren balatası' satırını bulun ve tıklayın.",
        detail: "Fiziksel stok ile rezerve edilen stok arasındaki farkı inceleyin.",
        expectedRoute: "/app/stock",
        targetSelector: '[data-tour="stock-item-first"]',
        successMessage: "Parça kartı açıldı.",
        actionType: "click",
        highlightPosition: "bottom",
      },
      {
        id: "ss-add",
        title: "Stok Girişi Yap",
        instruction: "'Stok Girişi Yap' butonuna tıklayarak stoğa 5 adet ekleyin.",
        detail: "Yeni gelen parçaları faturasıyla stoğa girerek maliyet takibini güncel tutun.",
        expectedRoute: "/app/stock",
        targetSelector: '[data-tour="stock-entry-trigger"]',
        successMessage: "Stok girişi kaydedildi ve kullanılabilir adet güncellendi!",
        actionType: "click",
        highlightPosition: "left",
      },
      {
        id: "ss-suppliers",
        title: "Tedarikçileri Gör",
        instruction: "Üst sekmelerden 'Tedarikçiler' bölümüne tıklayın.",
        detail: "Yedek parçaları aldığınız toptancı ve tedarikçilerin iletişim bilgileri burada saklanır.",
        expectedRoute: "/app/stock",
        targetSelector: '[data-tour="nav-suppliers-tab"]',
        successMessage: "Tebrikler! Stok ve Tedarikçiler eğitimini tamamladınız.",
        actionType: "click",
        highlightPosition: "bottom",
      },
    ],
  },
  {
    id: "finance-collection",
    order: 8,
    title: "8. Kasa ve Tahsilat",
    shortDesc: "Açık bakiye takibi, tahsilat girişi ve atölye gideri kaydetme.",
    iconName: "Wallet",
    durationMinutes: 3,
    category: "Yönetim",
    steps: [
      {
        id: "fc-nav",
        title: "Finans Ekranına Git",
        instruction: "Sol menüden 'Finans' modülüne tıklayın.",
        detail: "Günlük ciro, tahsil edilen tutarlar, açık bakiyeler ve giderler bu ekranda toplanır.",
        expectedRoute: "/app/finance",
        targetSelector: '[data-tour="nav-finance"]',
        successMessage: "Finans modülündesiniz.",
        actionType: "navigate",
        highlightPosition: "right",
      },
      {
        id: "fc-kpi",
        title: "Bakiye ve Ciroyu İncele",
        instruction: "Üstteki 'Bugünkü Tahsilat' ve 'Açık Müşteri Bakiyesi' KPI kartlarını inceleyin.",
        detail: "Tahsil edilmemiş servis ücretleri otomatik açık bakiye olarak gösterilir.",
        expectedRoute: "/app/finance",
        targetSelector: '[data-tour="finance-kpi-summary"]',
        successMessage: "Finans göstergeleri incelendi.",
        highlightPosition: "bottom",
      },
      {
        id: "fc-expense",
        title: "Atölye Gideri Ekle",
        instruction: "'+ Yeni Gider Ekle' butonuna tıklayarak örnek bir sarf malzeme gideri girin.",
        detail: "Kira, elektrik veya atölye sarf giderlerini sisteme işleyerek net kârınızı görün.",
        expectedRoute: "/app/finance",
        targetSelector: '[data-tour="finance-new-expense-btn"]',
        successMessage: "Tebrikler! Kasa ve Tahsilat eğitimini tamamladınız.",
        actionType: "click",
        highlightPosition: "left",
      },
    ],
  },
  {
    id: "calendar-appointments",
    order: 9,
    title: "9. Randevu ve Takvim",
    shortDesc: "Gelecek randevuları planlayın, usta atayın ve atölye yoğunluğunu yönetin.",
    iconName: "CalendarDays",
    durationMinutes: 3,
    category: "Operasyon",
    steps: [
      {
        id: "ca-nav",
        title: "Takvim Modülü",
        instruction: "Sol menüden 'Takvim' sayfasına tıklayın.",
        detail: "Günlük ve haftalık randevularınızı bu takvim üzerinden takip edin.",
        expectedRoute: "/app/calendar",
        targetSelector: '[data-tour="nav-calendar"]',
        successMessage: "Servis takvimine ulaştınız.",
        actionType: "navigate",
        highlightPosition: "right",
      },
      {
        id: "ca-new",
        title: "Yeni Randevu Ekle",
        instruction: "'+ Yeni Randevu' butonuna tıklayın.",
        detail: "Gelecek tarihli servis bakımı veya arıza randevusu oluşturun.",
        expectedRoute: "/app/calendar",
        targetSelector: '[data-tour="calendar-new-appt-btn"]',
        successMessage: "Randevu formu açıldı.",
        actionType: "click",
        highlightPosition: "bottom",
      },
      {
        id: "ca-save",
        title: "Randevuyu Kaydet",
        instruction: "Araç ve randevu saatini belirleyip 'Kaydet' butonuna basın.",
        detail: "Oluşturulan randevu saat geldiğinde otomatik olarak araç kabul ekranına aktarılabilir.",
        expectedRoute: "/app/calendar",
        targetSelector: '[data-tour="calendar-save-btn"]',
        successMessage: "Tebrikler! Randevu ve Takvim eğitimini tamamladınız.",
        actionType: "click",
        highlightPosition: "top",
      },
    ],
  },
  {
    id: "vehicle-delivery",
    order: 10,
    title: "10. Araç Teslimi",
    shortDesc: "Son kontrol, bakiye tahsilatı ve aracı müşteriye teslim etme döngüsü.",
    iconName: "ShieldCheck",
    durationMinutes: 3,
    category: "Operasyon",
    steps: [
      {
        id: "vd-open",
        stepType: "action",
        title: "Hazır İş Emrini Aç",
        instruction: "İş Emirleri listesinden durumu 'Teslime Hazır' olan aracı açın.",
        detail: "Araç hazır olduğunda müşteri aranır ve ödeme kontrolü yapılır.",
        expectedRoute: "/app/work-orders",
        targetRoute: "/app/work-orders/[id]",
        targetSelector: '[data-tour="work-order-ready-row"]',
        successMessage: "Hazır iş emri açıldı.",
        actionType: "navigate",
        highlightPosition: "bottom",
      },
      {
        id: "vd-balance",
        stepType: "action",
        title: "Açık Bakiyeyi Kapat",
        instruction: "Sağ paneldeki 'Tahsilat Al' butonuna tıklayarak kalan bakiyeyi kapatın.",
        detail: "Tahsilat alınmadan teslimat yapıldığında sistem açık bakiye uyarısı verir.",
        expectedRoute: "/app/work-orders/[id]",
        targetSelector: '[data-tour="rail-payment-btn"]',
        successMessage: "Tahsilat kaydedildi ve bakiye sıfırlandı.",
        actionType: "click",
        highlightPosition: "left",
      },
      {
        id: "vd-deliver",
        stepType: "action",
        title: "Aracı Teslim Et",
        instruction: "Sıradaki işlem şeridinden 'Aracı Teslim Et' butonuna tıklayın.",
        detail: "Bu işlem ile iş emri başarıyla kapatılır ve aracın servis geçmişine eklenir.",
        expectedRoute: "/app/work-orders/[id]",
        targetSelector: '[data-tour="order-primary-action"]',
        successMessage: "Tebrikler! Tüm servis döngüsünü başarıyla tamamladınız. Artık SanayiPro'yu profesyonelce kullanabilirsiniz!",
        actionType: "click",
        highlightPosition: "bottom",
      },
    ],
  },
];

export const INITIAL_TRAINING_PROGRESS: Record<TrainingTrackId, {
  status: "not_started" | "in_progress" | "completed";
  currentStepIndex: number;
  completedAt?: string;
}> = {
  overview: { status: "not_started", currentStepIndex: 0 },
  "customer-vehicle": { status: "not_started", currentStepIndex: 0 },
  "plate-reading": { status: "not_started", currentStepIndex: 0 },
  "vehicle-intake": { status: "not_started", currentStepIndex: 0 },
  "work-orders": { status: "not_started", currentStepIndex: 0 },
  "team-management": { status: "not_started", currentStepIndex: 0 },
  "stock-suppliers": { status: "not_started", currentStepIndex: 0 },
  "finance-collection": { status: "not_started", currentStepIndex: 0 },
  "calendar-appointments": { status: "not_started", currentStepIndex: 0 },
  "vehicle-delivery": { status: "not_started", currentStepIndex: 0 },
};
