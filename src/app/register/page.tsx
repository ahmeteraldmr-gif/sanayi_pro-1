import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/marketing/brand";
import { RegisterForm } from "@/components/auth/register-form";
import {
  ClipboardCheck,
  Building2,
  Users2,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from "lucide-react";
import "../login/login.css";
import "./register.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kayıt Ol | SanayiPro - Servis Yönetim Platformu",
  description:
    "SanayiPro 2.0 ile oto servisinizi hemen dijitalleştirin. İşletme ve ilk şubenizi dakikalar içinde oluşturun.",
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <main className="login-page-container register-page-container">
      {/* ====================================================================
          SOL TARAF: Marka ve Kurulum Bilgisi
          ==================================================================== */}
      <section className="login-brand-panel" aria-label="SanayiPro Servis Kurulumu">
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
              <span>YENİ SERVİS KURULUMU</span>
            </div>
          </header>

          {/* Ana Değer Teklifi & Başlık */}
          <div className="login-brand-hero">
            <h1 className="login-brand-title">
              Servisinizi{" "}
              <span className="login-brand-highlight">tek merkezden</span> yönetmeye başlayın.
            </h1>
            <p className="login-brand-lead">
              İşletmenizi ve ilk şubenizi oluşturun. İş emirleri, parça stokları,
              araç kabul ve tahsilatları tek ekranda toplayın.
            </p>

            {/* 3 Kurulum Avantajı */}
            <div className="login-brand-features">
              <div className="login-brand-feat-item">
                <div className="login-feat-icon-box" aria-hidden="true">
                  <Building2 size={20} />
                </div>
                <div className="login-feat-texts">
                  <span className="login-feat-title">İşletme ve şube altyapısı</span>
                  <span className="login-feat-desc">
                    İlk şubeniz anında hazır olur; yeni şubeler dilediğiniz zaman eklenebilir.
                  </span>
                </div>
              </div>

              <div className="login-brand-feat-item">
                <div className="login-feat-icon-box" aria-hidden="true">
                  <ClipboardCheck size={20} />
                </div>
                <div className="login-feat-texts">
                  <span className="login-feat-title">Hızlı araç kabul & iş emirleri</span>
                  <span className="login-feat-desc">
                    Müşteri kaydı, kilometre ve arıza tespiti ile iş akışını anında başlatın.
                  </span>
                </div>
              </div>

              <div className="login-brand-feat-item">
                <div className="login-feat-icon-box" aria-hidden="true">
                  <Users2 size={20} />
                </div>
                <div className="login-feat-texts">
                  <span className="login-feat-title">İşletme Sahibi yetkisi</span>
                  <span className="login-feat-desc">
                    İlk kayıt olan kullanıcı tam yetkili işletme sahibi olarak atanır.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alt Güven Rozeti */}
          <div className="login-preview-card" style={{ padding: "16px 20px" }}>
            <div className="login-preview-header">
              <div className="login-preview-status">
                <span className="login-preview-pulse" aria-hidden="true" />
                <span>Kuruluma Hazır Bulut Altyapısı</span>
              </div>
              <span className="login-preview-branch">v2.0 Güncel</span>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          SAĞ TARAF: Kayıt Formu
          ==================================================================== */}
      <section className="login-form-panel" aria-label="Kayıt Formu">
        <div className="login-form-wrapper">
          <div className="register-card">
            <div className="register-card-header">
              <div className="register-card-badge">
                <span className="login-brand-pill-dot" aria-hidden="true" />
                <span>SANAYİPRO KURULUM</span>
              </div>
              <h2 className="register-card-title">İşletme Hesabı Oluşturun</h2>
              <p className="register-card-desc">
                Bilgilerinizi girerek servisinizi oluşturun ve çalışma alanınıza
                hemen erişin.
              </p>
            </div>

            <RegisterForm />
          </div>

          {/* Alt Güven Unsurları */}
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
        </div>
      </section>
    </main>
  );
}
