import Link from "next/link";
import {
  Sparkles,
  Wrench,
  Cog,
  ArrowRight,
  Mail,
  Lock,
} from "lucide-react";
import {
  startSuperAdminAction,
  startServiceManagerAction,
  startTechnicianAction,
  signInFormAction,
} from "@/app/auth/actions";

interface LoginStaticFallbackProps {
  redirectTo?: string;
  isFallback?: boolean;
}

export function LoginStaticFallback({ redirectTo, isFallback }: LoginStaticFallbackProps) {
  return (
    <form action={signInFormAction} className="login-form" noValidate={false}>
      <input type="hidden" name="redirectTo" value={redirectTo || ""} />

      {isFallback && (
        <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 12px", fontSize: "12px", color: "#475569", marginBottom: "8px" }}>
          <span>ℹ️ Güvenli giriş modu devrede. Panel seçerek veya şifrenizle hemen giriş yapabilirsiniz.</span>
        </div>
      )}

      {/* ==================================================================
          1-TIKLA DOĞRUDAN PANEL GİRİŞLERİ (SSR & HYDRATION PROOF)
          ================================================================== */}
      <div className="login-direct-group">
        <button
          type="submit"
          formAction={startSuperAdminAction}
          formNoValidate
          className="login-direct-btn login-direct-btn-superadmin"
          title="SaaS Platform Yöneticisi: Abonelikler, İşletmeler, Paketler, Ödemeler"
        >
          <div className="login-direct-content">
            <div className="login-direct-icon-box login-direct-icon-purple">
              <Sparkles size={17} />
            </div>
            <div className="login-direct-text-col">
              <div className="login-direct-title-row">
                <span>👑 Süper Admin Paneline Gir</span>
                <span className="login-direct-badge login-direct-badge-purple">ASIL ADMİN</span>
              </div>
              <div className="login-direct-subtitle">
                Abonelikler, Kayıtlı İşletmeler, Paketler ve Ödeme Yönetimi
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-purple-700" />
        </button>

        <button
          type="submit"
          formAction={startServiceManagerAction}
          formNoValidate
          className="login-direct-btn login-direct-btn-manager"
          title="Oto Servis Paneli: İş Emirleri, Araç Kabul, Yedek Parça & Kasa"
        >
          <div className="login-direct-content">
            <div className="login-direct-icon-box login-direct-icon-blue">
              <Wrench size={17} />
            </div>
            <div className="login-direct-text-col">
              <div className="login-direct-title-row">
                <span>🏢 Servis Yöneticisi Paneline Gir</span>
                <span className="login-direct-badge login-direct-badge-blue">ATÖLYE</span>
              </div>
              <div className="login-direct-subtitle">
                İş Emirleri, Araç Kabul, Müşteriler, Kasa ve Stok Yönetimi
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-blue-700" />
        </button>

        <button
          type="submit"
          formAction={startTechnicianAction}
          formNoValidate
          className="login-direct-btn login-direct-btn-technician"
          title="Atölye Masası: Tamir, Usta İş Listesi, Arıza Bildirimi & Parça Talebi"
        >
          <div className="login-direct-content">
            <div className="login-direct-icon-box login-direct-icon-emerald">
              <Cog size={17} />
            </div>
            <div className="login-direct-text-col">
              <div className="login-direct-title-row">
                <span>🔧 Atölye Ustası (Mehmet Usta) ile Gir</span>
                <span className="login-direct-badge login-direct-badge-emerald">USTA</span>
              </div>
              <div className="login-direct-subtitle">
                Atölye İş Listesi, Arıza Tespiti ve Parça İsteme Ekranı
              </div>
            </div>
          </div>
          <ArrowRight size={16} className="text-emerald-700" />
        </button>
      </div>

      <div className="login-divider" aria-hidden="true">
        <span>veya kayıtlı işletmenizle giriş yapın</span>
      </div>

      {/* E-posta Alanı */}
      <div className="login-field">
        <label htmlFor="login-email-fb" className="login-label">
          E-posta
        </label>
        <div className="login-input-wrap">
          <Mail className="login-input-icon" size={18} aria-hidden="true" />
          <input
            id="login-email-fb"
            name="email"
            type="email"
            inputMode="email"
            defaultValue=""
            placeholder="ornek@sanayipro.com"
            autoComplete="username"
            required
            maxLength={254}
            className="login-input"
          />
        </div>
      </div>

      {/* Şifre Alanı */}
      <div className="login-field">
        <label htmlFor="login-password-fb" className="login-label">
          Şifre
        </label>
        <div className="login-input-wrap">
          <Lock className="login-input-icon" size={18} aria-hidden="true" />
          <input
            id="login-password-fb"
            name="password"
            type="password"
            placeholder="Şifrenizi girin"
            autoComplete="current-password"
            required
            maxLength={1024}
            className="login-input"
          />
        </div>
      </div>

      {/* Beni Hatırla & Hızlı Link */}
      <div className="login-aux-row">
        <label htmlFor="login-remember-fb" className="login-remember">
          <input
            id="login-remember-fb"
            name="remember"
            type="checkbox"
            defaultChecked
            className="login-checkbox"
          />
          <span>Beni hatırla</span>
        </label>
        <Link href="/app" className="login-direct-link" title="Doğrudan panele eriş">
          Doğrudan Panele Geç →
        </Link>
      </div>

      {/* Giriş Butonu */}
      <button
        type="submit"
        className="login-submit-btn"
      >
        <span>Giriş Yap</span>
        <ArrowRight size={18} aria-hidden="true" />
      </button>

      {/* Kayıt Ol Linki */}
      <div className="login-footer-action">
        <span>Hesabınız yok mu?</span>{" "}
        <Link href="/register" className="login-register-link">
          Kayıt Ol →
        </Link>
      </div>
    </form>
  );
}
