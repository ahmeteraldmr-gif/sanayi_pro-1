"use client";

import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CarFront,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  Package,
  Plus,
  Search,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import { demoVehicles, type DemoStatus } from "@/lib/marketing-data";
import { Brand } from "./brand";

const filters = ["Tümü", "İşlemde", "Bekleyen", "Hazır"] as const;
type Filter = (typeof filters)[number];
function matchesFilter(status: DemoStatus, filter: Filter) {
  return (
    filter === "Tümü" ||
    (filter === "Bekleyen"
      ? status.includes("Bekliyor")
      : filter === "Hazır"
        ? status === "Teslime Hazır"
        : status === filter)
  );
}

export function DashboardPreview() {
  const [filter, setFilter] = useState<Filter>("Tümü");
  const [search, setSearch] = useState("");
  const normalize = (value: string) =>
    value.toLocaleUpperCase("tr-TR").replaceAll(/\s/g, "");
  const results = demoVehicles.filter(
    (vehicle) =>
      matchesFilter(vehicle.status, filter) &&
      normalize(
        `${vehicle.plate}${vehicle.model}${vehicle.technician}`,
      ).includes(normalize(search)),
  );
  return (
    <figure className="dashboard-figure">
      <div className="dashboard-window">
        <div className="window-bar">
          <div className="window-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span>
            <span className="tiny-lock" /> sanayipro / genel-bakis
          </span>
          <span className="window-demo">CANLI PANEL</span>
        </div>
        <div className="dashboard-app">
          <aside className="preview-sidebar" aria-label="Ürün menüsü">
            <Brand />
            <div className="preview-business">
              <span className="business-avatar">S</span>
              <span>
                Akdeniz Oto Servis<small>Dörtyol Şubesi</small>
              </span>
              <ChevronDown size={12} aria-hidden="true" />
            </div>
            <p className="preview-nav-title">ÇALIŞMA ALANI</p>
            <div className="preview-nav-item is-active">
              <LayoutDashboard />
              <span>Genel Bakış</span>
            </div>
            <div className="preview-nav-item">
              <ClipboardList />
              <span>İş Emirleri</span>
              <b>8</b>
            </div>
            <div className="preview-nav-item">
              <CalendarDays />
              <span>Takvim</span>
            </div>
            <div className="preview-nav-item">
              <Users />
              <span>Müşteriler</span>
            </div>
            <div className="preview-nav-item">
              <CarFront />
              <span>Araçlar</span>
            </div>
            <div className="preview-nav-item">
              <Package />
              <span>Stok</span>
            </div>
            <div className="preview-nav-item">
              <Wallet />
              <span>Finans</span>
            </div>
            <div className="preview-sidebar-bottom">
              <div className="preview-nav-item">
                <Settings2 />
                <span>Ayarlar</span>
              </div>
              <div className="preview-nav-item">
                <CircleHelp />
                <span>Yardım</span>
              </div>
              <div className="preview-profile">
                <span>MY</span>
                <div>
                  Mehmet Yılmaz<small>İşletme sahibi</small>
                </div>
              </div>
            </div>
          </aside>
          <div className="preview-main">
            <div className="preview-topbar">
              <span>
                <Search size={13} aria-hidden="true" /> Plaka veya müşteri ara
              </span>
              <div>
                Dörtyol <ChevronDown size={11} aria-hidden="true" />
                <Bell size={14} aria-hidden="true" />
                <span className="preview-user">MY</span>
              </div>
            </div>
            <div className="preview-content">
              <div className="preview-heading">
                <div>
                  <span>21 Ekim 2026, Çarşamba</span>
                  <h2>
                    Bugün<span className="heading-dot">.</span>
                  </h2>
                  <p>Serviste her şey yerli yerinde.</p>
                </div>
                <span className="preview-new">
                  <Plus size={12} aria-hidden="true" /> Araç Kabul
                </span>
              </div>
              <div className="preview-stats">
                <div>
                  <span>Serviste</span>
                  <strong>
                    8 <small>aktif araç</small>
                  </strong>
                </div>
                <div>
                  <span>Onay bekleyen</span>
                  <strong>
                    2 <small>iş emri</small>
                  </strong>
                </div>
                <div>
                  <span>Teslime hazır</span>
                  <strong className="text-success">
                    2 <small>araç</small>
                  </strong>
                </div>
              </div>
              <div className="preview-list-heading">
                <h3>Servisteki Araçlar</h3>
                <span>Aktif Servis Takibi</span>
              </div>
              <div className="preview-list-tools">
                <div
                  className="preview-filters"
                  aria-label="Araçları filtrele"
                >
                  {filters.map((item) => (
                    <button
                      key={item}
                      onClick={() => setFilter(item)}
                      aria-pressed={filter === item}
                      className={filter === item ? "selected" : ""}
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <label className="preview-search">
                  <Search size={12} aria-hidden="true" />
                  <input
                    aria-label="Plaka ara"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Plaka ara"
                  />
                </label>
              </div>
              <div className="preview-table">
                <div className="preview-table-head">
                  <span>ARAÇ</span>
                  <span>DURUM</span>
                  <span>ANA USTA</span>
                </div>
                <div aria-live="polite" aria-atomic="true">
                  {results.slice(0, 3).map((vehicle) => (
                    <div className="preview-vehicle" key={vehicle.plate}>
                      <div className="preview-vehicle-name">
                        <span className="car-icon">
                          <CarFront size={17} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{vehicle.plate}</strong>
                          <small>{vehicle.model}</small>
                        </div>
                      </div>
                      <span
                        className={`status-badge ${vehicle.status === "İşlemde" ? "info" : vehicle.status === "Teslime Hazır" ? "success" : "warning"}`}
                      >
                        <i />
                        {vehicle.status}
                      </span>
                      <span className="technician">
                        {vehicle.technician}
                        <ArrowUpRight size={12} aria-hidden="true" />
                      </span>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <p className="preview-empty">
                      Eşleşen araç bulunamadı. Filtreyi veya aramayı değiştirin.
                    </p>
                  )}
                </div>
              </div>
              <div className="preview-table-footer">
                {results.length} araçtan {Math.min(results.length, 3)}{" "}
                tanesi gösteriliyor<span>Aktif Liste</span>
              </div>
              <div className="preview-appointment">
                <span className="appointment-icon">
                  <CalendarDays size={16} aria-hidden="true" />
                </span>
                <div>
                  <h3>Bugünün Randevuları</h3>
                  <p>
                    <strong>09:30</strong>
                    <span>31 KLM 222</span>Periyodik Bakım
                  </p>
                </div>
                <span className="appointment-check">
                  <Check size={13} aria-hidden="true" /> Planlandı
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <figcaption>
        <ArrowDownLeft size={14} aria-hidden="true" /> SanayiPro servis yönetim paneli genel bakış ekranı.
      </figcaption>
    </figure>
  );
}
