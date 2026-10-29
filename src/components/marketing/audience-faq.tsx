import {
  ChevronDown,
  CircleCheck,
  KeyRound,
  Layers2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { faqs, specialties } from "@/lib/marketing-data";

const trustItems = [
  {
    icon: Layers2,
    title: "İşletme bazlı ayrım",
    text: "Her işletmenin müşteri, araç ve operasyon kayıtları kendi kapsamında ele alınır.",
  },
  {
    icon: ShieldCheck,
    title: "Şube bazlı erişim",
    text: "İş emirleri, stok ve kasa hareketleri ilgili şube kapsamıyla yönetilir.",
  },
  {
    icon: KeyRound,
    title: "Göreve uygun yetki",
    text: "Usta, yönetici ve muhasebe kullanıcısının erişimleri farklılaştırılır.",
  },
];

export function AudienceSection() {
  return (
    <section
      id="kimler-icin"
      className="section audience-section"
      aria-labelledby="audience-title"
    >
      <div className="container audience-grid">
        <div>
          <p className="eyebrow">SİZİN SERVİSİNİZE UYAN BİR TEMEL</p>
          <h2 id="audience-title">
            Farklı uzmanlıklar,
            <br />
            ortak bir servis düzeni.
          </h2>
          <p className="section-description">
            SanayiPro’nun temel akışı branşlardan bağımsız çalışır. İşletmeler
            kendi servis yapısına göre uzmanlıklarını ve kullanım biçimini
            düzenleyebilir.
          </p>
          <span className="audience-note">
            <UsersRound size={17} aria-hidden="true" /> 1–10 çalışanlı genel oto
            servisleri için tasarlandı.
          </span>
        </div>
        <ul className="specialty-list">
          {specialties.map((specialty, index) => (
            <li key={specialty}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{specialty}</strong>
              <CircleCheck size={18} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TrustSection() {
  return (
    <section className="section trust-section" aria-labelledby="trust-title">
      <div className="container">
        <div className="section-heading centered">
          <p className="eyebrow">HERKES İŞİNİ GÖRSÜN</p>
          <h2 id="trust-title">
            İşletmenizin kayıtları,
            <br />
            yetkili ekibinizin erişiminde.
          </h2>
          <p>Doğru kişiye, görevi için gereken görünürlük.</p>
        </div>
        <div className="trust-grid">
          {trustItems.map(({ icon: Icon, title, text }) => (
            <div key={title}>
              <Icon size={24} aria-hidden="true" />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <p className="trust-note">
          SanayiPro, işletmenizin verilerini şube bazında ayırır ve yalnızca
          yetkili kullanıcılara gösterir.
        </p>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section
      id="sik-sorulanlar"
      className="section faq-section"
      aria-labelledby="faq-title"
    >
      <div className="container faq-grid">
        <div>
          <p className="eyebrow">AKLINIZDAKİ SORULAR</p>
          <h2 id="faq-title">
            Biraz daha
            <br />
            yakından bakalım.
          </h2>
          <p className="section-description">
            SanayiPro’nun kapsamı ve
            <br className="desktop-break" /> planlanan kullanım biçimi.
          </p>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>
                {faq.question}
                <ChevronDown size={19} aria-hidden="true" />
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
