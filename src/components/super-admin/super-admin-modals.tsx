"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSuperAdmin } from "@/lib/super-admin-provider";
import {
  Building2,
  CreditCard,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface NewBusinessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: (businessId: string) => void;
}

export function NewBusinessModal({ open, onOpenChange, onCompleted }: NewBusinessModalProps) {
  const { packages, createBusiness } = useSuperAdmin();
  const [selectedPkg, setSelectedPkg] = useState<string>("pkg-pro");
  const [durationChoice, setDurationChoice] = useState<string>("365");
  const [customDays, setCustomDays] = useState<string>("30");
  const [startDate, setStartDate] = useState<string>("2026-10-27");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    const ownerName = String(form.get("ownerName") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const email = String(form.get("email") || "").trim();
    const address = String(form.get("address") || "").trim();
    const city = String(form.get("city") || "").trim();
    const district = String(form.get("district") || "").trim();
    const loginEmail = String(form.get("loginEmail") || email).trim();

    if (!name || !ownerName || !phone) {
      setError("Lütfen zorunlu alanları (İşletme Adı, Yetkili Adı, Telefon) doldurun.");
      return;
    }

    const days = durationChoice === "custom" ? Number(customDays) || 30 : Number(durationChoice);

    const created = createBusiness({
      name,
      ownerName,
      phone,
      email,
      address,
      city,
      district,
      loginEmail,
      packageId: selectedPkg,
      startDate,
      days,
    });

    onOpenChange(false);
    if (onCompleted) onCompleted(created.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900">
          <Building2 className="text-purple-600" size={20} /> Yeni Oto Servis İşletmesi Ekle
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500 mb-2">
          SanayiPro platformuna yeni bir oto servis hesabı tanımlayın ve paket süresi verin.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. İŞLETME BİLGİLERİ */}
          <div className="border-b border-slate-200 pb-3">
            <h4 className="sa-form-section-title">1. İşletme Bilgileri</h4>
            <div className="sa-form-grid">
              <label className="sa-field-label">
                İşletme Adı *
                <input name="name" required placeholder="Örn. Yılmaz Oto Servis" autoFocus />
              </label>
              <label className="sa-field-label">
                Yetkili / Usta Ad Soyad *
                <input name="ownerName" required placeholder="Örn. Mehmet Yılmaz" />
              </label>
              <label className="sa-field-label">
                İletişim Telefonu *
                <input name="phone" required placeholder="0532 XXX XX XX" />
              </label>
              <label className="sa-field-label">
                İşletme E-postası
                <input name="email" type="email" placeholder="servis@example.com" />
              </label>
              <label className="sa-field-label">
                İl
                <input name="city" defaultValue="Hatay" placeholder="Örn. Hatay" />
              </label>
              <label className="sa-field-label">
                İlçe
                <input name="district" defaultValue="Dörtyol" placeholder="Örn. Dörtyol" />
              </label>
              <label className="sa-field-label sa-form-full">
                Adres
                <input name="address" placeholder="Sanayi Sitesi No / Blok" />
              </label>
            </div>
          </div>

          {/* 2. HESAP GİRİŞİ */}
          <div className="border-b border-slate-200 pb-3">
            <h4 className="sa-form-section-title">2. Yönetici Hesap Bilgileri</h4>
            <div className="sa-form-grid">
              <label className="sa-field-label">
                Giriş E-postası
                <input name="loginEmail" type="email" placeholder="admin@servis.com" />
              </label>
              <label className="sa-field-label">
                Geçici Şifre
                <input name="tempPassword" type="password" defaultValue="sanayipro_2026" />
              </label>
            </div>
          </div>

          {/* 3. PAKET VE SÜRE */}
          <div>
            <h4 className="sa-form-section-title">3. Paket ve Abonelik Süresi</h4>
            <div className="sa-form-grid">
              <label className="sa-field-label">
                Abonelik Paketi
                <select
                  value={selectedPkg}
                  onChange={(e) => setSelectedPkg(e.target.value)}
                >
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({pkg.description})
                    </option>
                  ))}
                </select>
              </label>

              <label className="sa-field-label">
                Başlangıç Tarihi
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>

              <label className="sa-field-label sa-form-full">
                Süre Seçimi
                <div className="flex gap-2 flex-wrap mt-1">
                  {[
                    { label: "30 Gün (1 Ay)", value: "30" },
                    { label: "90 Gün (3 Ay)", value: "90" },
                    { label: "180 Gün (6 Ay)", value: "180" },
                    { label: "365 Gün (1 Yıl)", value: "365" },
                    { label: "Özel Süre", value: "custom" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${
                        durationChoice === item.value
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                      onClick={() => setDurationChoice(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </label>

              {durationChoice === "custom" && (
                <label className="sa-field-label sa-form-full">
                  Özel Gün Sayısı
                  <input
                    type="number"
                    min="1"
                    max="1825"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    placeholder="Kaç gün verilecek?"
                  />
                </label>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Vazgeç
              </Button>
            </DialogClose>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              <CheckCircle2 size={16} className="mr-1" /> İşletmeyi ve Paketi Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ExtendSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId?: string;
}

export function ExtendSubscriptionModal({
  open,
  onOpenChange,
  businessId,
}: ExtendSubscriptionModalProps) {
  const { businesses, extendSubscription } = useSuperAdmin();
  const [selectedBizId, setSelectedBizId] = useState<string>(businessId || "");
  const [daysChoice, setDaysChoice] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>("45");
  const [note, setNote] = useState<string>("Süper Admin paket uzatma işlemi");
  const [isCustom, setIsCustom] = useState(false);

  // Sync selected business when prop changes
  const activeBizId = businessId || selectedBizId || businesses[0]?.id;
  const currentBiz = businesses.find((b) => b.id === activeBizId);

  // Calculate projected new end date
  const addedDays = isCustom ? Number(customDays) || 30 : daysChoice;
  const projectedEnd = (() => {
    if (!currentBiz) return "";
    const base = new Date(currentBiz.endDate);
    const today = new Date("2026-10-27");
    const eff = base > today ? base : today;
    const n = new Date(eff);
    n.setDate(n.getDate() + addedDays);
    return n.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  })();

  const handleExtend = (e: FormEvent) => {
    e.preventDefault();
    if (!activeBizId) return;
    extendSubscription(activeBizId, addedDays, note);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
          <RefreshCw className="text-purple-600" size={18} /> Paket Süresi Uzat
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500 mb-3">
          Mevcut bitiş tarihine ek gün ilave ederek paketi anında uzatın.
        </DialogDescription>

        <form onSubmit={handleExtend} className="space-y-4">
          {!businessId && (
            <label className="sa-field-label">
              İşletme Seç
              <select
                value={activeBizId}
                onChange={(e) => setSelectedBizId(e.target.value)}
              >
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city}/{b.district}) · Bitiş: {b.endDate}
                  </option>
                ))}
              </select>
            </label>
          )}

          {currentBiz && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-900">
              <div className="flex justify-between font-semibold mb-1">
                <span>{currentBiz.name}</span>
                <span>{currentBiz.packageName}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Mevcut Bitiş Tarihi:</span>
                <strong>{currentBiz.endDate}</strong>
              </div>
            </div>
          )}

          <div>
            <label className="sa-field-label mb-2">Eklenecek Süre</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "+30 Gün", days: 30 },
                { label: "+90 Gün", days: 90 },
                { label: "+180 Gün", days: 180 },
                { label: "+365 Gün", days: 365 },
              ].map((btn) => (
                <button
                  key={btn.days}
                  type="button"
                  className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all ${
                    !isCustom && daysChoice === btn.days
                      ? "bg-purple-600 text-white border-purple-600 shadow"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                  onClick={() => {
                    setIsCustom(false);
                    setDaysChoice(btn.days);
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <div className="mt-2">
              <button
                type="button"
                className={`text-xs font-semibold underline ${isCustom ? "text-purple-700 font-bold" : "text-slate-500"}`}
                onClick={() => setIsCustom(!isCustom)}
              >
                {isCustom ? "Standart Sürelere Dön" : "Özel gün sayısı belirle"}
              </button>
              {isCustom && (
                <input
                  type="number"
                  min="1"
                  max="1825"
                  className="mt-2 w-full h-9 px-3 border border-slate-300 rounded-lg text-sm"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="Kaç gün uzatılacak?"
                />
              )}
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex justify-between items-center">
            <span>Yeni Bitiş Tarihi:</span>
            <strong className="text-sm text-emerald-700 font-black">{projectedEnd}</strong>
          </div>

          <label className="sa-field-label">
            İşlem Notu (Opsiyonel)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn. Havale ile 3 aylık yenileme tahsilatı"
            />
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              Paketi +{addedDays} Gün Uzat
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RecordPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId?: string;
}

export function RecordPaymentModal({
  open,
  onOpenChange,
  businessId,
}: RecordPaymentModalProps) {
  const { businesses, recordPayment } = useSuperAdmin();
  const [selectedBizId, setSelectedBizId] = useState<string>(businessId || businesses[0]?.id || "");
  const [amount, setAmount] = useState<string>("4490");
  const [method, setMethod] = useState<"Havale/EFT" | "Kredi Kartı" | "Nakit" | "Diğer">("Havale/EFT");
  const [paymentDate, setPaymentDate] = useState<string>("2026-10-27");
  const [status, setStatus] = useState<"COMPLETED" | "PENDING">("COMPLETED");
  const [note, setNote] = useState<string>("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBizId) return;

    recordPayment({
      businessId: selectedBizId,
      amount: Number(amount) || 0,
      paymentDate,
      paymentMethod: method,
      status,
      notes: note,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
          <CreditCard className="text-purple-600" size={18} /> Platform Abonelik Tahsilatı Kaydet
        </DialogTitle>
        <DialogDescription className="text-xs text-slate-500 mb-3">
          Oto servisin SanayiPro platformuna yaptığı abonelik ödemesini kaydedin.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="sa-field-label">
            İşletme
            <select
              value={selectedBizId}
              onChange={(e) => setSelectedBizId(e.target.value)}
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.packageName}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="sa-field-label">
              Tutar (₺)
              <input
                type="number"
                step="10"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="sa-field-label">
              Ödeme Tarihi
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="sa-field-label">
              Ödeme Yöntemi
              <select
                value={method}
                onChange={(e) =>
                  setMethod(
                    e.target.value as "Havale/EFT" | "Kredi Kartı" | "Nakit" | "Diğer",
                  )
                }
              >
                <option value="Havale/EFT">Havale / EFT</option>
                <option value="Kredi Kartı">Kredi Kartı</option>
                <option value="Nakit">Nakit</option>
                <option value="Diğer">Diğer</option>
              </select>
            </label>
            <label className="sa-field-label">
              Tahsilat Durumu
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "COMPLETED" | "PENDING")
                }
              >
                <option value="COMPLETED">Tahsil Edildi (Tamamlandı)</option>
                <option value="PENDING">Ödeme Bekliyor</option>
              </select>
            </label>
          </div>

          <label className="sa-field-label">
            Açıklama / Dekont Notu
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Örn. Akbank dekont no: 88219"
            />
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                İptal
              </Button>
            </DialogClose>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
              Ödemeyi Kaydet
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
