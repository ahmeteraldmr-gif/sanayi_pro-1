"use client";

import { useState } from "react";
import {
  Package,
  Check,
  Plus,
  Building,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuperAdmin } from "@/lib/super-admin-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export default function SuperAdminPackagesPage() {
  const { packages, businesses } = useSuperAdmin();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">SaaS Abonelik Paketleri</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Oto servislere sunulan SanayiPro lisans paketleri, özellik limitleri ve fiyatlandırma altyapısı.
          </p>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
        >
          <Plus size={16} className="mr-1" /> + Yeni Paket Tanımla
        </Button>
      </div>

      {/* PLAN CARDS GRID */}
      <div className="sa-plan-grid">
        {packages.map((pkg) => {
          const subscriberCount = businesses.filter((b) => b.packageId === pkg.id).length;
          const isFeatured = pkg.code === "pro";

          return (
            <div
              key={pkg.id}
              className={`sa-plan-card ${isFeatured ? "featured" : ""}`}
            >
              {isFeatured && <span className="sa-plan-badge">EN ÇOK TERCİH EDİLEN</span>}

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{pkg.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{pkg.description}</p>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isFeatured ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Package size={20} />
                </div>
              </div>

              <div className="sa-plan-price">
                ₺{pkg.priceMonthly.toLocaleString("tr-TR")}{" "}
                <span>/ ay</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Yıllık taahhütte ₺{pkg.priceYearly.toLocaleString("tr-TR")} / yıl
              </span>

              <div className="my-4 py-3 border-y border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Building size={14} className="text-purple-600" />
                  {pkg.maxBranches === "unlimited" ? "Sınırsız Şube" : `${pkg.maxBranches} Şube`}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-purple-600" />
                  {pkg.maxUsers === "unlimited" ? "Sınırsız Personel" : `${pkg.maxUsers} Personel`}
                </span>
              </div>

              <ul className="sa-plan-features">
                {pkg.features.map((feat, idx) => (
                  <li key={idx}>
                    <Check size={15} className="text-emerald-600 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">
                  Aktif Abone: <strong className="text-slate-900">{subscriberCount} Servis</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Yayında
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* YENİ PAKET MODALI */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle className="text-base font-bold text-slate-900">
            Yeni Paket Tanımla
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mb-3">
            Gelecekte sunulacak yeni bir abonelik paketi veya kurumsal plan oluşturun.
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setModalOpen(false);
            }}
            className="space-y-3"
          >
            <label className="sa-field-label">
              Paket Adı
              <input required placeholder="Örn. Kurumsal Plus" />
            </label>
            <label className="sa-field-label">
              Aylık Fiyat (₺)
              <input type="number" defaultValue="5990" />
            </label>
            <label className="sa-field-label">
              Açıklama
              <input placeholder="Paketin hedef servis profili" />
            </label>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Kapat
                </Button>
              </DialogClose>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                Paketi Oluştur
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
