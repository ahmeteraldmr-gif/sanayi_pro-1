import {
  ArrowDownLeft,
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  CircleHelp,
  Clock3,
  Package,
  ReceiptText,
  Send,
} from "lucide-react";
import {
  daysUntilMaintenance,
  maintenance,
  previewDate,
  stockExamples,
} from "@/lib/marketing-data";

export function BusinessSection() {
  return (
    <section
      className="section business-section"
      aria-labelledby="business-title"
    >
      <div className="container">
        <div className="section-heading centered">
          <p className="eyebrow">
            <span>04</span> İŞİN İŞLETME TARAFI
          </p>
          <h2 id="business-title">
            Kullanılan parça da,
            <br />
            kalan bakiye de kaybolmasın.
          </h2>
          <p>
            İş emrinin parçalarını, oluşan hesabı ve yapılan tahsilatı
            <br className="desktop-break" /> birbirinden ayırarak, aynı bütünün
            içinde görün.
          </p>
        </div>
        <div className="business-panels">
          <figure className="stock-preview">
            <div className="business-panel-heading">
              <span className="business-icon">
                <Package size={20} />
              </span>
              <div>
                <h3>Ayrılan belli. Kullanılan belli.</h3>
                <p>Şube stoğundan örnek görünüm</p>
              </div>
            </div>
            <div
              className="stock-table"
              role="table"
              aria-label="Örnek stok durumu"
            >
              <div role="row" className="stock-table-head">
                <span role="columnheader">Parça</span>
                <span role="columnheader">Fiziksel</span>
                <span role="columnheader">Rezerve</span>
                <span role="columnheader">Kullanılabilir</span>
              </div>
              {stockExamples.map((part) => (
                <div role="row" className="stock-row" key={part.code}>
                  <span role="cell">
                    <strong>{part.name}</strong>
                    <small>{part.code}</small>
                  </span>
                  <span role="cell">{part.physical}</span>
                  <span role="cell">{part.reserved}</span>
                  <span
                    role="cell"
                    className={
                      part.available === 1 ? "stock-low" : "stock-available"
                    }
                  >
                    {part.available}
                  </span>
                </div>
              ))}
            </div>
            <figcaption>
              <ArrowRight size={15} aria-hidden="true" /> Parçayı ayırın.
              Kullanıldığında tüketimi kaydedin.
            </figcaption>
          </figure>
          <figure className="finance-preview">
            <div className="business-panel-heading">
              <span className="business-icon">
                <ReceiptText size={20} />
              </span>
              <div>
                <h3>Hesap açık, bakiye net.</h3>
                <p>Örnek iş emri · 31 ABC 123</p>
              </div>
            </div>
            <dl className="finance-numbers">
              <div>
                <dt>Kesinleşen Hesap</dt>
                <dd>
                  10.000 <span>TL</span>
                </dd>
              </div>
              <div>
                <dt>Tahsil Edilen</dt>
                <dd>
                  6.000 <span>TL</span>
                </dd>
              </div>
              <div className="balance-line">
                <dt>Açık Bakiye</dt>
                <dd>
                  4.000 <span>TL</span>
                </dd>
              </div>
            </dl>
            <div className="gross-profit">
              <span>
                <ArrowDownLeft size={17} aria-hidden="true" /> Tahmini Brüt
                Kazanç
              </span>
              <strong>4.800 TL</strong>
            </div>
            <figcaption>
              <CircleHelp size={14} aria-hidden="true" /> İş emri bazlı hesaplama. Genel
              giderler dahil değildir.
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}

export function AutomationSection() {
  return (
    <section
      className="section automation-section"
      aria-labelledby="automation-title"
    >
      <div className="container">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">
              <span>05</span> SONRAKİ ADIMI UNUTMAYIN
            </p>
            <h2 id="automation-title">
              Teslim ve bakım
              <br />
              iletişimini takip edin.
            </h2>
          </div>
          <p>
            Araç hazır olduğunda ve yeni bakım yaklaştığında,
            <br />
            iletişimin de iş akışında bir yeri olsun.
          </p>
        </div>
        <div className="automation-grid">
          <article className="automation-example">
            <div className="automation-example-title">
              <Send size={21} aria-hidden="true" />
              <span>ARAÇ HAZIR</span>
              <span className="example-label">SERVİS AKIŞI</span>
            </div>
            <div className="notification-flow">
              <div>
                <span className="status-badge success">
                  <Check size={12} aria-hidden="true" /> Teslime Hazır
                </span>
                <strong>31 ABC 123</strong>
                <p>İş emri tamamlandı.</p>
              </div>
              <ArrowRight
                className="notification-arrow"
                size={20}
                aria-hidden="true"
              />
              <div className="notification-state">
                <BellRing size={20} aria-hidden="true" />
                <span>Müşteri bildirimi</span>
                <strong>
                  <Clock3 size={13} aria-hidden="true" /> İletildi
                </strong>
              </div>
            </div>
            <p className="integration-disclaimer">
              <CircleHelp size={16} aria-hidden="true" /> WhatsApp entegrasyonu ile
              anlık müşteri bilgilendirmesi.
            </p>
          </article>
          <article className="automation-example maintenance-example">
            <div className="automation-example-title">
              <CalendarClock size={21} aria-hidden="true" />
              <span>BAKIM HATIRLATMA</span>
              <span className="example-label">SERVİS TAKVİMİ</span>
            </div>
            <div className="maintenance-main">
              <div>
                <h3>Sonraki Yağ Bakımı</h3>
                <strong>{maintenance.nextDate}</strong>
                <p>
                  veya <b>{maintenance.nextMileage}</b>
                </p>
              </div>
              <span className="days-badge">
                <strong>{daysUntilMaintenance()}</strong>
                <span>gün kaldı</span>
              </span>
            </div>
            <div className="maintenance-note">
              <span>
                Son kayıt: <strong>{maintenance.lastMileage}</strong>
              </span>
              <span>Örnek tarih: {previewDate}</span>
            </div>
            <p className="automation-caption">
              Kilometre canlı takip edilmez; son kayıt esas alınır.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
