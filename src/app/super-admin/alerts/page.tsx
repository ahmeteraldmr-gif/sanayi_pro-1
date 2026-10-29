"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSuperAdmin } from "@/lib/super-admin-provider";
import { ExtendSubscriptionModal } from "@/components/super-admin/super-admin-modals";

export default function SuperAdminAlertsPage() {
  const { alerts } = useSuperAdmin();
  const [filter, setFilter] = useState<"ALL" | "DANGER" | "WARNING" | "INFO">("ALL");
  const [extendOpen, setExtendOpen] = useState(false);
  const [targetBizId, setTargetBizId] = useState("");

  const filteredAlerts = alerts.filter((a) => {
    if (filter === "DANGER" && a.severity !== "danger") return false;
    if (filter === "WARNING" && a.severity !== "warning") return false;
    if (filter === "INFO" && a.severity !== "info") return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* ÜST BAŞLIK */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Süper Admin Uyarı Merkezi</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Aboneliği dolan, yaklaşan ve tahsilat bekleyen oto servisler için operasyonel hatırlatmalar.
          </p>
        </div>

        <div className="flex gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
          {[
            { id: "ALL" as const, label: `Tümü (${alerts.length})` },
            {
              id: "DANGER" as const,
              label: `Kritik (${alerts.filter((a) => a.severity === "danger").length})`,
            },
            {
              id: "WARNING" as const,
              label: `Uyarı (${alerts.filter((a) => a.severity === "warning").length})`,
            },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filter === f.id
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* UYARI LİSTESİ */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="sa-panel p-10 text-center text-slate-500 text-xs">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
            <strong className="block text-slate-800 text-sm font-bold">
              Kritik Uyarı Bulunmuyor
            </strong>
            Tüm oto servislerin abonelik ve paket süreleri güvende.
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isDanger = alert.severity === "danger";
            const isWarning = alert.severity === "warning";

            return (
              <div
                key={alert.id}
                className={`sa-alert-item ${
                  isDanger
                    ? "severity-danger"
                    : isWarning
                      ? "severity-warning"
                      : "severity-info"
                }`}
              >
                <div className="pt-0.5">
                  {isDanger ? (
                    <AlertCircle size={20} className="text-red-600" />
                  ) : isWarning ? (
                    <AlertTriangle size={20} className="text-amber-600" />
                  ) : (
                    <Info size={20} className="text-emerald-600" />
                  )}
                </div>

                <div className="sa-alert-item-content">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <strong className="text-slate-900 font-bold text-sm">
                        {alert.title}
                      </strong>
                      <p className="text-xs text-slate-600 mt-0.5">{alert.subtitle}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {alert.businessId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs font-semibold bg-white border-slate-300 hover:bg-slate-50"
                          onClick={() => {
                            setTargetBizId(alert.businessId!);
                            setExtendOpen(true);
                          }}
                        >
                          <RefreshCw size={12} className="mr-1 text-purple-600" /> Uzat
                        </Button>
                      )}

                      {alert.href && (
                        <Button
                          size="sm"
                          asChild
                          className="h-8 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white"
                        >
                          <Link href={alert.href}>
                            İncele <ArrowRight size={13} className="ml-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ExtendSubscriptionModal
        open={extendOpen}
        onOpenChange={setExtendOpen}
        businessId={targetBizId}
      />
    </div>
  );
}
