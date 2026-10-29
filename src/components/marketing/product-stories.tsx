import {
  ArrowRight,
  Camera,
  CarFront,
  Check,
  ChevronRight,
  ClipboardCheck,
  Fuel,
  Gauge,
  History,
  ImagePlus,
  MessageSquareText,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { serviceHistory, teamExamples } from "@/lib/marketing-data";

export function IntakeSection() {
  return (
    <section className="section story-section" aria-labelledby="intake-title">
      <div className="container story-grid">
        <div className="story-copy">
          <p className="eyebrow">
            <span>01</span> ARAÇ KABUL
          </p>
          <h2 id="intake-title">
            Araç geldiğinde
            <br />
            gerekenleri kayda alın.
          </h2>
          <p className="section-description">
            Plakadan başlayın. Kilometreyi, müşterinin şikâyetini ve aracın
            giriş durumunu adım adım kaydedin.
          </p>
          <ul className="story-benefits">
            <li>
              <ClipboardCheck /> Kontrol listesiyle tutarlı kabul
            </li>
            <li>
              <Camera /> Mevcut hasarlar için fotoğraf kaydı
            </li>
            <li>
              <ArrowRight /> Aynı kayıttan iş emrine geçiş
            </li>
          </ul>
          <span className="story-index">Daha ilk adımda, doğru bilgi.</span>
        </div>
        <figure className="intake-preview product-surface">
          <div className="product-panel-header">
            <span>
              <ClipboardCheck size={17} aria-hidden="true" /> Yeni Araç Kabul
            </span>
            <span className="panel-label">ÖRNEK KAYIT</span>
          </div>
          <div className="intake-progress">
            <span className="done">
              <Check size={12} /> Araç
            </span>
            <i />
            <span className="current">
              2 <b>Araç Durumu</b>
            </span>
            <i />
            <span>3 Kontrol</span>
            <i />
            <span>4 Fotoğraf</span>
          </div>
          <div className="intake-body">
            <div className="intake-vehicle">
              <CarFront size={25} aria-hidden="true" />
              <div>
                <strong>31 ABC 123</strong>
                <span>Renault Megane · Ahmet Yılmaz</span>
              </div>
              <span className="status-badge neutral">Araç bulundu</span>
            </div>
            <div className="intake-fields">
              <div>
                <span>
                  <Gauge size={14} /> Kilometre
                </span>
                <strong>
                  98.450 <small>km</small>
                </strong>
              </div>
              <div>
                <span>
                  <Fuel size={14} /> Yakıt seviyesi
                </span>
                <strong>
                  %45{" "}
                  <span className="fuel-gauge">
                    <i />
                  </span>
                </strong>
              </div>
            </div>
            <div className="complaint">
              <span>Müşteri Şikâyeti</span>
              <p>“Fren yaparken ses geliyor.”</p>
            </div>
            <div className="intake-checklist">
              <span>
                <Check size={14} /> Ruhsat
              </span>
              <span>
                <Check size={14} /> Stepne
              </span>
              <p>
                <TriangleAlert size={14} /> Sol ön kapıda mevcut çizik
              </p>
            </div>
            <div className="photo-slots">
              {["Ön", "Arka", "Sağ", "Sol", "Hasar"].map((label) => (
                <div key={label}>
                  <ImagePlus size={19} aria-hidden="true" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <figcaption className="panel-caption">
            Fotoğraflı ve kontrol listeli hızlı araç kabul süreci.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

export function TeamSection() {
  return (
    <section className="section team-section" aria-labelledby="team-title">
      <div className="container">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">
              <span>02</span> İŞLER VE EKİP
            </p>
            <h2 id="team-title">
              Hangi iş bekliyor,
              <br />
              kim ilgileniyor görün.
            </h2>
          </div>
          <p>
            Her aracın durumunu ekibinizle birlikte takip edin.
            <br />
            Bekleyen işi, bekleme nedeniyle birlikte görün.
          </p>
        </div>
        <div className="team-board">
          {teamExamples.map((job, index) => (
            <div className="team-lane" key={job.plate}>
              <div className="team-lane-heading">
                <span className={`lane-dot ${job.tone}`} />
                <h3>{job.status}</h3>
                <span>01</span>
              </div>
              <article className="team-job">
                <div className="team-job-top">
                  <CarFront size={21} aria-hidden="true" />
                  <span>İŞ {String(index + 1).padStart(2, "0")}</span>
                </div>
                <h4>{job.plate}</h4>
                <p>{job.customer}</p>
                <div className="team-job-note">
                  <span className={`status-badge ${job.tone}`}>{job.note}</span>
                </div>
                <div className="team-job-person">
                  <span className="person-initials">{job.initials}</span>
                  <span>{job.technician}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </div>
              </article>
            </div>
          ))}
        </div>
        <p className="demo-caption">
          Ekip üyelerine atanan işler, onay durumları ve öncelik sıralaması tek ekranda.
        </p>
      </div>
    </section>
  );
}

export function HistorySection() {
  return (
    <section
      className="section story-section history-section"
      aria-labelledby="history-title"
    >
      <div className="container story-grid story-grid-reverse">
        <figure className="history-preview product-surface">
          <div className="product-panel-header">
            <span>
              <History size={17} aria-hidden="true" /> Araç Servis Geçmişi
            </span>
            <span className="panel-label">SERVİS KAYDI</span>
          </div>
          <div className="history-vehicle">
            <span className="large-car-icon">
              <CarFront size={27} aria-hidden="true" />
            </span>
            <div>
              <strong>31 ABC 123</strong>
              <p>Renault Megane</p>
            </div>
            <span className="mileage-chip">99.200 km</span>
          </div>
          <div className="service-timeline">
            {serviceHistory.map((entry, index) => (
              <div className="timeline-entry" key={entry.date}>
                <span
                  className={`timeline-marker ${index === serviceHistory.length - 1 ? "latest" : ""}`}
                />
                <div>
                  <div className="timeline-date">
                    <time>{entry.date}</time>
                    <span>{entry.mileage}</span>
                  </div>
                  <h3>{entry.title}</h3>
                  <p>{entry.note}</p>
                </div>
              </div>
            ))}
          </div>
          <figcaption className="history-footer">
            <ShieldCheck size={15} aria-hidden="true" /> Ziyaretin tarihi,
            kilometresi ve yapılan işlem birlikte.
          </figcaption>
        </figure>
        <div className="story-copy">
          <p className="eyebrow">
            <span>03</span> ARAÇ HAFIZASI
          </p>
          <h2 id="history-title">
            Araç geri geldiğinde,
            <br />
            geçmişi de gelsin.
          </h2>
          <p className="section-description">
            Daha önce ne yapılmıştı? Hangi kilometrede bakım görmüştü? Servis
            ziyaretlerini plakadan ulaşılabilen bir geçmişte bir araya getirin.
          </p>
          <ul className="story-benefits">
            <li>
              <History /> Tarih ve kilometreyle servis geçmişi
            </li>
            <li>
              <MessageSquareText /> Önceki şikâyetler ve işlem notları
            </li>
            <li>
              <UserRound /> Ziyaret anındaki müşteri ilişkisi
            </li>
          </ul>
          <a className="text-link" href="#urun-akisi">
            Servis akışını incele{" "}
            <ChevronRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
