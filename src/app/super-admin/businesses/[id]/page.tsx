"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  Lock,
  Phone,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuperAdmin } from "@/lib/super-admin-provider";
import {
  calculateRemainingDays,
  calculateBusinessStatus,
  STATUS_LABELS,
} from "@/lib/super-admin-data";
import {
  ExtendSubscriptionModal,
  RecordPaymentModal,
} from "@/components/super-admin/super-admin-modals";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export default function BusinessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const {
    getBusinessById,
    packages,
    extensionLogs,
    payments,
    changePackage,
    toggleSuspension,
  } = useSuperAdmin();

  const business = getBusinessById(id);

  const [extendOpen, setExtendOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [changePkgOpen, setChangePkgOpen] = useState(false);
  const [newPackageId, setNewPackageId] = useState(business?.packageId || "");

  if (!business) {
    return (
      <div className="sa-panel p-10 text-center space-y-4">
        <Building2 size={40} className="mx-auto text-slate-300" />
        <h2 className="text-lg font-bold text-slate-900">İşletme Kaydı Bulunamadı</h2>
        <p className="text-xs text-slate-500">Aradığınız işletme silinmiş veya mevcut değil.</p>
        <Button asChild>
          <Link href="/super-admin/businesses">İşletmelere Dön</Link>
        </Button>
      </div>
    );
  }

  const remainingDays = calculateRemainingDays(business.endDate);
  const status = calculateBusinessStatus(business.endDate, business.isSuspended);
  const isExpired = remainingDays <= 0;

  // Filter logs & payments for this business
  const businessLogs = extensionLogs.filter((l) => l.businessId === business.id);
  const businessPayments = payments.filter((p) => p.businessId === business.id);

  const handlePackageChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPackageId) {
      changePackage(business.id, newPackageId);
      setChangePkgOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ÜST GEZİNME VE BAŞLIK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild className="h-9">
            <Link href="/super-admin/businesses">
              <ArrowLeft size={16} className="mr-1" /> İşletmeler
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">{business.name}</h1>
              <span className={`sa-badge ${STATUS_LABELS[status].badgeClass}`}>
                {STATUS_LABELS[status].label}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>{business.city} / {business.district}</span>
              <span>·</span>
              <span>Kayıt: {business.createdAt}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setExtendOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            <RefreshCw size={15} className="mr-1" /> Paketi Uzat
          </Button>
          <Button
            variant="outline"
            onClick={() => setPaymentOpen(true)}
            className="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <CreditCard size={15} className="mr-1 text-slate-500" /> Ödeme Kaydet
          </Button>
        </div>
      </div>

      {/* 3 TEMEL BLOK: İŞLETME BİLGİSİ / PAKET VE ABONELİK / HESAP DURUMU */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BLOK 1: İŞLETME BİLGİLERİ */}
        <div className="sa-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 size={15} className="text-purple-600" /> İşletme Bilgileri
            </h3>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              Oto Servis
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Yetkili / Usta</span>
              <strong className="text-sm font-semibold text-slate-900 block mt-0.5">
                {business.ownerName}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Telefon</span>
              <a
                href={`tel:${business.phone}`}
                className="text-sm font-semibold text-purple-700 hover:underline flex items-center gap-1 mt-0.5"
              >
                <Phone size={13} /> {business.phone}
              </a>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Konum</span>
              <span className="text-slate-800 font-semibold block mt-0.5">
                {business.city} / {business.district}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Adres</span>
              <p className="text-slate-700 mt-0.5 leading-relaxed">
                {business.address || "Adres bilgisi girilmedi."}
              </p>
            </div>
          </div>
        </div>

        {/* BLOK 2: PAKET VE ABONELİK */}
        <div className="sa-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={15} className="text-emerald-600" /> Paket ve Abonelik
            </h3>
            <span
              className={`sa-days-pill ${
                isExpired ? "days-danger" : remainingDays <= 3 ? "days-warning" : "days-safe"
              }`}
            >
              {isExpired ? "Süresi Bitti" : `${remainingDays} Gün Kaldı`}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
              <span className="text-slate-500 block text-[11px]">Mevcut Paket</span>
              <strong className="text-base font-extrabold text-purple-900 block mt-0.5">
                {business.packageName}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Başlangıç</span>
                <strong className="text-slate-800 font-bold block mt-0.5">
                  {business.startDate}
                </strong>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Bitiş Tarihi</span>
                <strong className="text-slate-800 font-bold block mt-0.5">
                  {business.endDate}
                </strong>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs"
                onClick={() => setExtendOpen(true)}
              >
                <RefreshCw size={12} className="mr-1" /> Paketi Uzat
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-semibold"
                onClick={() => setChangePkgOpen(true)}
              >
                Paket Değiştir
              </Button>
            </div>
          </div>
        </div>

        {/* BLOK 3: HESAP VE GÜVENLİK */}
        <div className="sa-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock size={15} className="text-blue-600" /> Hesap ve Yetki
            </h3>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                business.isSuspended
                  ? "bg-red-100 text-red-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {business.isSuspended ? "Askıda" : "Aktif"}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Giriş E-postası</span>
              <strong className="text-slate-900 font-mono text-xs block mt-0.5">
                {business.loginEmail}
              </strong>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Hesap Açılış Tarihi</span>
              <span className="text-slate-800 font-medium block mt-0.5">{business.createdAt}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Tahsilat Durumu</span>
              {business.paymentPending ? (
                <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-0.5">
                  Abonelik Ödemesi Bekliyor ({business.pendingAmount ? `₺${business.pendingAmount}` : ""})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold mt-0.5">
                  <CheckCircle2 size={13} /> Güncel / Borç Yok
                </span>
              )}
            </div>

            <div className="pt-2">
              <Button
                size="sm"
                variant={business.isSuspended ? "default" : "outline"}
                className={`w-full text-xs font-bold ${
                  business.isSuspended
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                }`}
                onClick={() => toggleSuspension(business.id)}
              >
                {business.isSuspended ? "Hesap Askısını Kaldır (Aktifleştir)" : "Hesabı Askıya Al"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* BLOK 4: GEÇMİŞ PAKET HAREKETLERİ & UZATMALAR */}
      <div className="sa-panel">
        <div className="sa-panel-header">
          <div className="sa-panel-title">
            <h2>Geçmiş Paket Uzatma Hareketleri</h2>
            <p>Kim uzattı, ne zaman uzattı ve kaç gün süre verildi kayıtları</p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {businessLogs.length} İşlem Kaydı
          </span>
        </div>

        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>İşlem Tarihi</th>
                <th>Verilen Gün</th>
                <th>Önceki Bitiş</th>
                <th>Yeni Bitiş</th>
                <th>İşlemi Yapan</th>
                <th>Açıklama / Not</th>
              </tr>
            </thead>
            <tbody>
              {businessLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                    Bu işletmeye ait geçmiş uzatma hareketi bulunmuyor.
                  </td>
                </tr>
              ) : (
                businessLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString("tr-TR")}
                    </td>
                    <td>
                      <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-xs">
                        +{log.daysAdded} Gün
                      </span>
                    </td>
                    <td className="text-xs text-slate-600">{log.previousEndDate}</td>
                    <td className="text-xs font-bold text-slate-900">{log.newEndDate}</td>
                    <td className="text-xs font-medium text-purple-700">{log.extendedBy}</td>
                    <td className="text-xs text-slate-600">{log.note || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BLOK 5: PLATFORM ÖDEMELERİ / TAHSİLATLAR */}
      <div className="sa-panel">
        <div className="sa-panel-header">
          <div className="sa-panel-title">
            <h2>SanayiPro Platform Abonelik Tahsilatları</h2>
            <p>Bu oto servisin SanayiPro platformuna yaptığı lisans ve paket ödemeleri</p>
          </div>
          <Button
            size="sm"
            onClick={() => setPaymentOpen(true)}
            className="h-8 text-xs font-bold bg-slate-900 text-white"
          >
            <CreditCard size={13} className="mr-1" /> + Ödeme Kaydet
          </Button>
        </div>

        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Fatura / Makbuz No</th>
                <th>Ödeme Tarihi</th>
                <th>Paket</th>
                <th>Tutar</th>
                <th>Yöntem</th>
                <th>Durum</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {businessPayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                    Bu işletmeye ait kayıtlı platform ödemesi bulunmuyor.
                  </td>
                </tr>
              ) : (
                businessPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs font-semibold text-slate-700">
                      {p.invoiceNo || p.id}
                    </td>
                    <td className="text-xs text-slate-600">{p.paymentDate}</td>
                    <td>
                      <span className="text-xs font-medium text-slate-800">{p.packageName}</span>
                    </td>
                    <td>
                      <strong className="text-sm font-bold text-slate-900">
                        ₺{p.amount.toLocaleString("tr-TR")}
                      </strong>
                    </td>
                    <td className="text-xs text-slate-600">{p.paymentMethod}</td>
                    <td>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          p.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.status === "COMPLETED" ? "Tahsil Edildi" : "Bekliyor"}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{p.notes || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DİALOGLAR */}
      <ExtendSubscriptionModal
        open={extendOpen}
        onOpenChange={setExtendOpen}
        businessId={business.id}
      />

      <RecordPaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        businessId={business.id}
      />

      {/* PAKET DEĞİŞTİRME MODALI */}
      <Dialog open={changePkgOpen} onOpenChange={setChangePkgOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-base font-bold text-slate-900">
            Abonelik Paketini Değiştir
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mb-3">
            {business.name} işletmesine tanımlı paketi güncelleyin.
          </DialogDescription>

          <form onSubmit={handlePackageChangeSubmit} className="space-y-4">
            <label className="sa-field-label">
              Yeni Paket Seçin
              <select
                value={newPackageId}
                onChange={(e) => setNewPackageId(e.target.value)}
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.description})
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Vazgeç
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                Paketi Güncelle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
