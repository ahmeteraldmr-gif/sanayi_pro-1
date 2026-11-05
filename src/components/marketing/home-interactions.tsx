"use client";

import Image from "next/image";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Check, Menu, Search, Clock3, Sparkles, ShieldCheck, Wrench, ChevronRight } from "lucide-react";
import { useLocalRepository, useLocalReady } from "@/lib/local-repository";
import { Brand } from "./brand";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const homeNavigation = [
  ["Özellikler", "#ozellikler"],
  ["İş Akışı", "#nasil-calisir"],
  ["Ürün Ekranları", "#urun-ekranlari"],
  ["Plaka Arama", "#plaka-deneyimi"],
  ["Mobil Usta", "#mobil-deneyim"],
  ["Finans & Stok", "#finans-stok"],
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
          <a href={asset("/app/")} className="sp-demo-link" target="_blank" rel="noopener">
            <span className="sp-pulse-dot" />
            Canlı Paneli Aç
          </a>
          <a href={asset("/login/")} className="sp-login-link">
            Giriş Yap
          </a>
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
                <a href={asset("/app/")} className="sp-mobile-demo-btn" target="_blank" rel="noopener" onClick={() => setOpen(false)}>
                  <span className="sp-pulse-dot" /> Canlı Çalışma Alanını Aç
                </a>
                <a href={asset("/login/")} className="sp-mobile-login-btn" onClick={() => setOpen(false)}>
                  Giriş Yap
                </a>
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
            <a href={asset("/app/")} className="sp-button" target="_blank" rel="noopener">
              Hemen Canlı Paneli İnceleyin <ArrowRight size={16} />
            </a>
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
            <a href={asset("/app/")} className="sp-view-record-link" target="_blank" rel="noopener">
              Canlı Panelde İncele <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
