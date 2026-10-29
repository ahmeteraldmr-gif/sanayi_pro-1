import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  FileText,
  MessageSquare,
  ReceiptText,
} from "lucide-react";
import { WorkflowPreview } from "./workflow-preview";

export function ProblemSection() {
  return (
    <section
      id="nasil-calisir"
      className="section problem-section"
      aria-labelledby="problem-title"
    >
      <div className="container problem-grid">
        <div>
          <p className="eyebrow">AYNI ARAÇ. TEK BİR HİKÂYE.</p>
          <h2 id="problem-title">
            Bir aracın işi,
            <br />
            birkaç farklı yerde kalmasın.
          </h2>
          <p className="section-description">
            Müşteri şikâyeti WhatsApp’ta, kullanılan parça kâğıtta, tahsilat
            başka bir defterde, randevu telefonda kalınca işin tamamını görmek
            zorlaşıyor.
          </p>
          <p className="problem-resolution">
            SanayiPro, aynı servis ziyaretini tek bir akışta tutmayı amaçlar.
          </p>
        </div>
        <div
          className="scattered-flow"
          aria-label="Dağınık kayıtlardan ortak servis kaydına örnek geçiş"
        >
          <div className="scattered-label">BUGÜN BİLGİ NEREDE?</div>
          <div className="scattered-sources">
            <div>
              <MessageSquare />
              <span>
                Müşteri şikâyeti<small>Mesajlarda</small>
              </span>
            </div>
            <div>
              <FileText />
              <span>
                Kullanılan parça<small>Kâğıtlarda</small>
              </span>
              <FileText className="source-echo" />
            </div>
            <div>
              <ReceiptText />
              <span>
                Tahsilat<small>Defterde</small>
              </span>
            </div>
            <div>
              <CalendarDays />
              <span>
                Randevu<small>Telefonda</small>
              </span>
            </div>
          </div>
          <div className="flow-merge">
            <span />
            <ArrowDown size={18} aria-hidden="true" />
            <span />
          </div>
          <div className="unified-record">
            <span className="unified-icon">
              <ClipboardList size={22} aria-hidden="true" />
            </span>
            <div>
              <strong>31 ABC 123</strong>
              <p>Bir ziyaret. İlişkili kayıtlar.</p>
            </div>
            <span className="unified-check">
              <Check size={16} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  return (
    <section
      id="urun-akisi"
      className="section workflow-section"
      aria-labelledby="workflow-title"
    >
      <div className="container">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">SERVİSİN RİTMİ</p>
            <h2 id="workflow-title">
              Kabulden teslimata,
              <br />
              aynı işin içinde.
            </h2>
          </div>
          <p>
            Bir sonraki aşama belli olsun.
            <br />
            Araç, ekip ve yapılacaklar birbirinden kopmasın.
          </p>
        </div>
        <WorkflowPreview />
        <div className="section-footnote">
          <span className="footnote-line" />
          <span>Her aşamada aynı araç, aynı iş emri, ortak bilgi.</span>
          <ArrowRight size={15} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
