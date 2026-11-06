"use client";

import { useActionState, useState, useMemo } from "react";
import Link from "next/link";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Check,
  Search,
  Wrench,
  Cog,
  Gauge,
  Disc,
  Flame,
  Zap,
  Cpu,
  Snowflake,
  BatteryCharging,
  Hammer,
  Paintbrush,
  Sparkles,
  Layers,
  Shield,
  Scissors,
  KeyRound,
  Radio,
  Wind,
  Thermometer,
  CircleDot,
  Timer,
  Fuel,
} from "lucide-react";
import {
  signInAction,
  startDemoTrialAction,
  startSuperAdminAction,
  startServiceManagerAction,
  startTechnicianAction,
} from "@/app/auth/actions";
import {
  CRAFTSMAN_BRANCHES,
  type CraftsmanBranchId,
  type BranchCategory,
} from "@/lib/branch-profiles";

interface LoginFormProps {
  configured?: boolean;
  redirectTo?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Wrench,
  Cog,
  Gauge,
  Disc,
  Flame,
  Zap,
  Cpu,
  Snowflake,
  BatteryCharging,
  Hammer,
  Paintbrush,
  Sparkles,
  Layers,
  Shield,
  Scissors,
  KeyRound,
  Radio,
  Wind,
  Thermometer,
  CircleDot,
  Timer,
  Fuel,
};

const CATEGORIES: Array<{ id: "ALL" | BranchCategory; label: string }> = [
  { id: "ALL", label: "Tümü (23)" },
  { id: "Mekanik & Güç Aktarma", label: "Mekanik (9)" },
  { id: "Elektrik & Elektronik", label: "Elektrik (6)" },
  { id: "Gövde, Boya & Cam", label: "Gövde & Boya (6)" },
  { id: "Donanım, Lastik & Bakım", label: "Donanım & Bakım (2)" },
];

export function LoginForm({
  configured: _configured = true,
  redirectTo,
}: LoginFormProps) {
  void _configured;
  const [state, action, pending] = useActionState(signInAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const [demoPending, setDemoPending] = useState(false);

  // Branch demo selection
  const [selectedBranchId, setSelectedBranchId] = useState<CraftsmanBranchId>("motor-mekanik");
  const [branchSearch, setBranchSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"ALL" | BranchCategory>("ALL");

  // Standard account credentials
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");

  const handlePasswordReset = () => {
    const cleaned = resetEmail.trim().toLowerCase();
    if (!cleaned || !cleaned.includes("@")) {
      setResetError("Lütfen kayıtlı e-posta adresinizi doğru biçimde girin.");
      setResetMessage("");
      return;
    }
    setResetError("");
    setResetMessage(
      `${cleaned} adresine şifre sıfırlama bağlantısı gönderildi. E-posta kutunuzu kontrol edin.`,
    );
  };

  const filteredBranches = useMemo(() => {
    return CRAFTSMAN_BRANCHES.filter((b) => {
      const matchesCategory =
        selectedCategory === "ALL" || b.category === selectedCategory;
      const q = branchSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        b.name.toLowerCase().includes(q) ||
        b.craftsmanTitle.toLowerCase().includes(q) ||
        b.shortDesc.toLowerCase().includes(q) ||
        b.businessName.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [branchSearch, selectedCategory]);

  const selectedBranch = useMemo(() => {
    return (
      CRAFTSMAN_BRANCHES.find((b) => b.id === selectedBranchId) ??
      CRAFTSMAN_BRANCHES[0]
    );
  }, [selectedBranchId]);

  const SelectedIcon = ICON_MAP[selectedBranch.icon] ?? Wrench;

  const handleStartBranchDemo = async () => {
    setDemoPending(true);
    try {
      await startDemoTrialAction(selectedBranch.id, redirectTo);
    } catch (err) {
      if (String(err).includes("NEXT_REDIRECT")) throw err;
    } finally {
      setDemoPending(false);
    }
  };

  const handleFillDemoCreds = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  const [directRolePending, setDirectRolePending] = useState<"superadmin" | "manager" | "technician" | null>(null);

  const handleDirectSuperAdmin = async () => {
    setDirectRolePending("superadmin");
    try {
      await startSuperAdminAction(redirectTo);
    } catch (err) {
      if (String(err).includes("NEXT_REDIRECT")) throw err;
    } finally {
      setDirectRolePending(null);
    }
  };

  const handleDirectManager = async () => {
    setDirectRolePending("manager");
    try {
      await startServiceManagerAction(redirectTo);
    } catch (err) {
      if (String(err).includes("NEXT_REDIRECT")) throw err;
    } finally {
      setDirectRolePending(null);
    }
  };

  const handleDirectTechnician = async () => {
    setDirectRolePending("technician");
    try {
      await startTechnicianAction(redirectTo);
    } catch (err) {
      if (String(err).includes("NEXT_REDIRECT")) throw err;
    } finally {
      setDirectRolePending(null);
    }
  };

  return (
    <form action={action} className="login-form" noValidate={false}>
      <input type="hidden" name="redirectTo" value={redirectTo || ""} />

      {/* ==================================================================
          1-TIKLA DOĞRUDAN PANEL GİRİŞLERİ (SÜPER ADMİN vs SERVİS YÖNETİCİSİ)
          SSR-READY & HYDRATION PROOF: Anında Görünür, Sıfır Layout Shift
          ================================================================== */}
      <div className="login-direct-group">
        <button
          type="button"
          onClick={handleDirectSuperAdmin}
          disabled={directRolePending !== null || pending}
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
          {directRolePending === "superadmin" ? (
            <Loader2 className="login-spinner text-purple-700" size={16} />
          ) : (
            <ArrowRight size={16} className="text-purple-700" />
          )}
        </button>

        <button
          type="button"
          onClick={handleDirectManager}
          disabled={directRolePending !== null || pending}
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
          {directRolePending === "manager" ? (
            <Loader2 className="login-spinner text-blue-700" size={16} />
          ) : (
            <ArrowRight size={16} className="text-blue-700" />
          )}
        </button>

        <button
          type="button"
          onClick={handleDirectTechnician}
          disabled={directRolePending !== null || pending}
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
          {directRolePending === "technician" ? (
            <Loader2 className="login-spinner text-emerald-700" size={16} />
          ) : (
            <ArrowRight size={16} className="text-emerald-700" />
          )}
        </button>
      </div>

      <div className="login-divider" aria-hidden="true">
        <span>veya 23 usta branşına göre deneyin</span>
      </div>

      {/* ==================================================================
          SANAYİPRO'YU MESLEĞİNİZE GÖRE DENEYİN (23 USTA BRANŞINA ÖZEL DEMO)
          ================================================================== */}
      <div className="login-branch-demo-card">
        <div className="login-branch-demo-top">
          <div className="login-branch-demo-tag">
            <Sparkles size={14} className="text-amber-500" aria-hidden="true" />
            <span>23 USTA BRANŞINA ÖZEL DENEYİM</span>
          </div>
          <span className="login-branch-demo-pill">İzole Atölye Demosu</span>
        </div>

        <div className="login-branch-demo-heading">
          <strong>SanayiPro&apos;yu Mesleğinize Göre Deneyin</strong>
          <p>
            Uzmanlık alanınızı seçin, SanayiPro&apos;nun sizin işinizde nasıl çalıştığını görün.
          </p>
        </div>

        {/* Branş Arama & Kategori Filtresi */}
        <div className="login-branch-search-bar">
          <Search size={15} className="login-branch-search-icon" aria-hidden="true" />
          <input
            type="search"
            value={branchSearch}
            onChange={(e) => setBranchSearch(e.target.value)}
            placeholder="Branş veya meslek ara... (örn: Motor, Şanzıman, Lastik, Boya)"
            className="login-branch-search-input"
            aria-label="Usta branşı ara"
          />
        </div>

        <div className="login-branch-category-tabs" role="tablist" aria-label="Branş Kategorileri">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`login-branch-category-btn ${
                selectedCategory === cat.id ? "is-active" : ""
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 23 Branş Seçici (Kompakt ve Hızlı) */}
        <div
          className="login-branch-grid"
          role="radiogroup"
          aria-label="SanayiPro Usta Branşları"
        >
          {filteredBranches.map((branch) => {
            const Icon = ICON_MAP[branch.icon] ?? Wrench;
            const isSelected = selectedBranchId === branch.id;

            return (
              <button
                key={branch.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedBranchId(branch.id)}
                className={`login-branch-item ${isSelected ? "is-selected" : ""}`}
                title={`${branch.name} — ${branch.craftsmanTitle}`}
              >
                <span className="login-branch-item-icon">
                  <Icon size={15} />
                </span>
                <span className="login-branch-item-name">{branch.name}</span>
                {isSelected && (
                  <span className="login-branch-item-check" aria-hidden="true">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
          {filteredBranches.length === 0 && (
            <div className="login-branch-empty">
              <span>Aradığınız kriterde branş bulunamadı.</span>
            </div>
          )}
        </div>

        {/* Seçili Branş Özeti */}
        <div className="login-branch-preview">
          <div className="login-branch-preview-header">
            <div className="login-branch-preview-icon">
              <SelectedIcon size={20} />
            </div>
            <div className="login-branch-preview-titles">
              <span className="login-branch-preview-title">
                {selectedBranch.name} · {selectedBranch.craftsmanTitle}
              </span>
              <span className="login-branch-preview-biz">
                Örnek Atölye: <strong>{selectedBranch.businessName}</strong>
              </span>
            </div>
          </div>
          <p className="login-branch-preview-desc">
            {selectedBranch.shortDesc}
          </p>
        </div>

        {/* Dinamik Branş Giriş Butonu */}
        <button
          type="button"
          onClick={handleStartBranchDemo}
          disabled={demoPending || pending}
          className="login-branch-demo-action-btn"
        >
          {demoPending ? (
            <>
              <Loader2 className="login-spinner" size={17} aria-hidden="true" />
              <span>{selectedBranch.craftsmanTitle} Demosu Hazırlanıyor…</span>
            </>
          ) : (
            <>
              <span className="truncate">
                {selectedBranch.craftsmanTitle} Demosuna Gir
              </span>
              <ArrowRight size={17} aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      <div className="login-divider" aria-hidden="true">
        <span>veya kayıtlı işletmenizle giriş yapın</span>
      </div>

      {/* Hızlı Demo Giriş Kısayolları (Opsiyonel Kolaylık) */}
      <div className="login-creds-quick-links">
        <span className="login-creds-hint">Hızlı doldur:</span>
        <button
          type="button"
          className="login-creds-pill"
          style={
            email === "superadmin@sanayipro.com"
              ? { borderColor: "#a855f7", color: "#6b21a8", background: "#f3e8ff", fontWeight: 700 }
              : { borderColor: "#d8b4fe", color: "#7e22ce", background: "#faf5ff" }
          }
          onClick={() => handleFillDemoCreds("superadmin@sanayipro.com", "sanayipro_admin")}
          title="SaaS Platformu: Abonelikler, Paketler, İşletmeler ve Ödemeler"
        >
          👑 Süper Admin
        </button>
        <button
          type="button"
          className="login-creds-pill"
          style={email === "admin@sanayipro.com" ? { borderColor: "#3b82f6", color: "#1d4ed8", background: "#eff6ff", fontWeight: 700 } : undefined}
          onClick={() => handleFillDemoCreds("admin@sanayipro.com", "sanayipro_admin")}
          title="Oto Servis Paneli: İş Emirleri, Araç Kabul & Kasa"
        >
          🏢 Servis Yöneticisi
        </button>
        <button
          type="button"
          className="login-creds-pill"
          style={email === "mehmet.usta@sanayipro.com" ? { borderColor: "#10b981", color: "#047857", background: "#ecfdf5", fontWeight: 700 } : undefined}
          onClick={() => handleFillDemoCreds("mehmet.usta@sanayipro.com", "sanayipro_usta")}
          title="Atölye Masası: Tamir & Usta Ekranı"
        >
          🔧 Usta Girişi
        </button>
      </div>

      {email === "superadmin@sanayipro.com" && (
        <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 8, padding: "8px 12px", fontSize: "12px", color: "#6b21a8", marginTop: "8px", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Sparkles size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Süper Admin (Platform) Paneli</strong>
            <p style={{ margin: "2px 0 0 0", color: "#7e22ce", fontSize: "11.5px" }}>
              Giriş yaptığınızda <strong>Abonelikler, Kayıtlı İşletmeler, Paketler ve Ödeme Yönetimi</strong> ekranına yönlendirileceksiniz.
            </p>
          </div>
        </div>
      )}
      {email === "admin@sanayipro.com" && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "8px 12px", fontSize: "12px", color: "#1e40af", marginTop: "8px", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Wrench size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Oto Servis Yönetim Paneli</strong>
            <p style={{ margin: "2px 0 0 0", color: "#1d4ed8", fontSize: "11.5px" }}>
              Giriş yaptığınızda servisinizin <strong>İş Emirleri, Araç Kabul, Müşteriler, Kasa ve Stok</strong> ekranına yönlendirileceksiniz.
            </p>
          </div>
        </div>
      )}

      {/* E-posta Alanı */}
      <div className="login-field">
        <label htmlFor="login-email" className="login-label">
          E-posta
        </label>
        <div className="login-input-wrap">
          <Mail className="login-input-icon" size={18} aria-hidden="true" />
          <input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@sanayipro.com"
            autoComplete="username"
            required
            maxLength={254}
            disabled={pending}
            aria-invalid={!!state?.error}
            aria-describedby={state?.error ? "login-error-msg" : undefined}
            className="login-input"
          />
        </div>
      </div>

      {/* Şifre Alanı */}
      <div className="login-field">
        <div className="login-label-row">
          <label htmlFor="login-password" className="login-label">
            Şifre
          </label>
          <button
            type="button"
            className="login-forgot-btn"
            onClick={() => {
              setResetEmail(email);
              setResetError("");
              setResetMessage("");
              setResetOpen((prev) => !prev);
            }}
          >
            Şifremi Unuttum
          </button>
        </div>
        <div className="login-input-wrap">
          <Lock className="login-input-icon" size={18} aria-hidden="true" />
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifrenizi girin"
            autoComplete="current-password"
            required
            maxLength={1024}
            disabled={pending}
            aria-invalid={!!state?.error}
            aria-describedby={state?.error ? "login-error-msg" : undefined}
            className="login-input"
          />
          <button
            type="button"
            className="login-toggle-password"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            tabIndex={0}
          >
            {showPassword ? (
              <EyeOff size={18} aria-hidden="true" />
            ) : (
              <Eye size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Beni Hatırla & Hızlı Link */}
      <div className="login-aux-row">
        <label htmlFor="login-remember" className="login-remember">
          <input
            id="login-remember"
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

      {/* Şifre Sıfırlama Paneli */}
      {resetOpen && (
        <div className="login-reset-panel" role="region" aria-label="Şifre Sıfırlama">
          <div className="login-reset-head">
            <strong>Şifre Sıfırlama</strong>
            <button
              type="button"
              className="login-reset-close"
              onClick={() => setResetOpen(false)}
              aria-label="Şifre sıfırlamayı kapat"
            >
              Kapat
            </button>
          </div>
          <p className="login-reset-desc">
            Kayıtlı e-posta adresinizi girin, şifre sıfırlama bağlantısını hemen gönderelim.
          </p>
          <div className="login-input-wrap">
            <Mail className="login-input-icon" size={18} aria-hidden="true" />
            <input
              type="email"
              inputMode="email"
              value={resetEmail}
              onChange={(e) => {
                setResetEmail(e.target.value);
                if (resetError) setResetError("");
              }}
              placeholder="ornek@sanayipro.com"
              className="login-input"
              aria-label="Şifre sıfırlama e-posta adresi"
            />
          </div>
          {resetError && (
            <p className="login-reset-error" role="alert">
              {resetError}
            </p>
          )}
          {resetMessage && (
            <p className="login-reset-success" role="status">
              {resetMessage}
            </p>
          )}
          <button
            type="button"
            onClick={handlePasswordReset}
            className="login-reset-submit-btn"
          >
            Sıfırlama Bağlantısı Gönder
          </button>
        </div>
      )}

      {/* Hata Bildirimi */}
      {state?.error && (
        <div
          id="login-error-msg"
          role="alert"
          aria-live="polite"
          className="login-error-alert"
        >
          <AlertCircle className="login-error-icon" size={18} aria-hidden="true" />
          <span>{state.error}</span>
        </div>
      )}

      {/* Giriş Butonu */}
      <button
        type="submit"
        disabled={pending}
        className="login-submit-btn"
        aria-busy={pending}
      >
        {pending ? (
          <>
            <Loader2 className="login-spinner" size={18} aria-hidden="true" />
            <span>Giriş yapılıyor…</span>
          </>
        ) : (
          <>
            <span>Giriş Yap</span>
            <ArrowRight size={18} aria-hidden="true" />
          </>
        )}
      </button>

      {/* Kayıt Ol Linki */}
      <div className="login-footer-action">
        <span>Hesabınız yok mu?</span>{" "}
        <Link href="/register" className="login-register-link">
          Kayıt Ol →
        </Link>
      </div>

      {/* Demo Talep Et CTA */}
      <div className="login-divider" aria-hidden="true">
        <span>veya</span>
      </div>

      <Link href="/#demo-form" className="login-demo-btn">
        Özel Demo ve Tanıtım Talep Et
      </Link>
    </form>
  );
}
