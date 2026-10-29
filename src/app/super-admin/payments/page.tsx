"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuperAdmin } from "@/lib/super-admin-provider";
import { RecordPaymentModal } from "@/components/super-admin/super-admin-modals";

export default function SuperAdminPaymentsPage() {
  const { payments } = useSuperAdmin();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "PENDING">("ALL");

  const filteredPayments = payments.filter((p) => {
    if (statusFilter !== "ALL" && p.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.businessName.toLowerCase().includes(q) ||
        p.packageName.toLowerCase().includes(q) ||
        (p.invoiceNo && p.invoiceNo.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalCollected = payments
    .filter((p) => p.status === "COMPLETED")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* ÜST BAŞLIK & ÖDEME EKLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">SanayiPro Platform Tahsilatları</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Oto servislerden tahsil edilen SaaS abonelik ve lisans ödemeleri takibi.
          </p>
        </div>
        <Button
          onClick={() => setPaymentOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
        >
          <Plus size={16} className="mr-1" /> + Yeni Ödeme Kaydet
        </Button>
      </div>

      {/* METRİK ŞERİDİ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase block">
            Toplam Abonelik Geliri
          </span>
          <strong className="text-2xl font-extrabold text-slate-900 block mt-1">
            ₺{totalCollected.toLocaleString("tr-TR")}
          </strong>
          <span className="text-xs text-emerald-600 font-medium">Başarıyla tahsil edilen</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase block">
            Tahsilat Bekleyen
          </span>
          <strong className="text-2xl font-extrabold text-amber-600 block mt-1">
            ₺{totalPending.toLocaleString("tr-TR")}
          </strong>
          <span className="text-xs text-slate-500 font-medium">Dekont / onay bekleyen faturalar</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <span className="text-xs font-semibold text-slate-500 uppercase block">
            Toplam Tahsilat Kaydı
          </span>
          <strong className="text-2xl font-extrabold text-purple-700 block mt-1">
            {payments.length} Adet
          </strong>
          <span className="text-xs text-slate-500 font-medium">Kayıtlı makbuz ve hareket</span>
        </div>
      </div>

      {/* ARAMA VE TABLO */}
      <div className="sa-panel">
        <div className="sa-search-bar">
          <div className="sa-search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              className="sa-search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İşletme adı, paket veya fatura no ara..."
            />
          </div>

          <div className="sa-filter-tabs">
            {[
              { id: "ALL" as const, label: `Tümü (${payments.length})` },
              {
                id: "COMPLETED" as const,
                label: `Tahsil Edildi (${payments.filter((p) => p.status === "COMPLETED").length})`,
              },
              {
                id: "PENDING" as const,
                label: `Bekleyen (${payments.filter((p) => p.status === "PENDING").length})`,
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

        <div className="sa-table-wrapper">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Fatura / Dekont No</th>
                <th>İşletme Adı</th>
                <th>Paket</th>
                <th>Tutar</th>
                <th>Ödeme Tarihi</th>
                <th>Ödeme Yöntemi</th>
                <th>Durum</th>
                <th>Açıklama / Not</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500">
                    Kayıtlı ödeme hareketi bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs font-bold text-slate-700">
                      {p.invoiceNo || p.id}
                    </td>
                    <td>
                      <Link
                        href={`/super-admin/businesses/${p.businessId}`}
                        className="font-bold text-slate-900 hover:text-purple-600 block text-sm"
                      >
                        {p.businessName}
                      </Link>
                    </td>
                    <td>
                      <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {p.packageName}
                      </span>
                    </td>
                    <td>
                      <strong className="text-sm font-bold text-slate-900">
                        ₺{p.amount.toLocaleString("tr-TR")}
                      </strong>
                    </td>
                    <td className="text-xs text-slate-600">{p.paymentDate}</td>
                    <td className="text-xs font-medium text-slate-700">{p.paymentMethod}</td>
                    <td>
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
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

      <RecordPaymentModal open={paymentOpen} onOpenChange={setPaymentOpen} />
    </div>
  );
}
