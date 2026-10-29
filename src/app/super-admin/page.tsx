"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Clock,
  AlertTriangle,
  UserPlus,
  CreditCard,
  Plus,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuperAdmin } from "@/lib/super-admin-provider";
import {
  calculateRemainingDays,
  calculateBusinessStatus,
  STATUS_LABELS,
} from "@/lib/super-admin-data";
import {
  NewBusinessModal,
  ExtendSubscriptionModal,
  RecordPaymentModal,
} from "@/components/super-admin/super-admin-modals";

export default function SuperAdminOverviewPage() {
  const { businesses, stats, extensionLogs, payments } = useSuperAdmin();

  // Modals for quick actions on this page
  const [newBizOpen, setNewBizOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [targetBizId, setTargetBizId] = useState<string>("");

  // Expiring soon businesses (sorted by lowest days remaining)
  const expiringBusinesses = businesses
    .map((b) => ({
      ...b,
      remainingDays: calculateRemainingDays(b.endDate),
      status: calculateBusinessStatus(b.endDate, b.isSuspended),
    }))
    .filter((b) => b.status === "EXPIRING_SOON" || b.status === "EXPIRED")
    .sort((a, b) => a.remainingDays - b.remainingDays);

  return (
    <div className="space-y-6">
      {/* 1. ÜST METRİK KARTLARI */}
      <div className="sa-metrics-grid">
        <div className="sa-metric-card tone-primary">
          <div className="sa-metric-card-top">
            <span>Aktif İşletme</span>
            <div className="sa-metric-icon-box">
              <Building2 size={18} />
            </div>
          </div>
          <div className="sa-metric-value">{stats.activeCount}</div>
          <span className="sa-metric-sub">Platformu kullanan servisler</span>
        </div>

        <div className="sa-metric-card tone-warning">
          <div className="sa-metric-card-top">
            <span>Süresi Yaklaşan</span>
            <div className="sa-metric-icon-box">
              <Clock size={18} />
            </div>
          </div>
          <div className="sa-metric-value text-amber-600">{stats.expiringCount}</div>
          <span className="sa-metric-sub">7 gün veya daha az kalan</span>
        </div>

        <div className="sa-metric-card tone-danger">
          <div className="sa-metric-card-top">
            <span>Süresi Dolan</span>
            <div className="sa-metric-icon-box">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="sa-metric-value text-red-600">{stats.expiredCount}</div>
          <span className="sa-metric-sub">Yenileme bekleyen servis</span>
        </div>

        <div className="sa-metric-card tone-success">
          <div className="sa-metric-card-top">
            <span>Bu Ay Yeni</span>
            <div className="sa-metric-icon-box">
              <UserPlus size={18} />
            </div>
          </div>
          <div className="sa-metric-value text-emerald-600">{stats.newThisMonthCount}</div>
          <span className="sa-metric-sub">Ekim 2026 yeni kayıt</span>
        </div>

        <div className="sa-metric-card tone-info">
          <div className="sa-metric-card-top">
            <span>Tahsilat Bekleyen</span>
            <div className="sa-metric-icon-box">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="sa-metric-value text-sky-600">{stats.pendingCollectionCount}</div>
          <span className="sa-metric-sub">Abonelik ödeme bekleyen</span>
        </div>
      </div>

      {/* 2. HIZLI İŞLEM ŞERİDİ (1-2 Dokunuşla Hızlı Aksiyon) */}
      <div className="sa-quick-strip">
        <div>
          <h3>Hızlı Platform Aksiyonları</h3>
          <p>Yeni bir oto servise SanayiPro hesabı açın, paket süresini uzatın veya abonelik tahsilatını işleyin.</p>
        </div>
        <div className="sa-quick-strip-btns">
          <Button
            onClick={() => setNewBizOpen(true)}
            className="bg-white text-indigo-950 hover:bg-indigo-50 font-bold"
          >
            <Plus size={16} className="mr-1 text-purple-600" /> + Yeni İşletme
          </Button>
          <Button
            onClick={() => setExtendOpen(true)}
            className="bg-indigo-600 text-white hover:bg-indigo-700 font-bold border border-indigo-400"
          >
            <RefreshCw size={15} className="mr-1" /> Paket Uzat
          </Button>
          <Button
            onClick={() => setPaymentOpen(true)}
            className="bg-purple-600 text-white hover:bg-purple-700 font-bold border border-purple-400"
          >
            <CreditCard size={16} className="mr-1" /> Ödeme Kaydet
          </Button>
        </div>
      </div>

      {/* 3. YAKINDA SÜRESİ DOLACAK İŞLETMELER LİSTESİ */}
      <div className="sa-panel">
        <div className="sa-panel-header">
          <div className="sa-panel-title">
            <h2>Yakında Süresi Dolacak İşletmeler</h2>
            <p>Abonelik süresi 7 gün veya daha az kalan servisler (Doğrudan detaya gidebilir veya uzatabilirsiniz)</p>
          </div>
          <Link
            href="/super-admin/businesses?filter=expiring"
            className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
          >
            Tümünü Gör ({expiringBusinesses.length}) <ArrowRight size={13} />
          </Link>
        </div>

        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>İşletme Adı</th>
                <th>Yetkili</th>
                <th>Konum</th>
                <th>Paket</th>
                <th>Bitiş Tarihi</th>
                <th>Kalan Süre</th>
                <th>Durum</th>
                <th className="text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {expiringBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    Şu anda süresi yaklaşan veya dolmuş işletme bulunmuyor.
                  </td>
                </tr>
              ) : (
                expiringBusinesses.slice(0, 6).map((biz) => {
                  const days = biz.remainingDays;
                  const isExpired = days <= 0;

                  return (
                    <tr key={biz.id}>
                      <td>
                        <Link
                          href={`/super-admin/businesses/${biz.id}`}
                          className="font-bold text-slate-900 hover:text-purple-600"
                        >
                          {biz.name}
                        </Link>
                        <span className="block text-xs text-slate-500">{biz.phone}</span>
                      </td>
                      <td className="font-medium text-slate-800">{biz.ownerName}</td>
                      <td>
                        <span className="text-xs font-semibold text-slate-700">
                          {biz.city} / {biz.district}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {biz.packageName}
                        </span>
                      </td>
                      <td className="text-xs font-medium text-slate-600">{biz.endDate}</td>
                      <td>
                        <span
                          className={`sa-days-pill ${
                            isExpired
                              ? "days-danger"
                              : days <= 3
                                ? "days-warning"
                                : "days-safe"
                          }`}
                        >
                          {isExpired ? "Süresi Doldu" : `${days} gün kaldı`}
                        </span>
                      </td>
                      <td>
                        <span className={`sa-badge ${STATUS_LABELS[biz.status].badgeClass}`}>
                          {STATUS_LABELS[biz.status].label}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs font-semibold px-2"
                            onClick={() => {
                              setTargetBizId(biz.id);
                              setExtendOpen(true);
                            }}
                          >
                            <RefreshCw size={12} className="mr-1 text-purple-600" /> Uzat
                          </Button>
                          <Button size="sm" asChild className="h-7 text-xs font-semibold px-2">
                            <Link href={`/super-admin/businesses/${biz.id}`}>Detay</Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. İKİLİ BİLGİ PANELLERİ: Son Uzatmalar & Son Tahsilatlar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Son Paket Uzatmaları */}
        <div className="sa-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-title">
              <h2>Son Paket Uzatmaları</h2>
              <p>Geçmiş paket hareketleri ve verilen süreler</p>
            </div>
            <Link
              href="/super-admin/businesses"
              className="text-xs font-semibold text-purple-600 hover:text-purple-800"
            >
              İşletmeler →
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {extensionLogs.slice(0, 4).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs"
              >
                <div>
                  <strong className="block text-slate-900 font-semibold text-sm">
                    {log.businessName}
                  </strong>
                  <span className="text-slate-500">
                    +{log.daysAdded} Gün · Yeni Bitiş: {log.newEndDate}
                  </span>
                  {log.note && <p className="text-slate-600 italic mt-0.5">{log.note}</p>}
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">
                    {new Date(log.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                  <span className="font-semibold text-purple-600">{log.extendedBy}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Son Platform Tahsilatları */}
        <div className="sa-panel">
          <div className="sa-panel-header">
            <div className="sa-panel-title">
              <h2>Son Platform Tahsilatları</h2>
              <p>Oto servislerden alınan SanayiPro abonelik ücretleri</p>
            </div>
            <Link
              href="/super-admin/payments"
              className="text-xs font-semibold text-purple-600 hover:text-purple-800"
            >
              Tüm Ödemeler →
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {payments.slice(0, 4).map((pay) => (
              <div
                key={pay.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs"
              >
                <div>
                  <strong className="block text-slate-900 font-semibold text-sm">
                    {pay.businessName}
                  </strong>
                  <span className="text-slate-500">
                    {pay.packageName} · {pay.paymentMethod}
                  </span>
                  {pay.invoiceNo && <span className="text-slate-400 block">{pay.invoiceNo}</span>}
                </div>
                <div className="text-right">
                  <strong className="text-sm font-bold text-slate-900 block">
                    ₺{pay.amount.toLocaleString("tr-TR")}
                  </strong>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      pay.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {pay.status === "COMPLETED" ? "Tahsil Edildi" : "Bekliyor"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DİALOGLAR */}
      <NewBusinessModal open={newBizOpen} onOpenChange={setNewBizOpen} />
      <ExtendSubscriptionModal
        open={extendOpen}
        onOpenChange={setExtendOpen}
        businessId={targetBizId}
      />
      <RecordPaymentModal open={paymentOpen} onOpenChange={setPaymentOpen} />
    </div>
  );
}
