"use client";

import { useState } from "react";
import {
  Shield,
  Bell,
  Mail,
  Save,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  RotateCcw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRAINING_TRACKS } from "@/lib/training-data";

export default function SuperAdminSettingsPage() {
  const [saved, setSaved] = useState(false);
  const [warningThreshold, setWarningThreshold] = useState("7");
  const [gracePeriod, setGracePeriod] = useState("3");
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);

  // Demo & Training Mode Settings
  const [demoAccountEnabled, setDemoAccountEnabled] = useState(true);
  const [trainingModeEnabled, setTrainingModeEnabled] = useState(true);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetDemoData = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("sanayipro-training-progress");
        localStorage.removeItem("sanayipro-education-welcome-seen");
      } catch {}
    }
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Platform Sistem Ayarları</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          SanayiPro SaaS abonelik politikası, interaktif eğitim modu, uyarı eşikleri ve iletişim tercihleri.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. DEMO VE İNTERAKTİF EĞİTİM MODU YÖNETİMİ */}
        <div className="sa-panel p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap size={18} className="text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Demo Hesap ve İnteraktif Eğitim Sistemi</h3>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles size={12} /> Canlı Eğitim Modülü
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition cursor-pointer">
              <div>
                <p className="font-bold text-slate-800">Demo Hesap Erişimi (Giriş Ekranı Butonu)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Giriş ekranında &quot;SanayiPro&apos;yu Demo Olarak Dene&quot; kartını gösterir. Müşteriler tek tıkla test ortamını açabilir.
                </p>
              </div>
              <input
                type="checkbox"
                checked={demoAccountEnabled}
                onChange={(e) => setDemoAccountEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/70 transition cursor-pointer">
              <div>
                <p className="font-bold text-slate-800">İnteraktif Adım Adım Rehber Motoru</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Göster → Açıkla → Kullanıcıya Tıklat → İşlemi Yaptır etkileşimli spot ışıklı rehber sistemini aktif tutar.
                </p>
              </div>
              <input
                type="checkbox"
                checked={trainingModeEnabled}
                onChange={(e) => setTrainingModeEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
            </label>
          </div>

          {/* Fabrika Ayarlarına Sıfırlama Butonu */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div>
              <p className="text-xs font-semibold text-slate-800">Demo Veri ve İlerleme Sıfırlama</p>
              <p className="text-[11px] text-slate-500">
                Eğitim ilerlemelerini ve örnek demo oturum durumlarını sıfırlar. Gerçek işletmeleri asla etkilemez.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetDemoData}
              className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <RotateCcw size={13} className="mr-1.5" /> Demo Verilerini Sıfırla
            </Button>
          </div>

          {resetSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-medium flex items-center gap-2">
              <Check size={14} className="text-emerald-600" />
              Demo eğitim ilerlemeleri başarıyla fabrika ayarlarına sıfırlandı.
            </div>
          )}

          {/* Eğitim Bölümleri Durum ve İstatistik Tablosu */}
          <div className="mt-4 pt-3 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Aktif Eğitim Bölümleri (10/10 Hazır)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              {TRAINING_TRACKS.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2 rounded border border-slate-200/80 bg-white">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <span className="font-semibold text-slate-700 truncate">{t.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium flex-shrink-0 ml-2">
                    {t.steps.length} Adım · {t.durationMinutes} dk
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. ABONELİK VE UYARI EŞİKLERİ */}
        <div className="sa-panel p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
            <Bell size={18} className="text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">Abonelik Süre ve Uyarı Eşikleri</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="sa-field-label">
              Erken Uyarı Eşiği (Gün)
              <input
                type="number"
                min="1"
                max="30"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
              />
              <span className="text-[11px] text-slate-500 font-normal">
                Paket bitimine kaç gün kala &quot;Süresi Yaklaşıyor&quot; uyarısı verilsin? (Örn. 7 gün)
              </span>
            </label>

            <label className="sa-field-label">
              Ek Süre / Tolerans (Gün)
              <input
                type="number"
                min="0"
                max="14"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(e.target.value)}
              />
              <span className="text-[11px] text-slate-500 font-normal">
                Süre bittikten sonra panel kilitlenmeden önce tanınan tolerans süresi.
              </span>
            </label>
          </div>
        </div>

        {/* 3. BİLDİRİM KANALLARI */}
        <div className="sa-panel p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
            <Mail size={18} className="text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">Müşteri Hatırlatma Kanalları</h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span>Otomatik E-posta ile Fatura & Yenileme Hatırlatması</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={notifySms}
                onChange={(e) => setNotifySms(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span>SMS ile Bitiş Tarihi Uyarısı Gönderimi (Netgsm / İletiMerkezi)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={notifyWhatsapp}
                onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span>WhatsApp Kurumsal Destek Hattından Hatırlatma Bildirimi</span>
            </label>
          </div>
        </div>

        {/* 4. PLATFORM GÜVENLİK VE ALTYAPI */}
        <div className="sa-panel p-5 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center gap-2">
            <Shield size={18} className="text-purple-600" />
            <h3 className="font-bold text-slate-900 text-sm">Güvenlik ve İzolasyon</h3>
          </div>

          <div className="space-y-2 text-xs text-slate-600">
            <p>
              ✓ <strong>Tenant İzolasyonu:</strong> PostgreSQL Row-Level Security (RLS) ile oto
              servislerin verileri donanımsal ve şema seviyesinde ayrıştırılmıştır.
            </p>
            <p>
              ✓ <strong>Demo Hesap İzolasyonu:</strong> Demo eğitim oturumları gerçek işletmelerden,
              Süper Admin panelinden ve canlı veritabanı yazma yetkilerinden tamamen izole edilmiştir.
            </p>
            <p>
              ✓ <strong>Süper Admin Ayrımı:</strong> Süper admin ve oto servis işletme panelleri
              ayrı route ve rol filtreleriyle korunmaktadır.
            </p>
          </div>
        </div>

        {saved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} /> Sistem ayarları başarıyla güncellendi.
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
            <Save size={16} className="mr-1" /> Değişiklikleri Kaydet
          </Button>
        </div>
      </form>
    </div>
  );
}
