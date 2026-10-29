"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  MapPin,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { signUpAction } from "@/app/auth/actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUpAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [branchName, setBranchName] = useState("");

  if (state?.emailConfirmationRequired) {
    return (
      <div className="register-confirmation-card">
        <div className="register-confirmation-icon">
          <CheckCircle2 size={36} className="text-emerald-500" />
        </div>
        <h3 className="register-confirmation-title">
          E-posta Doğrulaması Gönderildi
        </h3>
        <p className="register-confirmation-desc">
          {state.message ||
            "E-posta adresinize doğrulama bağlantısı gönderdik. Lütfen gelen kutunuzu kontrol edin ve bağlantıya tıklayarak hesabınızı aktif edin."}
        </p>
        <Link href="/login" className="register-back-login-btn">
          Giriş Yap Ekranına Dön
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="register-form" noValidate={false}>
      {/* İsim & Soyisim */}
      <div className="register-field">
        <label htmlFor="reg-fullname" className="register-label">
          Ad Soyad
        </label>
        <div className="register-input-wrap">
          <User className="register-input-icon" size={18} aria-hidden="true" />
          <input
            id="reg-fullname"
            name="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Örn: Ahmet Yılmaz"
            autoComplete="name"
            required
            maxLength={100}
            disabled={pending}
            className="register-input"
          />
        </div>
      </div>

      {/* E-posta */}
      <div className="register-field">
        <label htmlFor="reg-email" className="register-label">
          E-posta
        </label>
        <div className="register-input-wrap">
          <Mail className="register-input-icon" size={18} aria-hidden="true" />
          <input
            id="reg-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ahmet@yilmazoto.com"
            autoComplete="email"
            required
            maxLength={254}
            disabled={pending}
            className="register-input"
          />
        </div>
      </div>

      {/* Şifre ve Şifre Tekrar (Yan yana veya grid) */}
      <div className="register-grid-2">
        <div className="register-field">
          <label htmlFor="reg-password" className="register-label">
            Şifre
          </label>
          <div className="register-input-wrap">
            <Lock className="register-input-icon" size={18} aria-hidden="true" />
            <input
              id="reg-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="En az 8 karakter"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={1024}
              disabled={pending}
              className="register-input"
            />
            <button
              type="button"
              className="register-toggle-password"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="register-field">
          <label htmlFor="reg-confirm" className="register-label">
            Şifre Tekrar
          </label>
          <div className="register-input-wrap">
            <Lock className="register-input-icon" size={18} aria-hidden="true" />
            <input
              id="reg-confirm"
              name="passwordConfirm"
              type={showConfirm ? "text" : "password"}
              placeholder="Şifreyi tekrar yazın"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={1024}
              disabled={pending}
              className="register-input"
            />
            <button
              type="button"
              className="register-toggle-password"
              onClick={() => setShowConfirm((p) => !p)}
              aria-label={showConfirm ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* İşletme ve İlk Şube */}
      <div className="register-grid-2">
        <div className="register-field">
          <label htmlFor="reg-org" className="register-label">
            İşletme Adı
          </label>
          <div className="register-input-wrap">
            <Building2 className="register-input-icon" size={18} aria-hidden="true" />
            <input
              id="reg-org"
              name="organizationName"
              type="text"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Örn: Yılmaz Oto Servis"
              required
              maxLength={120}
              disabled={pending}
              className="register-input"
            />
          </div>
        </div>

        <div className="register-field">
          <label htmlFor="reg-branch" className="register-label">
            İlk Şube Adı
          </label>
          <div className="register-input-wrap">
            <MapPin className="register-input-icon" size={18} aria-hidden="true" />
            <input
              id="reg-branch"
              name="branchName"
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Örn: Merkez Şube"
              required
              maxLength={120}
              disabled={pending}
              className="register-input"
            />
          </div>
        </div>
      </div>

      {/* Hata Bildirimi */}
      {state?.error && (
        <div role="alert" className="register-error-alert" aria-live="polite">
          <AlertCircle className="register-error-icon" size={18} aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Kayıt Ol Butonu */}
      <button
        type="submit"
        disabled={pending}
        className="register-submit-btn"
        aria-busy={pending}
      >
        {pending ? (
          <>
            <Loader2 className="register-spinner" size={18} aria-hidden="true" />
            <span>Hesap oluşturuluyor…</span>
          </>
        ) : (
          <>
            <span>İşletme Hesabı Oluştur</span>
            <ArrowRight size={18} aria-hidden="true" />
          </>
        )}
      </button>

      {/* Giriş Yap Linki */}
      <div className="register-footer-action">
        <span>Zaten bir hesabınız var mı?</span>{" "}
        <Link href="/login" className="register-login-link">
          Giriş Yap →
        </Link>
      </div>
    </form>
  );
}
