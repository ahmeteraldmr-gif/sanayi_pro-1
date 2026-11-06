import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/marketing/brand";
import { LoginForm } from "@/components/auth/login-form";
import { backendConfigured } from "@/server/security";
import {
  ClipboardCheck,
  Boxes,
  Users2,
  ShieldCheck,
  Smartphone,
  UserCheck,
  Wrench,
} from "lucide-react";
import "./login.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giriş | SanayiPro - Servis Yönetim Platformu",
  description:
    "SanayiPro 2.0 servis çalışma alanınıza güvenle giriş yapın. İş emirleri, araç kabul, stok ve finans takibi tek ekranda.",
  robots: { index: false, follow: false },
};

interface LoginPageProps {
  searchParams?: Promise<{ redirect?: string; expired?: string; setup?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const redirectTo = resolved?.redirect;
  const isExpired = resolved?.expired === "1";
  const configured = backendConfigured();

  return (
    <main className="login-page-container">
      {/* ====================================================================
          SOL TARAF: Marka ve Ürün Anlatımı (Deep Navy & Modern Servis Atmosferi)
          ==================================================================== */}
      <section className="login-brand-panel" aria-label="SanayiPro Ürün Tanıtımı">
        <div className="login-brand-overlay" aria-hidden="true" />
        <div className="login-brand-grid" aria-hidden="true" />

        <div className="login-brand-content">
          {/* Üst Marka & Sektör Etiketi */}
          <header className="login-brand-header">
            <Link href="/" className="login-brand-link" aria-label="SanayiPro Ana Sayfa">
              <Brand />
            </Link>
            <div className="login-brand-pill">
              <span className="login-brand-pill-dot" aria-hidden="true" />
              <span>OTO SERVİS YÖNETİM PLATFORMU</span>
            </div>
          </header>

          {/* Ana Değer Teklifi & Başlık */}
          <div className="login-brand-hero">
            <h1 className="login-brand-title">
              Servis çalışma alanınıza{" "}
              <span className="login-brand-highlight">güvenle</span> giriş yapın.
            </h1>
            <p className="login-brand-lead">
              SanayiPro ile işletmenizi daha düzenli yönetin. Servisinizin günlük
              süreçlerine tek çalışma alanından ulaşın.
            </p>

            {/* 3 Temel Operasyonel Özellik */}
            <div className="login-brand-features">
              <div className="login-brand-feat-item">
                <div className="login-feat-icon-box" aria-hidden="true">
                  <ClipboardCheck size={20} />
                </div>
                <div className="login-feat-texts">
                  <span className="login-feat-title">İş emirleri ve araç takibi</span>
                  <span className="login-feat-desc">
                    Servisteki araçları ve iş süreçlerini tek yerden takip edin.
                  </span>
                </div>
              </div>

              <div className="login-brand-feat-item">
                <div className="login-feat-icon-box" aria-hidden="true">
                  <Boxes size={20} />
                </div>
                <div className="login-feat-texts">
                  <span className="login-feat-title">Stok ve tahsilat kontrolü</span>
                  <span className="login-feat-desc">
                    Kullanılan parçaları ve ödemeleri kolayca izleyin.
                  </span>
                </div>
              </div>

              <div className="login-brand-feat-item">
                <div className="login-feat-icon-box" aria-hidden="true">
                  <Users2 size={20} />
                </div>
                <div className="login-feat-texts">
                  <span className="login-feat-title">Şube ve ekip yönetimi</span>
                  <span className="login-feat-desc">
                    Ekibinizi ve yetkili olduğunuz şubeleri düzenli yönetin.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alt Bölüm: Canlı Dashboard / Telemetri Önizleme Kartı */}
          <aside className="login-preview-card" aria-label="Canlı Servis Özeti">
            <div className="login-preview-header">
              <div className="login-preview-status">
                <span className="login-preview-pulse" aria-hidden="true" />
                <span>Aktif Servis Operasyonu</span>
              </div>
              <span className="login-preview-branch">Dörtyol Şubesi</span>
            </div>

            <div className="login-preview-metrics">
              <div className="login-preview-metric-item">
                <span className="login-preview-val">14</span>
                <span className="login-preview-label">Aktif İş Emri</span>
              </div>
              <div className="login-preview-metric-item">
                <span className="login-preview-val">8</span>
                <span className="login-preview-label">Servisteki Araç</span>
              </div>
              <div className="login-preview-metric-item">
                <span className="login-preview-val currency">₺24.800</span>
                <span className="login-preview-label">Bugünkü Tahsilat</span>
              </div>
            </div>

            <div className="login-preview-pill">
              <Wrench size={14} className="text-blue-400" aria-hidden="true" />
              <span>
                <strong>31 ABC 123</strong> · Renault Megane
              </span>
              <span>Son Kontrol Tamamlandı</span>
            </div>
          </aside>
        </div>
      </section>

      {/* ====================================================================
          SAĞ TARAF: Giriş Formu & Güven Unsurları (Açık, Ferah ve Modern)
          ==================================================================== */}
      <section className="login-form-panel" aria-label="Giriş Formu">
        <div className="login-form-wrapper">
          {/* Giriş Kartı */}
          <div className="login-card">
            <div className="login-card-header">
              <div className="login-card-badge">
                <span className="login-brand-pill-dot" aria-hidden="true" />
                <span>SANAYİPRO</span>
              </div>
              <h2 className="login-card-title">Çalışma alanınıza giriş yapın.</h2>
              <p className="login-card-desc">
                Giriş yaptıktan sonra yetkili olduğunuz işletme ve şubeye
                erişebilirsiniz.
              </p>
              {isExpired ? (
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", fontSize: "12px", color: "#92400e", marginTop: "10px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚠️ Oturum süreniz sona erdi. Lütfen devam etmek için giriş yapın.</span>
                </div>
              ) : redirectTo ? (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px", fontSize: "12px", color: "#1e40af", marginTop: "10px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🔒 Güvenli servis alanına erişmek için lütfen giriş yapın veya hızlı profil seçin.</span>
                </div>
              ) : null}
            </div>

            <LoginForm configured={configured} redirectTo={redirectTo} />
          </div>

          {/* Kart Altı 3 Güven / Uyumluluk Öğesi */}
          <footer className="login-trust-pillars" aria-label="Platform Yetkinlikleri">
            <div className="login-trust-item">
              <ShieldCheck className="login-trust-icon" size={18} aria-hidden="true" />
              <div className="login-trust-texts">
                <strong>Güvenli erişim</strong>
                <span>Yetkili çalışma alanınız</span>
              </div>
            </div>

            <div className="login-trust-item">
              <Smartphone className="login-trust-icon" size={18} aria-hidden="true" />
              <div className="login-trust-texts">
                <strong>Her yerden erişim</strong>
                <span>Web ve mobil uyumlu</span>
              </div>
            </div>

            <div className="login-trust-item">
              <UserCheck className="login-trust-icon" size={18} aria-hidden="true" />
              <div className="login-trust-texts">
                <strong>Rol bazlı kullanım</strong>
                <span>Ekip ve şube yetkileri</span>
              </div>
            </div>
          </footer>

          {/* Mobilde Giriş Kartının Altında Gösterilen Ek Bilgiler */}
          <div className="login-mobile-features" style={{ display: "none" }}>
            <div className="login-brand-feat-item">
              <div className="login-feat-icon-box" aria-hidden="true">
                <ClipboardCheck size={18} />
              </div>
              <div className="login-feat-texts">
                <span className="login-feat-title">İş emirleri ve araç takibi</span>
                <span className="login-feat-desc">
                  Servisteki araçları ve iş süreçlerini tek yerden takip edin.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
