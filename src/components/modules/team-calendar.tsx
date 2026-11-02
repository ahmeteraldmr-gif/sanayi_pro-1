"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Pause,
  Play,
  Plus,
  Wrench,
} from "lucide-react";
import { useDemo } from "@/components/app-shell/demo-provider";
import { useOperations } from "./operations-store";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  branches,
  deliveryLabel,
  isActive,
  statuses,
  type WorkOrder,
} from "@/lib/demo-data";
import {
  EntryForm,
  Filter,
  Missing,
  ModuleHeading,
  Row,
  Rows,
  Summary,
  getInitials,
  type Field,
} from "./module-ui";

export function TeamPage({ id }: { id?: string }) {
  const { data, update } = useOperations();
  const demo = useDemo();
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"live" | "table">("live");
  const employee = data.employees.find((e) => e.id === id);

  const fields: Field[] = [
    { name: "name", label: "Çalışan adı", required: true },
    {
      name: "role",
      label: "Rol",
      required: true,
      value: data.settings.userRole,
      options: ["Usta", "Servis Danışmanı", "Muhasebe", "İşletme Sahibi"].map(
        (v) => ({ value: v, label: v }),
      ),
    },
    { name: "specialty", label: "Uzmanlık", required: true },
    { name: "phone", label: "Telefon", type: "tel" },
    { name: "email", label: "E-posta", type: "email" },
    {
      name: "branchId",
      label: "Şube",
      required: true,
      value: demo.branchId,
      options: branches.map((b) => ({ value: b.id, label: b.name })),
    },
  ];

  const add = (
    <EntryForm
      title="Çalışan Ekle"
      description="Yeni usta veya servis personelini şube ekibine kaydedin."
      fields={fields}
      onSave={(v) => {
        if (v.name.trim().length < 2) return "Çalışan adını kontrol edin.";
        update((s) => ({
          ...s,
          employees: [
            ...s.employees,
            {
              id: crypto.randomUUID(),
              name: v.name.trim(),
              role: v.role,
              specialty: v.specialty,
              phone: v.phone,
              email: v.email,
              branchId: v.branchId as typeof demo.branchId,
              active: true,
            },
          ],
        }));
        demo.announce("Çalışan kaydedildi.");
      }}
    />
  );

  const todayKey = new Date().toISOString().slice(0, 10);

  // Pre-index technician orders in a single pass O(O)
  const { activeMap, deliveredMap, completedTodayCount } = useMemo(() => {
    const act = new Map<string, WorkOrder[]>();
    const del = new Map<string, WorkOrder[]>();
    let todayCount = 0;

    for (const o of demo.orders) {
      if (o.branchId !== demo.branchId) continue;
      const tIds = new Set<string>();
      if (o.technicianId) tIds.add(o.technicianId);
      for (const a of o.assigneeIds) tIds.add(a);

      const isAct = isActive(o.status);
      const isDel = o.status === "DELIVERED";
      if (isDel && o.completedAt?.slice(0, 10) === todayKey) {
        todayCount++;
      }

      for (const tid of tIds) {
        if (isAct) {
          const list = act.get(tid);
          if (list) list.push(o);
          else act.set(tid, [o]);
        }
        if (isDel) {
          const list = del.get(tid);
          if (list) list.push(o);
          else del.set(tid, [o]);
        }
      }
    }
    return { activeMap: act, deliveredMap: del, completedTodayCount: todayCount };
  }, [demo.orders, demo.branchId, todayKey]);

  const active = (eid: string) => activeMap.get(eid) ?? [];
  const complete = (eid: string) => deliveredMap.get(eid) ?? [];

  const branchEmployees = useMemo(
    () => data.employees.filter((e) => e.branchId === demo.branchId),
    [data.employees, demo.branchId],
  );

  const filteredEmployees = useMemo(() => {
    const q = query.toLocaleLowerCase("tr").trim();
    if (!q) return branchEmployees;
    return branchEmployees.filter((e) =>
      `${e.name} ${e.specialty} ${e.role}`
        .toLocaleLowerCase("tr")
        .includes(q),
    );
  }, [branchEmployees, query]);

  const workingTechniciansCount = useMemo(
    () => branchEmployees.filter((e) => e.active && (activeMap.get(e.id)?.length ?? 0) > 0).length,
    [branchEmployees, activeMap],
  );

  const idleTechniciansCount = useMemo(
    () => branchEmployees.filter((e) => e.active && (activeMap.get(e.id)?.length ?? 0) === 0).length,
    [branchEmployees, activeMap],
  );

  if (id && !employee) return <Missing back="/app/team" />;

  return (
    <div className="module-page">
      <ModuleHeading
        overline="EKİP VE ATÖLYE ÇALIŞMA DURUMU"
        title={employee ? employee.name : "Ekip & Atölye"}
        subtitle={
          employee
            ? `${employee.role} · ${employee.specialty}`
            : "Şu anda kim hangi araçla uğraşıyor? Ustaların anlık çalışma durumu ve hızlı aksiyonlar."
        }
        back={employee ? "/app/team" : undefined}
        action={
          employee ? (
            <EntryForm
              title="Çalışanı Düzenle"
              fields={[
                ...fields.map((f) => ({
                  ...f,
                  value: String(
                    employee[f.name as keyof typeof employee] ?? "",
                  ),
                })),
                {
                  name: "active",
                  label: "Durum",
                  value: employee.active ? "Aktif" : "Pasif",
                  options: [
                    { value: "Aktif", label: "Aktif" },
                    { value: "Pasif", label: "Pasif" },
                  ],
                },
              ]}
              onSave={(v) => {
                update((s) => ({
                  ...s,
                  employees: s.employees.map((e) =>
                    e.id === id
                      ? {
                          ...e,
                          ...v,
                          branchId: v.branchId as typeof e.branchId,
                          active: v.active === "Aktif",
                        }
                      : e,
                  ),
                }));
                demo.announce("Çalışan güncellendi.");
              }}
            />
          ) : (
            add
          )
        }
      />

      {employee ? (
        <>
          <Summary
            items={[
              {
                label: "Aktif İş",
                value: active(employee.id).length,
                hint: "Üzerindeki açık iş emirleri",
                tone: active(employee.id).length > 0 ? "primary" : "default",
              },
              {
                label: "Bugün Tamamlanan",
                value: complete(employee.id).filter(
                  (o) => o.completedAt?.slice(0, 10) === todayKey,
                ).length,
                hint: "Bugün teslim edilen araçlar",
                tone: "success",
              },
              {
                label: "Tamamlanan Toplam",
                value: complete(employee.id).length,
                hint: "Geçmişten bugüne teslimatlar",
              },
            ]}
          />
          <section className="app-panel module-section">
            <h2>İletişim ve Uzmanlık</h2>
            <dl className="module-description">
              <div>
                <dt>Telefon</dt>
                <dd>
                  {employee.phone ? (
                    <a href={`tel:${employee.phone}`}>{employee.phone}</a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>E-posta</dt>
                <dd>{employee.email || "—"}</dd>
              </div>
              <div>
                <dt>Şube</dt>
                <dd>
                  {branches.find((b) => b.id === employee.branchId)?.name}
                </dd>
              </div>
              <div>
                <dt>Uzmanlık</dt>
                <dd>{employee.specialty}</dd>
              </div>
              <div>
                <dt>Durum</dt>
                <dd>{employee.active ? "Aktif" : "Pasif"}</dd>
              </div>
            </dl>
          </section>

          <section className="app-panel module-section">
            <h2>Şu An Üzerinde Çalıştığı İşler</h2>
            {active(employee.id).length ? (
              <div className="ux-team-active-cards-grid">
                {active(employee.id).map((order) => {
                  const vehicle = demo.vehicleFor(order);
                  return (
                    <div key={order.id} className="ux-team-live-card is-active">
                      <div className="ux-team-live-card-head">
                        <div>
                          <strong className="ux-plate-chip">
                            {vehicle.plate}
                          </strong>
                          <strong>{vehicle.model}</strong>
                        </div>
                        <StatusBadge status={order.status} short />
                      </div>
                      <p className="ux-team-live-complaint">
                        {order.labor.map((l) => l.name).join(", ") ||
                          order.complaint}
                      </p>
                      <div className="ux-team-live-meta">
                        <span>
                          <Clock3 size={13} /> {order.stageDuration} işlemde
                        </span>
                        <span>Hedef: {deliveryLabel(order.dueAt)}</span>
                      </div>
                      <div className="ux-team-live-actions">
                        <Button asChild size="sm">
                          <Link href={`/app/work-orders/${order.id}`}>
                            İş Emrine Git <ArrowRight size={14} />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="records-help">Şu anda üzerinde aktif iş emri yok.</p>
            )}
          </section>

          <section className="module-subblock">
            <h2 className="module-subheading">Teslim Edilen İşler</h2>
            <Rows
              headers={["Plaka", "İş Emri", "Durum"]}
              empty={!complete(employee.id).length}
            >
              {complete(employee.id).map((o) => (
                <Row
                  key={o.id}
                  href={`/app/work-orders/${o.id}`}
                  cells={[
                    { label: "Plaka", value: demo.vehicleFor(o).plate },
                    { label: "İş Emri", value: `#${o.id}` },
                    { label: "Durum", value: statuses[o.status].label },
                  ]}
                />
              ))}
            </Rows>
          </section>
        </>
      ) : (
        <>
          <Summary
            items={[
              {
                label: "Şube Ekibi",
                value: branchEmployees.length,
                hint: "Kayıtlı personel",
                tone: "primary",
              },
              {
                label: "Araç Başında (Çalışan)",
                value: workingTechniciansCount,
                hint: "Şu an araç üzerinde işlem yapan",
                tone: "success",
              },
              {
                label: "Boşta Olan",
                value: idleTechniciansCount,
                hint: "Yeni iş almaya hazır",
                tone: idleTechniciansCount > 0 ? "warning" : "default",
              },
              {
                label: "Bugün Teslim",
                value: completedTodayCount,
                hint: "Bugün kapatılan iş emri",
              },
            ]}
          />

          <div className="ux-team-view-bar">
            <Filter
              value={query}
              onChange={setQuery}
              placeholder="Usta adı, uzmanlık veya rol ara..."
            />
            <div className="ux-team-view-toggle" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "live"}
                className={viewMode === "live" ? "is-active" : ""}
                onClick={() => setViewMode("live")}
              >
                Canlı Atölye Durumu
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "table"}
                className={viewMode === "table" ? "is-active" : ""}
                onClick={() => setViewMode("table")}
              >
                Tüm Kadro Listesi
              </button>
            </div>
          </div>

          {viewMode === "live" ? (
            <div className="ux-team-live-grid">
              {filteredEmployees.map((e) => {
                const empOrders = active(e.id);
                const isWorking = empOrders.length > 0;
                const primaryOrder = empOrders[0];
                const otherOrders = empOrders.slice(1);
                const primaryVehicle = primaryOrder
                  ? demo.vehicleFor(primaryOrder)
                  : null;

                return (
                  <div
                    key={e.id}
                    data-tour="team-member-card"
                    className={`ux-team-technician-card ${isWorking ? "is-working" : "is-idle"}`}
                  >
                    {/* Üst: Usta bilgisi */}
                    <div className="ux-team-card-header">
                      <div className="ux-team-card-profile">
                        <span className="app-avatar">{getInitials(e.name)}</span>
                        <div>
                          <div className="ux-team-name-row">
                            <Link
                              href={`/app/team/${e.id}`}
                              data-tour="team-member-link"
                              className="ux-team-name-link"
                            >
                              <strong>{e.name}</strong>
                            </Link>
                            <span
                              className={`ux-work-status-badge ${isWorking ? "is-active" : "is-idle"}`}
                            >
                              {isWorking ? "Araç Başında" : "Boşta"}
                            </span>
                          </div>
                          <small>
                            {e.role} · {e.specialty}
                          </small>
                        </div>
                      </div>
                      {e.phone && (
                        <a
                          href={`tel:${e.phone.replace(/\s+/g, "")}`}
                          className="ux-team-phone-btn"
                          title={`${e.name} ara`}
                        >
                          {e.phone}
                        </a>
                      )}
                    </div>

                    {/* Orta: Çalıştığı Araç & İşlem */}
                    {isWorking && primaryOrder && primaryVehicle ? (
                      <div className="ux-team-work-body">
                        <div className="ux-team-car-head">
                          <div className="ux-team-car-title">
                            <strong className="ux-plate-chip">
                              {primaryVehicle.plate}
                            </strong>
                            <span>{primaryVehicle.model}</span>
                          </div>
                          <StatusBadge status={primaryOrder.status} short />
                        </div>

                        <p className="ux-team-job-desc">
                          {primaryOrder.labor.map((l) => l.name).join(", ") ||
                            primaryOrder.complaint}
                        </p>

                        <div className="ux-team-time-strip">
                          <span>
                            <Clock3 size={13} /> {primaryOrder.stageDuration}{" "}
                            işlemde
                          </span>
                          <span>
                            Hedef: {deliveryLabel(primaryOrder.dueAt)}
                          </span>
                        </div>

                        {/* Usta Hızlı Aksiyonları */}
                        <div className="ux-team-actions-row">
                          <Button asChild size="sm">
                            <Link href={`/app/work-orders/${primaryOrder.id}`}>
                              İş Emrine Git <ArrowRight size={14} />
                            </Link>
                          </Button>

                          {primaryOrder.status !== "IN_PROGRESS" &&
                            primaryOrder.status !== "READY" &&
                            primaryOrder.status !== "DELIVERED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  demo.quickTechnicianAction(
                                    primaryOrder.id,
                                    "IN_PROGRESS",
                                    e.name,
                                  )
                                }
                              >
                                <Play size={13} /> Başlat
                              </Button>
                            )}

                          {primaryOrder.status === "IN_PROGRESS" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  demo.quickTechnicianAction(
                                    primaryOrder.id,
                                    "WAITING_PARTS",
                                    e.name,
                                  )
                                }
                              >
                                <Pause size={13} /> Parça Bekle
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  demo.quickTechnicianAction(
                                    primaryOrder.id,
                                    "QUALITY_CONTROL",
                                    e.name,
                                  )
                                }
                              >
                                <CheckCircle2 size={13} /> Kontrol
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  demo.quickTechnicianAction(
                                    primaryOrder.id,
                                    "READY",
                                    e.name,
                                  )
                                }
                              >
                                Hazır
                              </Button>
                            </>
                          )}

                          {primaryOrder.status === "WAITING_PARTS" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                demo.quickTechnicianAction(
                                  primaryOrder.id,
                                  "IN_PROGRESS",
                                  e.name,
                                )
                              }
                            >
                              <Play size={13} /> Devam Et
                            </Button>
                          )}

                          {primaryOrder.status === "QUALITY_CONTROL" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                demo.quickTechnicianAction(
                                  primaryOrder.id,
                                  "READY",
                                  e.name,
                                )
                              }
                            >
                              <CheckCircle2 size={13} /> Hazır
                            </Button>
                          )}
                        </div>

                        {/* Diğer aktif işler */}
                        {otherOrders.length > 0 && (
                          <div className="ux-team-extra-orders">
                            <span className="ux-team-extra-label">
                              Diğer işleri ({otherOrders.length}):
                            </span>
                            <div className="ux-team-extra-list">
                              {otherOrders.map((o) => {
                                const v = demo.vehicleFor(o);
                                return (
                                  <Link
                                    key={o.id}
                                    href={`/app/work-orders/${o.id}`}
                                    className="ux-team-extra-chip"
                                  >
                                    <strong>{v.plate}</strong>
                                    <span>#{o.id}</span>
                                    <StatusBadge status={o.status} short />
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="ux-team-idle-body">
                        <div className="ux-team-idle-callout">
                          <Wrench size={22} className="ux-team-idle-icon" />
                          <div>
                            <strong>Şu anda aktif işi yok</strong>
                            <p>
                              Usta yeni iş kabulüne ve atamaya hazır durumda.
                            </p>
                          </div>
                        </div>
                        <div className="ux-team-idle-actions">
                          <Button asChild size="sm" variant="outline">
                            <Link href="/app/intake">
                              <Plus size={14} /> Yeni Araç Kabul Başlat
                            </Link>
                          </Button>
                          <Button asChild size="sm" variant="ghost">
                            <Link href="/app/work-orders">İş Emri Ata →</Link>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <Rows
              headers={[
                "Çalışan",
                "Rol / Uzmanlık",
                "Aktif / Tamamlanan",
                "Şube",
                "Durum",
              ]}
              empty={!filteredEmployees.length}
            >
              {filteredEmployees.map((e) => (
                <Row
                  key={e.id}
                  href={`/app/team/${e.id}`}
                  cells={[
                    {
                      label: "Çalışan",
                      value: (
                        <div className="module-entity">
                          <span className="module-avatar">
                            {getInitials(e.name)}
                          </span>
                          <div>
                            <strong>{e.name}</strong>
                            <small>
                              {e.phone || "İletişim bilgisi kayıtlı"}
                            </small>
                          </div>
                        </div>
                      ),
                    },
                    {
                      label: "Rol / Uzmanlık",
                      value: (
                        <>
                          <strong>{e.role}</strong>
                          <small>{e.specialty}</small>
                        </>
                      ),
                    },
                    {
                      label: "Aktif / Tamamlanan",
                      value: (
                        <span className="module-chip is-info">
                          {active(e.id).length} aktif ·{" "}
                          {
                            complete(e.id).filter(
                              (o) => o.completedAt?.slice(0, 10) === todayKey,
                            ).length
                          }{" "}
                          bugün tamamlanan
                        </span>
                      ),
                    },
                    {
                      label: "Şube",
                      value: branches.find((b) => b.id === e.branchId)?.name,
                    },
                    {
                      label: "Durum",
                      value: (
                        <span
                          className={`module-chip ${e.active ? "is-success" : ""}`}
                        >
                          {e.active ? "Aktif" : "Pasif"}
                        </span>
                      ),
                    },
                  ]}
                />
              ))}
            </Rows>
          )}
        </>
      )}
    </div>
  );
}

export { CalendarPage } from "./schedule-calendar";

