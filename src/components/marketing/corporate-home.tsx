import Image from "next/image";
import {
  ArrowRight,
  CarFront,
  Check,
  ChevronDown,
  ClipboardCheck,
  History,
  Layers3,
  MessageCircle,
  PackageCheck,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  Wallet,
  Wrench,
  Zap,
} from "lucide-react";
import { Brand } from "./brand";
import {
  CorporateHeader,
  DemoContactForm,
  ProductScreens,
  PlateSearchDemo,
} from "./home-interactions";

const asset = (path: string) => `${process.env.NODE_ENV === "production" ? "/sanayipro" : ""}${path}`;

const processSteps = [
  {
    step: "01",
    title: "Plaka & Hızlı Kabul",
    desc: "Plakayı yazın. Kilometre, yakıt, hasar fotoğrafları ve kontrol listesini 2 dakikada kaydedip aracı servise alın.",
    tag: "2 DAKİKA",
  },
  {
    step: "02",
    title: "Arıza Tespiti & Usta Ataması",
    desc: "Sorunu iş emrine işleyin. Aracı ilgili ustaya yönlendirin, tahmini teslim hedefini belirleyin.",
    tag: "SORUMLULUK NET",
  },
  {
    step: "03",
    title: "Şeffaf Teklif & Müşteri Onayı",
    desc: "İşçilik ve parçaları listeleyin. WhatsApp veya telefonla gelen onayı revizyon numarasıyla kaydedin.",
    tag: "WHATSAPP ONAYI",
  },
  {
    step: "04",
    title: "Stoktan Tüketim & Kasa",
    desc: "Kullanılan balata, filtre ve yağ otomatik depodan düşsün; tahsilatı nakit, kart veya havale olarak kaydedin.",
    tag: "SIFIR KAÇAK",
  },
  {
    step: "05",
    title: "Son Kontrol & Teslim",
    desc: "Son kontrolleri tamamlayıp teslime hazır işaretleyin. Müşteriye bildirim gitsin, servis hafızası kaydedilsin.",
    tag: "KUSURSUZ TESLİM",
  },
] as const;

const faqItems = [
  {
    q: "SanayiPro hangi büyüklükteki ve branştaki servisler için uygundur?",
    a: "1 liftten 20 lifte kadar motor, mekanik, oto elektrik, fren, klima, şanzıman, periyodik bakım, kaporta ve lastik servisleri için uygundur. Esnek yapısı sayesinde ister tek dükkan ister birden fazla şubesi olan kurumsal servisler rahatlıkla kullanabilir.",
  },
  {
    q: "Mevcut telefon ve tabletlerle atölye içinde kullanılabilir mi?",
    a: "Evet! SanayiPro modern bir web platformudur; bilgisayar, tablet veya cep telefonu üzerinden özel kurulum yapmadan doğrudan tarayıcıdan çalışır. Ustalar lifte veya motor başında telefonlarıyla fotoğraf çekebilir, not ekleyebilir ve işi ilerletebilir.",
  },
  {
    q: "Birden fazla şube ve çalışan yetkilendirmesi nasıl yapılıyor?",
    a: "İşletme sahibi olarak tüm şubeleri tek merkezden izleyebilirsiniz. Çalışanlara Usta, Servis Danışmanı veya Muhasebe gibi roller atayabilir; ustanın sadece atölye işlerini, muhasebenin ise kasa ve tahsilatları görmesini sağlayabilirsiniz.",
  },
  {
    q: "Stok takibi ve parça rezervasyonu nasıl işliyor?",
    a: "Her yedek parça için fiziksel stok, minimum kritik seviye ve satış fiyatı belirlenir. Bir iş emrine parça eklendiğinde 'ayrıldı' olarak rezerve edilir; işlem bittiğinde fiziksel stoktan otomatik düşülür ve kritik seviyede sistem sizi uyarır.",
  },
  {
    q: "Müşteri onayı WhatsApp üzerinden nasıl kaydedilir?",
    a: "İş emrinde oluşturduğunuz teklif için müşteriden WhatsApp, telefon veya yüz yüze aldığınız onayı, onay kanalı ve tarihiyle birlikte sisteme işlersiniz. İleride 'bana bu fiyat söylenmedi' gibi anlaşmazlıklar tamamen ortadan kalkar.",
  },
  {
    q: "SanayiPro muhasebe programı mıdır?",
    a: "SanayiPro bir genel muhasebe veya mali müşavirlik programı değildir; doğrudan oto servisin günlük atölye akışını, araç kabulünü, usta atamalarını ve iş emrine bağlı tahsilat/açık bakiye takibini çözen dikey bir 'servis yönetim sistemidir'.",
  },
] as const;

export function CorporateHome() {
  return (
    <div className="sp-home" id="ana-sayfa">
      <a href="#sp-main" className="skip-link">İçeriğe geç</a>
      <CorporateHeader />

      <main id="sp-main">
        {/* =========================================================================
            HERO SECTION (Rhythm 1: Midnight Deep Obsidian + Radiant Automotive Blue)
            ========================================================================= */}
        <section className="sp-hero-section">
          <div className="sp-hero-glow-1" />
          <div className="sp-hero-glow-2" />
          <div className="sp-container sp-hero-content">
            <div className="sp-hero-badge">
              <span className="sp-hero-dot" />
              <span>YENİ NESİL SERVİS İŞLETİM SİSTEMİ</span>
              <span className="sp-badge-tag">SanayiPro 2.0</span>
            </div>

            <h1 className="sp-hero-title">
              Servisinizin tüm akışı.
              <br />
              <span className="sp-gradient-text">Kabulden teslime tek ekranda net.</span>
            </h1>

            <p className="sp-hero-sub">
              Müşteri ve araç kaydı, 5 açılı fotoğraflı kabul, WhatsApp onaylı iş emri,
              usta iş yükü, parça rezervasyonu ve anlık kasa takibi.
              Dağınık defterleri ve telefon notlarını unutun.
            </p>

            <div className="sp-hero-cta-group">
              <a href="#iletisim" className="sp-btn-primary">
                <span>Hemen Bilgi Alın</span>
                <ArrowRight size={17} />
              </a>
            </div>

            <div className="sp-hero-trust-row">
              <span><Check size={14} /> Kurulum gerektirmez</span>
              <span><Check size={14} /> Telefon & Tablette hazır</span>
              <span><Check size={14} /> 10.000+ tamamlanan iş emri</span>
              <span><Check size={14} /> Sıfır veri kaybı</span>
            </div>

            {/* HERO PRODUCT STAGE */}
            <div className="sp-hero-stage-wrapper">
              <div className="sp-hero-stage-mockup">
                <div className="sp-stage-browser-bar">
                  <div className="sp-stage-dots">
                    <span /><span /><span />
                  </div>
                  <div className="sp-stage-url">
                    <ShieldCheck size={13} />
                    <span>sanayipro.com/app/work-orders/WO-2026-00142</span>
                  </div>
                  <div className="sp-stage-status">
                    <span className="sp-pulse-dot" />
                    Aktif Servis Çalışma Alanı
                  </div>
                </div>

                <div className="sp-stage-media">
                  <Image
                    src={asset("/product/work-order.jpg")}
                    alt="SanayiPro 2.0 iş emri ve müşteri onayı ekranı"
                    width={1440}
                    height={1000}
                    priority
                    sizes="(max-width: 900px) 100vw, 1300px"
                  />
                </div>

                {/* FLOATING TELEMETRY CARDS */}
                <div className="sp-float-card sp-card-approval">
                  <div className="sp-float-icon is-whatsapp">
                    <MessageCircle size={20} />
                  </div>
                  <div className="sp-float-text">
                    <small>MÜŞTERİ ONAYI</small>
                    <strong>WhatsApp ile Onaylandı</strong>
                    <span>31 ABC 123 · ₺8.500 (Revizyon 2)</span>
                  </div>
                </div>

                <div className="sp-float-card sp-card-cash">
                  <div className="sp-float-icon is-cash">
                    <TrendingUp size={20} />
                  </div>
                  <div className="sp-float-text">
                    <small>BUGÜNKÜ SERVİS KASASI</small>
                    <strong>₺18.500 Tahsilat</strong>
                    <span>Tahmini Brüt Kazanç: ₺4.800</span>
                  </div>
                </div>

                <div className="sp-float-card sp-card-technician">
                  <div className="sp-float-icon is-tech">
                    <Wrench size={20} />
                  </div>
                  <div className="sp-float-text">
                    <small>USTA ATAMASI</small>
                    <strong>Mehmet Usta</strong>
                    <span>Motor & Mekanik · 4 Aktif İş</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* IMPACT METRICS STRIP */}
          <div className="sp-metrics-strip">
            <div className="sp-container sp-metrics-grid">
              <div className="sp-metric-item">
                <strong>2 Dakika</strong>
                <span>Fotoğraflı ve kontrol listeli ortalama araç kabulü</span>
              </div>
              <div className="sp-metric-item">
                <strong>%100 Şeffaflık</strong>
                <span>Onaylı işçilik, parça dökümü ve müşteri mutabakatı</span>
              </div>
              <div className="sp-metric-item">
                <strong>0 Kayıp Kayıt</strong>
                <span>Tüm servis geçmişi ve müşteri bakiyesi plakaya bağlı</span>
              </div>
              <div className="sp-metric-item">
                <strong>3 Kat Hızlı</strong>
                <span>Atölye içi iş devri, parça tüketimi ve araç teslimatı</span>
              </div>
            </div>
          </div>
        </section>


        {/* =========================================================================
            SECTION 1: KLASİK SERVİS KAOSU vs. SANAYİPRO (Rhythm 2: Crisp Light / Pearl)
            ========================================================================= */}
        <section className="sp-section sp-contrast-light" id="neden-sanayipro">
          <div className="sp-container">
            <div className="sp-section-header-centered">
              <span className="sp-sub-badge">DAĞINIKLIĞA SON VERİN</span>
              <h2>Geleneksel servis kaosu yerine,<br />birbirine bağlı tek bir akış.</h2>
              <p>
                Bir oto servisinde en çok zaman kaybettiren şey işin kendisi değil;
                bilginin usta, danışman, toptancı ve müşteri arasında dağılmasıdır.
              </p>
            </div>

            <div className="sp-comparison-stage">
              <div className="sp-chaos-box">
                <div className="sp-box-top is-danger">
                  <span className="sp-box-flag">GELENEKSEL ATÖLYE ALIŞKANLIĞI</span>
                  <h3>Her şey farklı bir yerde kaybolur</h3>
                </div>
                <ul className="sp-chaos-list">
                  <li>
                    <span className="sp-cross">✕</span>
                    <div>
                      <strong>WhatsApp gruplarında kaybolan fotoğraflar</strong>
                      <p>Kabul anındaki kaporta çizikleri belgelenmez, teslimde müşteriyle tartışma çıkar.</p>
                    </div>
                  </li>
                  <li>
                    <span className="sp-cross">✕</span>
                    <div>
                      <strong>Deftere yazılıp unutulan açık hesaplar</strong>
                      <p>Hangi müşteride ne kadar bakiye kaldığı, hangi parçanın kime takıldığı hatırlanmaz.</p>
                    </div>
                  </li>
                  <li>
                    <span className="sp-cross">✕</span>
                    <div>
                      <strong>&quot;Bu araca en son ne zaman ne kondu?&quot; belirsizliği</strong>
                      <p>Düzenli gelen müşterinin dahi bakım geçmişi personelin hafızasına terk edilir.</p>
                    </div>
                  </li>
                  <li>
                    <span className="sp-cross">✕</span>
                    <div>
                      <strong>Ustanın hangi aşamada olduğunu bilememek</strong>
                      <p>Müşteri aradığında lifte koşup &quot;araç bitti mi?&quot; diye sormak zorunda kalırsınız.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="sp-sanayipro-box">
                <div className="sp-box-top is-success">
                  <span className="sp-box-flag">SANAYİPRO İLE DİJİTAL SERVİS</span>
                  <h3>Her adım tek bir çalışma alanında birleşir</h3>
                </div>
                <ul className="sp-order-flow-list">
                  <li>
                    <span className="sp-step-num">01</span>
                    <div>
                      <strong>Plaka Yazıldığı Anda Her Şey Hazır</strong>
                      <p>Müşteri, telefon, araç modeli, geçmiş ziyaretler ve açık bakiye tek ekranda açılır.</p>
                    </div>
                  </li>
                  <li>
                    <span className="sp-step-num">02</span>
                    <div>
                      <strong>2 Dakikada Fotoğraflı Araç Kabul</strong>
                      <p>Kilometre, yakıt, 5 açılı hasar fotoğrafı ve kontrol listesiyle araç güvenceye alınır.</p>
                    </div>
                  </li>
                  <li>
                    <span className="sp-step-num">03</span>
                    <div>
                      <strong>WhatsApp Onaylı İş Emri & Otomatik Stok</strong>
                      <p>Müşteri onayı kaydedilir, kullanılan parçalar depodan anında düşer, iş ustaya atanır.</p>
                    </div>
                  </li>
                  <li>
                    <span className="sp-step-num">04</span>
                    <div>
                      <strong>Zamanında Teslim & Eksiksiz Kasa</strong>
                      <p>Son kontrol tamamlanır, araç hazır bildirimi gider, tahsilat anında kasaya yansır.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>


        {/* =========================================================================
            SECTION 2: İNTERAKTİF PLAKA DENEYİMİ (Rhythm 3: Deep Technical Navy #080e22)
            ========================================================================= */}
        <section className="sp-section sp-dark-navy" id="plaka-deneyimi">
          <div className="sp-container sp-plate-split">
            <div className="sp-plate-copy">
              <span className="sp-sub-badge is-cyan">TEK GİRİŞ NOKTASI: PLAKA</span>
              <h2>
                Bir plaka yazın.
                <br />
                Bütün servis hafızası canlansın.
              </h2>
              <p className="sp-lead-p">
                SanayiPro&apos;da aramaya plaka yazdığınız an aracı hatırlamaya çalışmazsınız.
                Müşteri kim, en son hangi kilometrede hangi parça değişti, açık bir iş veya
                ödenmemiş bakiye var mı? Hepsi saniyesinde tek sonuçta önünüzdedir.
              </p>

              <div className="sp-feature-ticks">
                <div className="sp-tick-item">
                  <div className="sp-tick-icon"><CarFront size={18} /></div>
                  <div>
                    <strong>Geri Dönen Müşteriyi Anında Tanıyın</strong>
                    <p>Müşterinin adını, telefonunu ve araca ait özel notları saniyeler içinde görün.</p>
                  </div>
                </div>
                <div className="sp-tick-item">
                  <div className="sp-tick-icon"><History size={18} /></div>
                  <div>
                    <strong>Mükerrer Teşhisi ve Tartışmaları Engelleyin</strong>
                    <p>Daha önce hangi parçaların takıldığı bellidir; garanti ve parça takibi netleşir.</p>
                  </div>
                </div>
                <div className="sp-tick-item">
                  <div className="sp-tick-icon"><Zap size={18} /></div>
                  <div>
                    <strong>Doğrudan Açık İş Emrine veya Kabule Geçin</strong>
                    <p>Sonuç kartından tek tıkla açık işe devam edin veya yeni araç kabulü başlatın.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sp-plate-interactive">
              <PlateSearchDemo />
            </div>
          </div>
        </section>


        {/* =========================================================================
            SECTION 3: BÜYÜK ÜRÜN VİTRİNİ (Rhythm 4: Crisp Clean Daylight #ffffff)
            ========================================================================= */}
        <section className="sp-section sp-product-showcase-section" id="urun-ekranlari">
          <div className="sp-container">
            <div className="sp-section-header-centered">
              <span className="sp-sub-badge">CANLI EKRANLAR</span>
              <h2>SanayiPro 2.0&apos;ı yakından inceleyin.</h2>
              <p>
                İşinizi kolaylaştıran beş temel operasyon modülü.
                Aşağıdaki sekmelere tıklayarak gerçek ekranları detaylarıyla görün.
              </p>
            </div>

            <ProductScreens />
          </div>
        </section>


        {/* =========================================================================
            SECTION 4: KABULDEN TESLİME ADIM ADIM İŞ AKIŞI (Rhythm 5: Pearl Tint)
            ========================================================================= */}
        <section className="sp-section sp-workflow-section" id="nasil-calisir">
          <div className="sp-container">
            <div className="sp-section-header-row">
              <div>
                <span className="sp-sub-badge">İŞ AKIŞI</span>
                <h2>Araç kapıdan girdiğinde ne olur?</h2>
              </div>
              <p>
                Atölyenize tanıdık gelen sıra, her adımda kayıt altına alınan şeffaf bir süreç.
              </p>
            </div>

            <div className="sp-timeline-cards">
              {processSteps.map((item) => (
                <div key={item.step} className="sp-workflow-card">
                  <div className="sp-wf-top">
                    <span className="sp-wf-step">{item.step}</span>
                    <span className="sp-wf-tag">{item.tag}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                  <div className="sp-wf-indicator">
                    <span className="sp-wf-bar" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* =========================================================================
            SECTION 5: ATÖLYEDE USTANIN CEBİNDE: MOBİL (Rhythm 6: Titanium Slate #0b1120)
            ========================================================================= */}
        <section className="sp-section sp-dark-titanium" id="mobil-deneyim">
          <div className="sp-container sp-mobile-stage-grid">
            <div className="sp-mobile-phone-col">
              <div className="sp-phone-device">
                <div className="sp-device-notch">
                  <span className="sp-speaker" />
                  <span className="sp-camera" />
                </div>
                <div className="sp-device-screen">
                  <div className="sp-phone-status-bar">
                    <span>09:41</span>
                    <span>SanayiPro Usta</span>
                    <span>%98</span>
                  </div>
                  <Image
                    src={asset("/product/mobile-jobs.jpg")}
                    alt="SanayiPro mobil usta ekranı: Bana atanan işler, durum ilerletme ve fotoğraf"
                    width={390}
                    height={844}
                    sizes="320px"
                  />
                </div>
              </div>

              <div className="sp-mobile-pill-1">
                <Wrench size={15} /> <span>Mehmet Usta: 4 Aktif İş</span>
              </div>
              <div className="sp-mobile-pill-2">
                <Check size={15} /> <span>Fotoğraf Eklendi (5 Hasar)</span>
              </div>
            </div>

            <div className="sp-mobile-copy-col">
              <span className="sp-sub-badge is-amber">ATÖLYE SAHASINA ÖZEL</span>
              <h2>
                Bilgisayar başında servis yönetilmez.
                <br />
                Usta lifte işini cebinden görsün.
              </h2>
              <p className="sp-lead-p">
                Ustanın masaüstü bilgisayara gidip karmaşık menülerle uğraşacak vakti yoktur.
                SanayiPro Mobil, atölye zemininde çalışan ustalar için özel tasarlanmıştır.
              </p>

              <div className="sp-mobile-highlights">
                <div className="sp-m-item">
                  <div className="sp-m-icon"><ClipboardCheck size={20} /></div>
                  <div>
                    <strong>Sadece Kendi İşlerini Görür</strong>
                    <p>Kendisine atanan araçlar, teslim saatleri ve acil notlar öncelik sırasına göre listelenir.</p>
                  </div>
                </div>

                <div className="sp-m-item">
                  <div className="sp-m-icon"><Sparkles size={20} /></div>
                  <div>
                    <strong>Kamerayla Anında Fotoğraf Ekleme</strong>
                    <p>Sökülen aşınmış balatayı veya hasarlı parçayı fotoğraflayıp tek tıkla iş emrine yükler.</p>
                  </div>
                </div>

                <div className="sp-m-item">
                  <div className="sp-m-icon"><PackageCheck size={20} /></div>
                  <div>
                    <strong>Kullandığı Parçayı Lifte Tüketir</strong>
                    <p>Raftan aldığı motor yağını ve filtreyi cebinden işe ekler; depo stoğu anında güncellenir.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* =========================================================================
            SECTION 6: FİNANS, KASA & STOK YÖNETİMİ (Rhythm 7: Pearl Gray #f8fafc)
            ========================================================================= */}
        <section className="sp-section sp-finance-stock-section" id="finans-stok">
          <div className="sp-container">
            <div className="sp-section-header-centered">
              <span className="sp-sub-badge">İŞLETMENİZİN KONTROLÜ</span>
              <h2>Cebinize giren ve çıkan para daima net.</h2>
              <p>
                Karmaşık muhasebe terimleri yok; servisin günlük gerçek kasası,
                açık hesapları ve parça kârlılığı var.
              </p>
            </div>

            <div className="sp-finance-pillars">
              <div className="sp-finance-card">
                <div className="sp-pillar-icon"><Wallet size={24} /></div>
                <h3>Bugünkü Kasa & Tahsilat</h3>
                <p>Nakit, kredi kartı ve havale tahsilatlarını anında görün. Gün sonunda kasada ne olması gerektiği şüpheye yer bırakmaz.</p>
                <div className="sp-pillar-tag">GÜNLÜK NET HAREKET</div>
              </div>

              <div className="sp-finance-card">
                <div className="sp-pillar-icon"><TrendingUp size={24} /></div>
                <h3>Açık Hesap & Veresiye Takibi</h3>
                <p>Hangi müşteriden ne kadar alacağınız var? Açık bakiyeler müşteri ve araç detayında tek tıkla listelenir, tahsilat kolaylaşır.</p>
                <div className="sp-pillar-tag">SIFIR UNUTULAN BAKİYE</div>
              </div>

              <div className="sp-finance-card">
                <div className="sp-pillar-icon"><Layers3 size={24} /></div>
                <h3>Tahmini Brüt Kazanç</h3>
                <p>Hizmet cirosundan kullanılan parçaların alış maliyetini düşerek iş emri bazında gerçek brüt kârınızı hesaplar.</p>
                <div className="sp-pillar-tag">GERÇEK İŞ KÂRLILIĞI</div>
              </div>

              <div className="sp-finance-card">
                <div className="sp-pillar-icon"><Truck size={24} /></div>
                <h3>Kritik Stok & Tedarikçi</h3>
                <p>Minimum seviyenin altına inen filtre veya balatalar için anında uyarı verir. Hangi toptancıdan kaç liraya aldığınız kayıtlıdır.</p>
                <div className="sp-pillar-tag">DEPO GÜVENCESİ</div>
              </div>
            </div>
          </div>
        </section>


        {/* =========================================================================
            SECTION 7: OTOMASYONLAR & İLETİŞİM (Rhythm 8: Midnight Tech #060b17)
            ========================================================================= */}
        <section className="sp-section sp-dark-automations">
          <div className="sp-container">
            <div className="sp-section-header-row is-dark">
              <div>
                <span className="sp-sub-badge is-green">OTOMATİK İLETİŞİM</span>
                <h2>Müşteriyi telefonla aramayın.<br />Sistem haber versin.</h2>
              </div>
              <p>
                Aracın teslimatından sonraki periyodik bakıma kadar müşteriyle profesyonel temas kurun.
              </p>
            </div>

            <div className="sp-automation-cards">
              <div className="sp-auto-card">
                <div className="sp-auto-badge">ARAÇ HAZIR BİLDİRİMİ</div>
                <div className="sp-chat-bubble">
                  <div className="sp-bubble-header">
                    <span className="sp-wa-icon"><MessageCircle size={16} /></span>
                    <strong>SanayiPro Servis Bildirimi</strong>
                    <small>15:24</small>
                  </div>
                  <p>
                    Sayın <b>Ahmet Yılmaz</b>, <b>31 ABC 123</b> plakalı aracınızın son kontrolleri tamamlanmış olup teslime hazırdır.
                  </p>
                  <div className="sp-bubble-meta">
                    <span>Toplam Tutar: ₺8.500 · Açık Bakiye: ₺3.500</span>
                    <span className="sp-wa-checks">✓✓</span>
                  </div>
                </div>
                <h3>Tek Tıkla Hazır Bildirimi</h3>
                <p>Son kontrolü onaylayıp &apos;Teslime Hazır&apos; yaptığınız an müşteri bilgilendirilir, atölye trafiği hızlanır.</p>
              </div>

              <div className="sp-auto-card">
                <div className="sp-auto-badge">PERİYODİK BAKIM HATIRLATMA</div>
                <div className="sp-maint-card">
                  <div className="sp-maint-date">
                    <span>KASIM</span>
                    <strong>07</strong>
                    <small>2026</small>
                  </div>
                  <div className="sp-maint-info">
                    <h4>Sonraki Yağ & Filtre Bakımı</h4>
                    <p>31 ABC 123 · Renault Megane</p>
                    <div className="sp-maint-progress">
                      <div className="sp-maint-labels">
                        <span>Mevcut: 98.450 km</span>
                        <span>Hedef: 115.000 km</span>
                      </div>
                      <div className="sp-prog-track"><span style={{ width: "72%" }} /></div>
                    </div>
                  </div>
                </div>
                <h3>Geri Gelen Müşteri Sayısını Artırın</h3>
                <p>Bir sonraki bakım tarihini ve kilometre hedefini takip edin; müşteriyi servise tekrar davet edin.</p>
              </div>
            </div>
          </div>
        </section>


        {/* =========================================================================
            SECTION 8: KİMLER İÇİN TASARLANDI? (Rhythm 9: Pure White #ffffff)
            ========================================================================= */}
        <section className="sp-section sp-specialties-section" id="kimler-icin">
          <div className="sp-container">
            <div className="sp-section-header-centered">
              <span className="sp-sub-badge">BRANŞLARA ÖZEL UYUM</span>
              <h2>Her oto servisin dilinden anlayan altyapı.</h2>
              <p>Uzmanlığınız ne olursa olsun; müşteri, araç ve iş emri düzeni kusursuz çalışır.</p>
            </div>

            <div className="sp-specialties-grid">
              <div className="sp-spec-card">
                <div className="sp-spec-icon">01</div>
                <h4>Motor & Mekanik</h4>
                <p>Ağır bakım, silindir kapağı, triger, subap ve motor revizyon süreçlerinin parçalı takibi.</p>
              </div>
              <div className="sp-spec-card">
                <div className="sp-spec-icon">02</div>
                <h4>Fren & Yürür Aksam</h4>
                <p>Balata, disk, amortisör, salıncak ve rot ayarı işlemlerinde milimetrik stok dökümü.</p>
              </div>
              <div className="sp-spec-card">
                <div className="sp-spec-icon">03</div>
                <h4>Oto Elektrik & Elektronik</h4>
                <p>Akü testi, marş-şarj dinamoları, beyin kodlama ve tesisat arıza tespitleri.</p>
              </div>
              <div className="sp-spec-card">
                <div className="sp-spec-icon">04</div>
                <h4>Klima & İklimlendirme</h4>
                <p>Gaz dolumu, kaçak tespiti, kompresör onarımı ve polen filtre periyotları.</p>
              </div>
              <div className="sp-spec-card">
                <div className="sp-spec-icon">05</div>
                <h4>Periyodik Hızlı Bakım</h4>
                <p>Yağ, hava, yakıt, polen filtre setleri ve sıvı kontrollerinde dakikalar içinde giriş-çıkış.</p>
              </div>
              <div className="sp-spec-card">
                <div className="sp-spec-icon">06</div>
                <h4>Kaporta, Boya & Mini Onarım</h4>
                <p>Kabul anında fotoğraflı hasar işaretleme ve parça değişim kayıtları.</p>
              </div>
            </div>
          </div>
        </section>


        {/* =========================================================================
            SECTION 9: SIK SORULAN SORULAR (Rhythm 10: Pearl Gray #f8fafc)
            ========================================================================= */}
        <section className="sp-section sp-faq-section" id="sss">
          <div className="sp-container sp-faq-split">
            <div className="sp-faq-intro">
              <span className="sp-sub-badge">MERAK EDİLENLER</span>
              <h2>Aklınızdaki soruların net yanıtları.</h2>
              <p className="sp-lead-p">
                SanayiPro hakkında bilmek istediğiniz tüm detaylar.
                Hâlâ aklınıza takılan bir konu varsa ekibimize doğrudan ulaşabilirsiniz.
              </p>
              <a href="#iletisim" className="sp-btn-link-arrow">
                Bize Ulaşın <ArrowRight size={16} />
              </a>
            </div>

            <div className="sp-faq-accordion">
              {faqItems.map((item) => (
                <details key={item.q} className="sp-faq-item" name="faq-group">
                  <summary className="sp-faq-question">
                    <span>{item.q}</span>
                    <ChevronDown size={19} className="sp-faq-arrow" />
                  </summary>
                  <div className="sp-faq-answer">
                    <p>{item.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>


        {/* =========================================================================
            SECTION 10: GÜÇLÜ FİNAL CTA & İLETİŞİM FORMU (Rhythm 11: Dark High-Tech Glow)
            ========================================================================= */}
        <section className="sp-section sp-cta-final-section" id="iletisim">
          <div className="sp-cta-glow-mesh" />
          <div className="sp-container sp-final-grid">
            <div className="sp-final-copy">
              <div className="sp-hero-badge is-inverted">
                <span className="sp-hero-dot" />
                <span>HEMEN BAŞLAYIN</span>
              </div>
              <h2>
                Servisinizin kontrolünü
                <br />
                <span className="sp-gradient-text">bugün elinize alın.</span>
              </h2>
              <p className="sp-lead-p">
                İşletmenizin büyüklüğüne ve ihtiyaçlarına göre SanayiPro&apos;yu birlikte
                değerlendirelim. İster doğrudan formu doldurun, ister canlı paneli kendiniz gezin.
              </p>

              <div className="sp-final-actions">
                <a href={asset("/app/")} className="sp-btn-primary is-large" target="_blank" rel="noopener">
                  <span className="sp-pulse-dot" />
                  <span>Canlı Paneli Hemen Açın</span>
                  <ArrowRight size={17} />
                </a>
                <a href={asset("/login/")} className="sp-btn-outline">
                  Kayıtlı Giriş Yap
                </a>
              </div>

              <div className="sp-final-guarantee">
                <div className="sp-guar-item">
                  <ShieldCheck size={20} />
                  <span>Verileriniz güvenle saklanır</span>
                </div>
                <div className="sp-guar-item">
                  <PhoneCall size={20} />
                  <span>Aynı gün canlı teknik destek</span>
                </div>
              </div>
            </div>

            <div className="sp-final-form-col">
              <DemoContactForm />
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          FOOTER (Corporate & Complete)
          ========================================================================= */}
      <footer className="sp-footer">
        <div className="sp-container">
          <div className="sp-footer-row">
            <div className="sp-footer-brand-col">
              <Brand />
              <p>
                Oto servislerin günlük araç kabul, iş emri, usta, stok, randevu ve kasa süreçlerini
                tek çalışma alanında birleştiren yeni nesil servis işletim sistemi.
              </p>
              <div className="sp-footer-badge">
                <span className="sp-status-pulse" /> SanayiPro 2.0 Yayında
              </div>
            </div>

            <div className="sp-footer-links-col">
              <h5>Ürün</h5>
              <a href="#ozellikler">Özellikler</a>
              <a href="#nasil-calisir">İş Akışı</a>
              <a href="#urun-ekranlari">Ürün Ekranları</a>
              <a href="#plaka-deneyimi">Plaka Deneyimi</a>
              <a href="#mobil-deneyim">Mobil Usta</a>
            </div>

            <div className="sp-footer-links-col">
              <h5>Operasyon</h5>
              <a href="#finans-stok">Finans & Kasa</a>
              <a href="#kimler-icin">Kimler İçin?</a>
              <a href="#sss">Sık Sorulanlar</a>
              <a href="#iletisim">İletişim & Demo</a>
            </div>

            <div className="sp-footer-links-col">
              <h5>Hızlı Erişim</h5>
              <a href={asset("/app/")} target="_blank" rel="noopener">Canlı Panel</a>
              <a href={asset("/login/")}>Kullanıcı Girişi</a>
              <a href="#ana-sayfa">Başa Dön ↑</a>
            </div>
          </div>

          <div className="sp-footer-bottom-bar">
            <span>© {new Date().getFullYear()} SanayiPro Technologies. Tüm hakları saklıdır.</span>
            <span>Oto servislerin güvenilir dijital omurgası.</span>
            <a href="#ana-sayfa">Yukarı çık ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
