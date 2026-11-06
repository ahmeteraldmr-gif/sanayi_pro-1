"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ArrowRight,
  Check,
  Menu,
  Search,
  Clock3,
  Sparkles,
  ShieldCheck,
  Wrench,
  ChevronRight,
  AlertTriangle,
  Cpu,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useLocalRepository, useLocalReady } from "@/lib/local-repository";
import { Brand } from "./brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const homeNavigation = [
  ["Özellikler", "#neden-sanayipro"],
  ["İş Akışı", "#nasil-calisir"],
  ["Ürün Ekranları", "#urun-ekranlari"],
  ["AI Arıza Bul", "#ariza-bul"],
  ["Plaka Arama", "#plaka-deneyimi"],
  ["Mobil Usta", "#mobil-deneyim"],
  ["Finans & Stok", "#finans-stok"],
  ["Fiyatlandırma", "#fiyatlandirma"],
  ["Sık Sorulanlar", "#sss"],
] as const;

export function CorporateHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sp-header">
      <div className="sp-header-inner">
        <a href="#ana-sayfa" aria-label="SanayiPro ana sayfa" className="sp-header-brand">
          <Brand />
          <span className="sp-header-pill">v2.0</span>
        </a>
        <nav className="sp-desktop-nav" aria-label="Ana menü">
          {homeNavigation.map(([label, href]) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>
        <div className="sp-header-actions">
          <Link href="/app" className="sp-demo-link">
            <span className="sp-pulse-dot" />
            Canlı Paneli Aç
          </Link>
          <Link href="/login" className="sp-login-link">
            Giriş Yap
          </Link>
          <a href="#iletisim" className="sp-cta-btn">
            Bilgi Al <ArrowRight size={15} />
          </a>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button className="sp-menu-trigger" aria-label="Ana menüyü aç">
                <Menu size={22} />
              </button>
            </DialogTrigger>
            <DialogContent className="sp-mobile-menu">
              <DialogTitle><Brand /></DialogTitle>
              <DialogDescription className="sr-only">SanayiPro tanıtım sayfasının bölümleri</DialogDescription>
              <nav aria-label="Mobil ana menü">
                {homeNavigation.map(([label, href]) => (
                  <a key={href} href={href} onClick={() => setOpen(false)}>
                    {label} <ChevronRight size={16} />
                  </a>
                ))}
              </nav>
              <div className="sp-mobile-menu-actions">
                <Link href="/app" className="sp-mobile-demo-btn" onClick={() => setOpen(false)}>
                  <span className="sp-pulse-dot" /> Canlı Çalışma Alanını Aç
                </Link>
                <Link href="/login" className="sp-mobile-login-btn" onClick={() => setOpen(false)}>
                  Giriş Yap
                </Link>
                <a className="sp-cta-btn" href="#iletisim" onClick={() => setOpen(false)}>
                  Bilgi Al & Demo Talep Et <ArrowRight size={16} />
                </a>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}

const asset = (path: string) => `${process.env.NODE_ENV === "production" ? "/sanayipro" : ""}${path}`;

const screens = [
  {
    id: "dashboard",
    name: "Genel Bakış",
    tag: "GÜNÜN FOTOĞRAFI",
    title: "Servisteki bütün araçları ve aşamaları tek bakışta görün.",
    copy: "Servisteki aktif araçlar, müşteri onayını bekleyen teklifler, parçası yolda olan işler ve bugünün randevuları. Güne nereden başlayacağınızı düşünmeyin, öncelikler gözünüzün önünde olsun.",
    src: asset("/product/dashboard.jpg"),
    alt: "SanayiPro kokpit: servisteki araçlar, durumları ve bugünün randevuları",
    highlights: ["Aktif Araç Sayacı", "Onay Bekleyenler", "Bugünün Randevuları", "Kritik Stok Uyarısı"]
  },
  {
    id: "work-order",
    name: "İş Emri & Onay",
    tag: "TAM ŞEFFAFLIK",
    title: "Tekliften teslime; işçilik, parça ve müşteri onayı aynı yerde.",
    copy: "Usta arıza tespitini girer, işçilik ve parça listesi oluşturulur. Müşteriden telefon veya WhatsApp üzerinden alınan onay revizyon numarasıyla kaydedilir. Fiyat karmaşasına ve unutulan parçalara son verin.",
    src: asset("/product/work-order.jpg"),
    alt: "SanayiPro iş emri: müşteri onayı, sıradaki işlem ve açık bakiye",
    highlights: ["WhatsApp Onay Kaydı", "Usta Görevlendirmesi", "Rezerve Parça Tüketimi", "Açık Bakiye Hesabı"]
  },
  {
    id: "intake",
    name: "Araç Kabul",
    tag: "2 DAKİKADA KABUL",
    title: "Hasar fotoğrafları ve kontrol listesiyle kusursuz teslim alma.",
    copy: "Plakayı yazın veya listeden seçin. Giriş kilometresi, yakıt seviyesi, müşteri şikâyeti, 5 açılı hasar fotoğrafları ve kontrol listesi tek formda toplanır. Aracın mevcut çizik ve hasarları daha ilk dakikada güvence altına alınır.",
    src: asset("/product/intake.jpg"),
    alt: "SanayiPro beş adımlı araç kabul ekranı",
    highlights: ["5 Açılı Fotoğraf", "Kaporta Hasar Notu", "Kilometre & Yakıt", "Zorunlu Kontrol Listesi"]
  },
  {
    id: "vehicle",
    name: "Araç & Müşteri",
    tag: "SERVİS HAFIZASI",
    title: "Her aracın kendine ait eksiksiz bir servis hafızası olsun.",
    copy: "Müşteri kim, bu araca en son hangi tarihte kaç kilometrede hangi yağ ve filtre konuldu? Araç tekrar geldiğinde hafızanızı zorlamayın; tüm servis geçmişi ve müşteri bakiyesi anında açılsın.",
    src: asset("/product/vehicle.jpg"),
    alt: "SanayiPro araç detayında plaka, müşteri ve servis geçmişi",
    highlights: ["Tek Tıkla Plaka Geçmişi", "Zaman Çizelgesi", "Toplam Bakiye Takibi", "Doğrudan Kabul Başlatma"]
  },
  {
    id: "history",
    name: "Servis Geçmişi",
    tag: "KRONOLOJİK DÖKÜM",
    title: "Yıllar önceki bir işlemi saniyeler içinde doğrulayın.",
    copy: "Aracın servisinize yaptığı tüm ziyaretler kronolojik olarak listelenir. Değişen parçalar, yapılan kontroller ve kilometre artışı grafiksel zaman çizelgesiyle sunulur.",
    src: asset("/product/history.jpg"),
    alt: "SanayiPro araç servis geçmişi zaman çizelgesi",
    highlights: ["Tarih & Kilometre Kaydı", "Önceki Parça Numaraları", "İş Emri Bağlantısı", "Güvenilir Arıza Referansı"]
  },
] as const;

export function ProductScreens() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const screen = screens[active];

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let target = index;
    if (event.key === "ArrowRight") target = (index + 1) % screens.length;
    else if (event.key === "ArrowLeft") target = (index - 1 + screens.length) % screens.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = screens.length - 1;
    else return;
    event.preventDefault();
    setActive(target);
    refs.current[target]?.focus();
  }

  return (
    <div className="sp-tour-container">
      <div className="sp-tour-tabs" role="tablist" aria-label="SanayiPro ürün ekranları">
        {screens.map((item, i) => (
          <button
            key={item.id}
            role="tab"
            id={`sp-screen-${i}`}
            aria-controls="sp-screen-panel"
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            ref={el => { refs.current[i] = el; }}
            onClick={() => setActive(i)}
            onKeyDown={e => navigate(e, i)}
            className={`sp-tour-tab ${active === i ? "is-active" : ""}`}
          >
            <span className="sp-tab-dot" />
            {item.name}
          </button>
        ))}
      </div>

      <div id="sp-screen-panel" role="tabpanel" aria-labelledby={`sp-screen-${active}`} className="sp-tour-panel">
        <div className="sp-tour-info">
          <div className="sp-tour-text">
            <span className="sp-tour-badge">{screen.tag}</span>
            <h3>{screen.title}</h3>
            <p>{screen.copy}</p>
          </div>
          <div className="sp-tour-pills">
            {screen.highlights.map(hl => (
              <span key={hl} className="sp-tour-pill">
                <Check size={14} /> {hl}
              </span>
            ))}
          </div>
        </div>

        <div className="sp-showcase-browser">
          <div className="sp-browser-header">
            <div className="sp-browser-dots">
              <span /><span /><span />
            </div>
            <div className="sp-browser-address">
              <ShieldCheck size={13} />
              <span>sanayipro.com/app/{screen.id}</span>
            </div>
            <div className="sp-browser-tag">Canlı Panel Görünümü</div>
          </div>
          <div className="sp-browser-screen">
            <Image
              key={screen.src}
              src={screen.src}
              alt={screen.alt}
              width={1440}
              height={1000}
              sizes="(max-width: 900px) 100vw, 1200px"
              priority={active === 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_CONTACTS: Record<string, string>[] = [];
export function DemoContactForm() {
  const ready = useLocalReady();
  const [, saveRequests] = useLocalRepository("contact-requests", EMPTY_CONTACTS);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    saveRequests(current => [...current, { ...values, at: new Date().toISOString() }]);
    setSubmitted(true);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: "center", behavior: "instant" }));
  }

  return (
    <div ref={formRef} className="sp-contact-box" data-local-ready={ready}>
      {submitted ? (
        <div className="sp-form-success-card" role="status">
          <div className="sp-success-icon">
            <Check size={32} />
          </div>
          <h3>Talebiniz Alındı</h3>
          <p>
            Bilgileriniz kaydedildi. Servis danışmanımız en kısa sürede sizinle iletişime geçerek işletmenize özel akışı gösterecektir.
          </p>
          <div className="sp-success-actions">
            <Link href="/app" className="sp-button">
              Hemen Canlı Paneli İnceleyin <ArrowRight size={16} />
            </Link>
            <button className="sp-btn-link" onClick={() => setSubmitted(false)}>
              Yeni Form Gönder
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="sp-contact-fields">
          <div className="sp-form-header">
            <h4>Servisiniz İçin Bilgi Alın</h4>
            <p>Formu doldurun, ekibimiz size özel canlı sunum hazırlasın.</p>
          </div>
          <div className="sp-form-grid">
            <label>
              <span>Adınız Soyadınız <b>*</b></span>
              <input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Örn. Mehmet Demir" />
            </label>
            <label>
              <span>Servis / İşletme Adı <b>*</b></span>
              <input name="business" autoComplete="organization" required maxLength={150} placeholder="Örn. Akdeniz Oto Servis" />
            </label>
            <label>
              <span>Telefon Numaranız <b>*</b></span>
              <input name="phone" type="tel" autoComplete="tel" required maxLength={25} placeholder="0532 123 45 67" />
            </label>
            <label>
              <span>E-posta Adresiniz <b>*</b></span>
              <input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="servis@isletmeniz.com" />
            </label>
          </div>
          <label className="sp-full-label">
            <span>Servisiniz Hakkında Not (İsteğe bağlı)</span>
            <textarea name="message" maxLength={2000} rows={3} placeholder="Mevcut çalışan sayınız, ana uzmanlık alanınız veya sormak istedikleriniz..." />
          </label>
          <button type="submit" className="sp-submit-btn" disabled={!ready}>
            <Sparkles size={17} /> Servisim İçin İletişime Geçin <ArrowRight size={17} />
          </button>
          <p className="sp-form-privacy">
            <ShieldCheck size={14} /> Bilgileriniz gizli tutulur, asla 3. taraflarla paylaşılmaz.
          </p>
        </form>
      )}
    </div>
  );
}

const plateExamples = [
  {
    plate: "31 ABC 123",
    model: "Renault Megane 1.5 dCi",
    year: "2020",
    customer: "Ahmet Yılmaz",
    phone: "0532 555 01 42",
    status: "İşlemde",
    statusTone: "info",
    job: "Ön fren balatası & disk değişimi",
    technician: "Mehmet Usta (Motor & Mekanik)",
    date: "7 Ekim 2026",
    mileage: "98.450 km",
    maintenance: "115.000 km",
    balance: "3.500 TL",
    total: "8.500 TL",
    paid: "5.000 TL"
  },
  {
    plate: "34 XYZ 456",
    model: "Ford Focus 1.6 Ti-VCT",
    year: "2019",
    customer: "Ayşe Demir",
    phone: "0533 555 04 56",
    status: "Onay Bekliyor",
    statusTone: "warning",
    job: "Fren pedalında titreşim arıza tespiti",
    technician: "Ali Usta (Fren Sistemleri)",
    date: "12 Ağustos 2026",
    mileage: "85.100 km",
    maintenance: "100.000 km",
    balance: "8.500 TL",
    total: "8.500 TL",
    paid: "0 TL"
  },
  {
    plate: "01 ACB 789",
    model: "Fiat Egea 1.3 MultiJet",
    year: "2022",
    customer: "Murat Kaya",
    phone: "0534 555 07 89",
    status: "Teslime Hazır",
    statusTone: "success",
    job: "Periyodik yağ ve filtre bakımı",
    technician: "Mehmet Usta (Motor & Mekanik)",
    date: "4 Eylül 2026",
    mileage: "48.000 km",
    maintenance: "60.000 km",
    balance: "0 TL",
    total: "2.500 TL",
    paid: "2.500 TL"
  },
] as const;

const plateToken = (value: string) => value.toLocaleUpperCase("tr-TR").replace(/[^A-Z0-9]/g, "");

export function PlateSearchDemo() {
  const [query, setQuery] = useState("31 ABC 123");
  const [searched, setSearched] = useState("31 ABC 123");
  const result = plateExamples.find(item => plateToken(item.plate) === plateToken(searched)) ?? plateExamples[0];

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearched(query);
  }

  return (
    <div className="sp-plate-container">
      <div className="sp-plate-header">
        <div className="sp-plate-toolbar-title">
          <span className="sp-live-badge"><i /> CANLI ARAMA MOTORU</span>
          <span className="sp-plate-subtitle">Plaka ile anında tam teşhis</span>
        </div>
        <div className="sp-plate-preset-buttons">
          <span>Örnekler:</span>
          {plateExamples.map(item => (
            <button
              type="button"
              key={item.plate}
              className={`sp-preset-btn ${plateToken(searched) === plateToken(item.plate) ? "is-selected" : ""}`}
              onClick={() => {
                setQuery(item.plate);
                setSearched(item.plate);
              }}
            >
              {item.plate}
            </button>
          ))}
        </div>
      </div>

      <form className="sp-plate-search-box" onSubmit={search}>
        <div className="sp-plate-input-wrap">
          <span className="sp-tr-badge">TR</span>
          <input
            aria-label="Plaka araması"
            value={query}
            onChange={e => setQuery(e.target.value)}
            maxLength={14}
            placeholder="Plaka yazın (örn: 31 ABC 123)"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button type="submit" className="sp-plate-submit-btn">
          <Search size={18} /> Sorgula
        </button>
      </form>

      <div className="sp-plate-result-wrap" role="status" aria-live="polite">
        <div className="sp-vehicle-dossier">
          <div className="sp-dossier-top">
            <div className="sp-dossier-plate">
              <span className="sp-mini-tr">TR</span>
              <strong>{result.plate}</strong>
            </div>
            <div className="sp-dossier-meta">
              <h4>{result.model}</h4>
              <p>{result.year} Model · {result.customer} ({result.phone})</p>
            </div>
            <div className={`sp-dossier-status is-${result.statusTone}`}>
              <span className="sp-status-pulse" />
              {result.status}
            </div>
          </div>

          <div className="sp-dossier-active-order">
            <div className="sp-active-order-title">
              <Wrench size={16} />
              <span>AKTİF İŞ EMRİ</span>
              <strong>#{result.plate === "31 ABC 123" ? "WO-2026-00142" : result.plate === "34 XYZ 456" ? "WO-2026-00143" : "WO-2026-00139"}</strong>
            </div>
            <p className="sp-order-complaint">{result.job}</p>
            <div className="sp-order-assigned">
              <span>Sorumlu Usta:</span>
              <strong>{result.technician}</strong>
            </div>
          </div>

          <div className="sp-dossier-grid">
            <div className="sp-dossier-col">
              <span className="sp-col-label"><Clock3 size={13} /> Son Giriş Kilometresi</span>
              <strong>{result.mileage}</strong>
              <small>Son ziyaret: {result.date}</small>
            </div>
            <div className="sp-dossier-col">
              <span className="sp-col-label"><Sparkles size={13} /> Bakım Hedefi</span>
              <strong>{result.maintenance}</strong>
              <small>Periyodik yağ & filtre</small>
            </div>
            <div className="sp-dossier-col sp-col-finance">
              <span className="sp-col-label">Açık Hesap Bakiyesi</span>
              <strong className={result.balance !== "0 TL" ? "is-due" : "is-cleared"}>{result.balance}</strong>
              <small>Toplam: {result.total} · Tahsilat: {result.paid}</small>
            </div>
          </div>

          <div className="sp-dossier-footer">
            <span>Tek bir plaka girdiniz; müşteri, açık iş, usta ve hesap anında önünüze geldi.</span>
            <Link href="/app" className="sp-view-record-link">
              Canlı Panelde İncele <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const DTC_SHOWCASE = [
  {
    code: "P0300",
    name: "Rastgele / Çoklu Silindir Tekleme Tespiti",
    enName: "Random / Multiple Cylinder Misfire Detected",
    system: "Ateşleme & Yakıt Enjeksiyon",
    severity: "Yüksek",
    severityColor: "#ef4444",
    symptoms: "Rölantide sarsıntı, çekiş düşüklüğü, egzozda yanmamış yakıt kokusu, yanıp sönen motor ikaz lambası.",
    causes: [
      { text: "Buji elektrot aşınması veya tırnak aralığı sapması", chance: "45%" },
      { text: "Ateşleme bobini izolasyon çatlağı / zayıf kıvılcım", chance: "30%" },
      { text: "Enjektör püskürtme bozukluğu veya yakıt basınç düşüklüğü", chance: "15%" },
      { text: "Emme manifoldu vakum kaçağı (fakir karışım)", chance: "10%" },
    ],
    testSteps: [
      "Bujileri söküp elektrot aralığı ve kurum rengini kontrol edin.",
      "Şüpheli silindir bobinini sağlam silindirle yer değiştirip teklemenin yer değiştirip değiştirmediğini izleyin.",
      "Yakıt ray basıncını ve enjektör elektriksel empedansını ölçün.",
    ],
    hint: "Motor soğukken tekleme artıyorsa öncelikle buji tırnak aralığı ve bobin soketlerini test edin.",
  },
  {
    code: "P0420",
    name: "Katalitik Konvertör Verim Eşiği Altında (Sıra 1)",
    enName: "Catalyst System Efficiency Below Threshold (Bank 1)",
    system: "Egzoz & Emisyon Kontrolü",
    severity: "Orta",
    severityColor: "#f59e0b",
    symptoms: "Motor arıza lambası sabit yanar, yakıt tüketiminde hafif artış, emisyon testi geçememe.",
    causes: [
      { text: "Katalitik konvertör monolit yıpranması / tıkanıklığı", chance: "50%" },
      { text: "Bank 1 Sensör 2 (arka) oksijen sensörü sinyal gecikmesi", chance: "30%" },
      { text: "Katalizör öncesi egzoz manifoldu sızıntısı veya kaçak", chance: "15%" },
      { text: "Motor içi hafif yağ yakma (katalizörü zehirler)", chance: "5%" },
    ],
    testSteps: [
      "Canlı veride ön (S1) ve arka (S2) oksijen sensörü voltaj dalgalanmalarını karşılaştırın.",
      "Egzoz hattında kaçak, çatlak ve paslanma kontrolü yapın.",
      "Lazer termometreyle konvertör giriş ve çıkış yüzey sıcaklık farkını doğrulayın.",
    ],
    hint: "Konvertörü değiştirmeden önce arka oksijen sensörünün yanıt hızını mutlaka canlı grafik verisinden doğrulayın.",
  },
  {
    code: "P0401",
    name: "EGR (Egzoz Gazı Devridaimi) Yetersiz Akış",
    enName: "Exhaust Gas Recirculation Flow Insufficient Detected",
    system: "EGR & Emisyon Sistemi",
    severity: "Orta",
    severityColor: "#f59e0b",
    symptoms: "Sabit hızda hafif silkeleme, hızlanmada vuruntu, emisyon testi başarısızlığı.",
    causes: [
      { text: "EGR valfinde ve geçiş borularında kurum/karbon tıkanması", chance: "55%" },
      { text: "EGR diferansiyel basınç sensörü (DPFE) arızası", chance: "25%" },
      { text: "Vakum kontrol selenoidi veya vakum hortumu çatlağı", chance: "15%" },
      { text: "EGR soğutucu peteklerinde kurum birikimi", chance: "5%" },
    ],
    testSteps: [
      "EGR valfini söküp kurum miktarını inceleyin ve solventle temizleyin.",
      "Diferansiyel basınç sensörü hortumlarını tıkanıklık ve çatlak açısından kontrol edin.",
      "Vakum hattını manometreyle ölçüp selenoid tepkisini izleyin.",
    ],
    hint: "Dizel araçlarda EGR kurum temizliği yaparken emme manifoldu giriş boğazını da mutlaka temizleyin.",
  },
  {
    code: "P2002",
    name: "Dizel Partikül Filtresi (DPF) Verim Eşiği Altında (Sıra 1)",
    enName: "Diesel Particulate Filter Efficiency Below Threshold (Bank 1)",
    system: "Dizel Egzoz Filtreleme",
    severity: "Yüksek",
    severityColor: "#ef4444",
    symptoms: "DPF uyarı ışığı, rejenerasyon sıklığında belirgin artış, motor çekişinde düşüş.",
    causes: [
      { text: "DPF seramik monolitinde iç çatlak veya petek erimesi", chance: "45%" },
      { text: "Diferansiyel basınç sensörü hortum patlaması / arızası", chance: "35%" },
      { text: "Sürekli kısa mesafe sürüş sebebiyle aşırı kurum doluluğu", chance: "15%" },
      { text: "Hava akış metre (MAF) hatalı hava debisi okuması", chance: "5%" },
    ],
    testSteps: [
      "Diferansiyel basınç sensörünün rölanti ve 2500 d/d mbar değerini ölçün.",
      "Egzoz çıkış borusunda siyah is kalıntısı (iç çatlak kanıtı) kontrolü yapın.",
      "Tanı cihazından statik rejenerasyon testi uygulayın.",
    ],
    hint: "Egzoz çıkışında parmakla siyah is geliyorsa DPF iç peteği kırılmıştır, rejenerasyon sorunu çözmez.",
  },
];

export function FaultFinderShowcase() {
  const [selectedCode, setSelectedCode] = useState<string>("P0300");
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const dtcData = useMemo(() => {
    return (
      DTC_SHOWCASE.find((d) => d.code === selectedCode) ||
      DTC_SHOWCASE[0]
    );
  }, [selectedCode]);

  const handleSelect = (code: string) => {
    setSelectedCode(code);
    setCopied(false);
  };

  const handleAttachDemo = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <div className="sp-fault-showcase-container">
      {/* Top Controller Bar */}
      <div className="sp-fault-ctrl-bar">
        <div className="sp-fault-search-wrap">
          <Search size={16} className="sp-fault-search-icon" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value.toUpperCase();
              setSearchQuery(val);
              const found = DTC_SHOWCASE.find((d) => d.code.includes(val) || d.name.toLowerCase().includes(val.toLowerCase()));
              if (found) setSelectedCode(found.code);
            }}
            placeholder="OBD-II Arıza Kodu Ara... (Örn: P0300, P0420, EGR, Tekleme)"
            className="sp-fault-search-input"
            aria-label="OBD-II arıza kodu arama"
          />
        </div>
        <div className="sp-fault-quick-pills">
          <span className="sp-fault-pills-label">Sık Karşılaşılan:</span>
          {DTC_SHOWCASE.map((d) => (
            <button
              key={d.code}
              type="button"
              className={`sp-fault-pill ${selectedCode === d.code ? "is-active" : ""}`}
              onClick={() => handleSelect(d.code)}
            >
              {d.code}
            </button>
          ))}
        </div>
      </div>

      {/* Main Diagnostic Terminal Card */}
      <div className="sp-fault-terminal">
        <div className="sp-terminal-top">
          <div className="sp-terminal-header-left">
            <div className="sp-terminal-badge-ai">
              <span className="sp-terminal-pulse" />
              <Cpu size={14} />
              <span>AI MOTOR TEŞHİSİ AKTİF</span>
            </div>
            <div className="sp-terminal-system-tag">
              <Layers size={13} />
              <span>{dtcData.system}</span>
            </div>
          </div>
          <div className="sp-terminal-header-right">
            <span
              className="sp-terminal-severity"
              style={{
                backgroundColor: `${dtcData.severityColor}18`,
                color: dtcData.severityColor,
                borderColor: `${dtcData.severityColor}40`,
              }}
            >
              <AlertTriangle size={13} />
              {dtcData.severity} Risk Seviyesi
            </span>
          </div>
        </div>

        <div className="sp-terminal-body">
          <div className="sp-terminal-code-hero">
            <div className="sp-code-badge">
              <strong>{dtcData.code}</strong>
              <small>STANDART DTC KODU</small>
            </div>
            <div className="sp-code-names">
              <h3>{dtcData.name}</h3>
              <p className="sp-code-en">{dtcData.enName}</p>
              <p className="sp-code-symptoms">
                <strong>Belirtiler:</strong> {dtcData.symptoms}
              </p>
            </div>
          </div>

          <div className="sp-terminal-grid">
            {/* Olası Nedenler & Olasılık Yüzdeleri */}
            <div className="sp-terminal-col">
              <h4>
                <Sparkles size={15} className="text-amber-400" />
                Yapay Zeka Olasılık Analizi
              </h4>
              <div className="sp-causes-list">
                {dtcData.causes.map((cause, idx) => (
                  <div key={idx} className="sp-cause-item">
                    <div className="sp-cause-info">
                      <span>{cause.text}</span>
                      <strong>{cause.chance}</strong>
                    </div>
                    <div className="sp-cause-bar-track">
                      <div
                        className="sp-cause-bar-fill"
                        style={{ width: cause.chance }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Usta İçin Kontrol ve Test Sırası */}
            <div className="sp-terminal-col">
              <h4>
                <Wrench size={15} className="text-blue-400" />
                Usta İçin Önerilen Test Sırası
              </h4>
              <ol className="sp-test-steps-list">
                {dtcData.testSteps.map((step, idx) => (
                  <li key={idx}>
                    <span className="sp-step-badge">{idx + 1}</span>
                    <p>{step}</p>
                  </li>
                ))}
              </ol>

              <div className="sp-pro-tip-box">
                <strong>💡 Usta İpucu:</strong>
                <p>{dtcData.hint}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sp-terminal-footer">
          <div className="sp-terminal-footer-info">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Teşhis analizi doğrudan ilgili aracın iş emrine ve servis kaydına aktarılabilir.</span>
          </div>
          <div className="sp-terminal-footer-actions">
            <button
              type="button"
              className={`sp-btn-attach ${copied ? "is-attached" : ""}`}
              onClick={handleAttachDemo}
            >
              {copied ? (
                <>
                  <Check size={16} /> İş Emrine Eklendi!
                </>
              ) : (
                <>
                  <Wrench size={15} /> İş Emrine Teşhis Olarak Ekle
                </>
              )}
            </button>
            <Link
              href="/app/fault-finder"
              className="sp-btn-full-module"
            >
              Modülü Panelde Aç <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PricingSection() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      id: "usta",
      name: "Usta Paketi",
      tagline: "Tek çalışan ve butik servisler için temel dijitalleşme.",
      price: billingPeriod === "monthly" ? "799" : "639",
      badge: "GİRİŞ DÜZEYİ",
      popular: false,
      features: [
        "1 Usta / Kullanıcı Hesabı",
        "Plaka ile Sınırsız Araç Kabulü",
        "5 Açılı Fotoğraflı Hasar Tespiti",
        "Dijital İş Emri & Servis Geçmişi",
        "Telefon & Tablet Uyumlu Mobil Görünüm",
        "WhatsApp Araç Teslim Bildirimi",
        "14 Gün Ücretsiz Deneme",
      ],
      ctaText: "14 Gün Ücretsiz Dene",
      ctaHref: "/login",
    },
    {
      id: "atolye",
      name: "Atölye Paketi",
      tagline: "Ekibi olan, iş yükünü ve stokları düzenlemek isteyen oto servisler.",
      price: billingPeriod === "monthly" ? "1.499" : "1.199",
      badge: "EN ÇOK TERCİH EDİLEN",
      popular: true,
      features: [
        "5 Usta & Servis Danışmanı Hesabı",
        "WhatsApp Onaylı Teklif & Revizyon Takibi",
        "AI Destekli Arıza Bul & OBD-II Teşhis Motoru",
        "Kritik Stok Takibi & Parça Rezervasyonu",
        "Günlük Servis Kasası, Tahsilat & Borç Takibi",
        "Usta İş Yükü & Randevu Takvimi",
        "Öncelikli E-posta ve WhatsApp Desteği",
        "14 Gün Ücretsiz Deneme",
      ],
      ctaText: "14 Gün Ücretsiz Dene",
      ctaHref: "/login",
    },
    {
      id: "profesyonel",
      name: "Profesyonel Paket",
      tagline: "Çok şubeli, yüksek hacimli ve kurumsal oto servisler.",
      price: billingPeriod === "monthly" ? "2.499" : "1.999",
      badge: "KURUMSAL & ÇOK ŞUBELİ",
      popular: false,
      features: [
        "Sınırsız Usta & Danışman Hesabı",
        "Çoklu Şube Yönetimi & Ortak Müşteri Havuzu",
        "Tüm AI Teşhis ve OBD-II Modülleri",
        "Tedarikçi & Parçacı Cari Borç/Alacak Takibi",
        "Gelişmiş Finans, Kasa & Usta Performans Raporları",
        "Öncelikli VIP Telefon & Canlı Destek",
        "Ücretsiz Özel Veri Aktarımı ve Kurulum",
        "14 Gün Ücretsiz Deneme",
      ],
      ctaText: "14 Gün Ücretsiz Dene",
      ctaHref: "/login",
    },
  ];

  return (
    <div className="sp-pricing-container">
      {/* Billing Switcher */}
      <div className="sp-pricing-toggle-wrap">
        <div className="sp-pricing-toggle">
          <button
            type="button"
            className={billingPeriod === "monthly" ? "is-active" : ""}
            onClick={() => setBillingPeriod("monthly")}
          >
            Aylık Ödeme
          </button>
          <button
            type="button"
            className={billingPeriod === "yearly" ? "is-active" : ""}
            onClick={() => setBillingPeriod("yearly")}
          >
            Yıllık Ödeme <span className="sp-discount-pill">%20 İndirim</span>
          </button>
        </div>
        <p className="sp-trial-banner">
          ✨ Tüm paketlerde <strong>14 gün boyunca kredi kartı gerekmeden</strong> tam erişim ücretsizdir.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="sp-pricing-grid">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`sp-pricing-card ${plan.popular ? "is-popular" : ""}`}
          >
            {plan.popular && (
              <div className="sp-popular-banner">
                <Sparkles size={13} />
                <span>EN ÇOK TERCİH EDİLEN</span>
              </div>
            )}

            <div className="sp-card-header">
              <span className="sp-plan-badge">{plan.badge}</span>
              <h3 className="sp-plan-title">{plan.name}</h3>
              <p className="sp-plan-tagline">{plan.tagline}</p>
            </div>

            <div className="sp-price-box">
              <div className="sp-price-val">
                <span className="sp-currency">₺</span>
                <span className="sp-amount">{plan.price}</span>
                <span className="sp-period">/ ay</span>
              </div>
              <span className="sp-price-sub">
                {billingPeriod === "yearly" ? "Yıllık faturalandırılır (12 ay)" : "Aylık faturalandırılır, taahhüt yok"}
              </span>
            </div>

            <Link
              href={plan.ctaHref}
              className={`sp-plan-cta ${plan.popular ? "is-primary" : "is-secondary"}`}
            >
              <span>{plan.ctaText}</span>
              <ArrowRight size={16} />
            </Link>

            <div className="sp-plan-divider" />

            <div className="sp-plan-features">
              <span className="sp-features-title">Paket Kapsamı:</span>
              <ul className="sp-features-list">
                {plan.features.map((feat, i) => (
                  <li key={i}>
                    <Check size={16} className="sp-feat-check" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Reassurance Bar */}
      <div className="sp-pricing-trust-bar">
        <div className="sp-trust-item">
          <ShieldCheck size={18} className="text-emerald-400" />
          <span><strong>14 Gün Kredi Kartsız Deneme:</strong> Kayıt olurken kart bilgisi istemiyoruz.</span>
        </div>
        <div className="sp-trust-item">
          <Clock3 size={18} className="text-blue-400" />
          <span><strong>Taahhütsüz İptal:</strong> İstediğiniz zaman tek tıkla aboneliğinizi sonlandırın.</span>
        </div>
        <div className="sp-trust-item">
          <Wrench size={18} className="text-amber-400" />
          <span><strong>Ücretsiz Kurulum Desteği:</strong> Ekibimiz WhatsApp ve telefonla yanınızda.</span>
        </div>
      </div>
    </div>
  );
}
