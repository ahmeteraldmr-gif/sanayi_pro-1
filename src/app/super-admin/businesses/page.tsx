"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
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
  NewBusinessModal,
  ExtendSubscriptionModal,
} from "@/components/super-admin/super-admin-modals";

export default function SuperAdminBusinessesPage() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";

  const { businesses } = useSuperAdmin();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [newBizOpen, setNewBizOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [targetBizId, setTargetBizId] = useState("");

  const filteredBusinesses = useMemo(() => {
    return businesses
      .map((b) => {
        const remainingDays = calculateRemainingDays(b.endDate);
        const status = calculateBusinessStatus(b.endDate, b.isSuspended);
        return {
          ...b,
          remainingDays,
          status,
        };
      })
      .filter((b) => {
        // Status filter
        if (statusFilter === "active" && b.status !== "ACTIVE") return false;
        if (statusFilter === "expiring" && b.status !== "EXPIRING_SOON" && b.status !== "EXPIRED") return false;
        if (statusFilter === "expired" && b.status !== "EXPIRED") return false;
        if (statusFilter === "suspended" && b.status !== "SUSPENDED") return false;

        // Search query (İşletme adı, usta adı, telefon, il, ilçe)
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = b.name.toLowerCase().includes(q);
          const matchOwner = b.ownerName.toLowerCase().includes(q);
          const matchPhone = b.phone.includes(q);
          const matchCity = b.city.toLowerCase().includes(q);
          const matchDistrict = b.district.toLowerCase().includes(q);
          return matchName || matchOwner || matchPhone || matchCity || matchDistrict;
        }

        return true;
      });
  }, [businesses, statusFilter, search]);

  return (
    <div className="space-y-5">
      {/* BAŞLIK & EKLE BUTONU */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Oto Servis İşletmeleri</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            SanayiPro lisansı kullanan tüm oto servislerin paket, süre ve durum yönetimi.
          </p>
        </div>
        <Button
          onClick={() => setNewBizOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
        >
          <Plus size={16} className="mr-1" /> + Yeni İşletme Ekle
        </Button>
      </div>

      {/* ARAMA VE FİLTRE ÇUBUĞU */}
      <div className="sa-panel">
        <div className="sa-search-bar">
          <div className="sa-search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              className="sa-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İşletme adı, yetkili adı, telefon, il veya ilçe ara..."
            />
          </div>

          <div className="sa-filter-tabs">
            {[
              { id: "all", label: `Tümü (${businesses.length})` },
              {
                id: "active",
                label: `Aktif (${businesses.filter((b) => calculateBusinessStatus(b.endDate, b.isSuspended) === "ACTIVE").length})`,
              },
              {
                id: "expiring",
                label: `Süresi Yaklaşan (${businesses.filter((b) => calculateBusinessStatus(b.endDate, b.isSuspended) === "EXPIRING_SOON").length})`,
              },
              {
                id: "expired",
                label: `Süresi Dolan (${businesses.filter((b) => calculateBusinessStatus(b.endDate, b.isSuspended) === "EXPIRED").length})`,
              },
              {
                id: "suspended",
                label: `Askıya Alınan (${businesses.filter((b) => b.isSuspended).length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`sa-filter-tab ${statusFilter === tab.id ? "is-active" : ""}`}
                onClick={() => setStatusFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TABLO */}
        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>İşletme Adı</th>
                <th>Branş</th>
                <th>Yetkili / Usta</th>
                <th>Telefon</th>
                <th>İl / İlçe</th>
                <th>Paket</th>
                <th>Başlangıç</th>
                <th>Bitiş Tarihi</th>
                <th>Kalan Gün</th>
                <th>Durum</th>
                <th className="text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-500">
                    Arama kriterlerine uygun işletme bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map((biz) => {
                  const days = biz.remainingDays;
                  const isExpired = days <= 0;

                  return (
                    <tr key={biz.id}>
                      <td>
                        <Link
                          href={`/super-admin/businesses/${biz.id}`}
                          className="font-bold text-slate-900 hover:text-purple-600 block text-sm"
                        >
                          {biz.name}
                        </Link>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {biz.loginEmail}
                        </span>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {biz.trade || "Motor & Mekanik"}
                        </span>
                      </td>
                      <td className="font-medium text-slate-800">{biz.ownerName}</td>
                      <td className="text-xs text-slate-600">{biz.phone}</td>
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
                      <td className="text-xs text-slate-500">{biz.startDate}</td>
                      <td className="text-xs font-medium text-slate-800">{biz.endDate}</td>
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
                          {isExpired ? "Süresi Doldu" : `${days} gün`}
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

      {/* DİALOGLAR */}
      <NewBusinessModal open={newBizOpen} onOpenChange={setNewBizOpen} />
      <ExtendSubscriptionModal
        open={extendOpen}
        onOpenChange={setExtendOpen}
        businessId={targetBizId}
      />
    </div>
  );
}
