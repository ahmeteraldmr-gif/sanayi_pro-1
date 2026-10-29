"use client";

import { useRef, useState, useEffect, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTraining } from "@/components/training/training-context";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ClipboardCheck,
  Search,
  Sparkles,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOperations } from "@/components/modules/operations-store";
import { readPhoto } from "@/lib/photo-file";
import { useDemo } from "@/components/app-shell/demo-provider";
import { CreateRecordForm } from "@/components/records/create-record-form";
import { PlateScannerModal } from "@/components/plate-reader/plate-scanner-modal";
import { SERVICE_TEMPLATES } from "@/components/app-shell/quick-flow-drawer";
import {
  branchName,
  defaultAppointmentTime,
  formatPlate,
  isActive,
  normalizeSearch,
  number,
  type IntakePhoto,
} from "@/lib/demo-data";
import {
  inspectionItems,
  inspectionStateLabels,
  intakeChecklist,
  intakeSteps,
  photoAreas,
  type InspectionState,
} from "@/lib/intake-data";

const DEFAULT_INSPECTION: Record<string, InspectionState> = Object.fromEntries(
  inspectionItems.map((item) => [item.id, "normal" as const]),
);

export function IntakeWizard({
  initialVehicleId = "",
  initialPlate = "",
}: {
  initialVehicleId?: string;
  initialPlate?: string;
}) {
  const router = useRouter();
  const {data:operations}=useOperations();
  const technicians=operations.employees.filter(e=>e.active);
  const { vehicles, customers, orders, branchId, acceptVehicle } = useDemo();
  const [step, setStep] = useState(0);
  const [vehicleId, setVehicleId] = useState(initialVehicleId);
  const [query, setQuery] = useState(initialPlate);
  const [creating, setCreating] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [mileage, setMileage] = useState("");
  const [fuel, setFuel] = useState(Number(operations.settings.fuel)||25);
  const [keyCount, setKeyCount] = useState("1");
  const [leftItems, setLeftItems] = useState("");
  const [complaint, setComplaint] = useState("");
  const [hasDamage, setHasDamage] = useState(false);
  const [damage, setDamage] = useState("");
  const [inspection, setInspection] =
    useState<Record<string, InspectionState>>(DEFAULT_INSPECTION);
  const [checklist, setChecklist] = useState<
    Record<string, "yes" | "no" | "na">
  >({});
  const [photos, setPhotos] = useState<readonly IntakePhoto[]>([]);
  const [readingPhoto, setReadingPhoto] = useState(false);
  const [technicianId, setTechnicianId] = useState("");
  const [due, setDue] = useState(defaultAppointmentTime);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const submitted = useRef(false);
  const { activeStep } = useTraining();

  // If training tour is on step 4 (tech select or submit), auto-advance to step 4
  useEffect(() => {
    let unmounted = false;
    if (activeStep?.id === "vi-tech" || activeStep?.id === "vi-submit") {
      if (vehicleId && step < 4) {
        const timer = setTimeout(() => {
          if (!unmounted) setStep(4);
        }, 50);
        return () => {
          unmounted = true;
          clearTimeout(timer);
        };
      }
    }
  }, [activeStep?.id, vehicleId, step]);

  function selectVehicle(id: string) {
    setVehicleId(id);
    const chosen = vehicles.find((v) => v.id === id);
    const lastKm = chosen?.lastService?.mileage ?? chosen?.mileage ?? 95000;
    setMileage(String(lastKm + 3450));
    setFuel(Number(operations.settings.fuel) || 50);
    setKeyCount("1");
    setLeftItems("Ruhsat torpidoda");
    setComplaint("Frenlerden sürtünme sesi geliyor ve periyodik bakım kontrolü.");
    setHasDamage(false);
    setDamage("Görünür hasar yok.");
    setInspection(DEFAULT_INSPECTION);
    setChecklist({});
    setPhotos([]);
    setTechnicianId(technicians[0]?.id || "mehmet");
    setDue(defaultAppointmentTime());
    setError("");
    setStep(1);
  }
  const vehicle = vehicles.find((item) => item.id === vehicleId);
  const customer = customers.find((item) => item.id === vehicle?.customerId);
  const active = orders.find(
    (item) => item.vehicleId === vehicleId && isActive(item.status),
  );
  const matches = vehicles.filter((item) =>
    normalizeSearch(
      `${item.plate}${item.model}${customers.find((person) => person.id === item.customerId)?.name ?? ""}`,
    ).includes(normalizeSearch(query)),
  );
  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  function go(target: number) {
    setError("");
    setStep(target);
    requestAnimationFrame(() => {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({
        block: "start",
        behavior: "instant",
      });
    });
  }
  function next() {
    if (step === 0 && (!vehicle || active)) {
      fail(
        active
          ? "Bu aracın aktif iş emri var. Mevcut kayıttan devam edin."
          : "Önce bir araç ve ilişkili müşteriyi seçin.",
      );
      return;
    }
    if (step === 1) {
      const parsed = Number(mileage);
      if (
        !mileage.trim() ||
        !Number.isInteger(parsed) ||
        parsed < (vehicle?.lastService?.mileage ?? 0) ||
        parsed > 9999999
      ) {
        fail(
          "Geçerli kilometre girin. Son servis kilometresinden düşük olamaz.",
        );
        return;
      }
      if (!complaint.trim() || (hasDamage && !damage.trim())) {
        fail("Müşteri şikâyetini ve varsa mevcut hasarı açıklayın.");
        return;
      }
    }
    if (step === 2 && operations.settings.checklist!=="İsteğe bağlı" && intakeChecklist.some((item) => !checklist[item.id])) {
      fail("Her checklist maddesi için Evet, Hayır veya Uygulanamaz seçin.");
      return;
    }
    go(step + 1);
  }
  function finish() {
    if (submitted.current) return;
    const dueAt = `${due}:00+03:00`;
    const result = acceptVehicle({
      vehicleId,
      mileage: Number(mileage),
      fuel,
      keyCount: Math.max(1, Number(keyCount) || 1),
      leftItems: leftItems.trim(),
      inspection,
      complaint,
      damage: hasDamage ? damage : "Görünür hasar yok.",
      checklist,
      photos,
      technicianId,
      dueAt,
    });
    if (result.error) {
      fail(result.error);
      return;
    }
    if (result.orderId) {
      submitted.current = true;
      router.push(`/app/work-orders/${result.orderId}`);
    }
  }
  async function selectPhoto(
    area: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      fail("Fotoğraf JPG, PNG veya WebP olmalı ve 5 MB'ı geçmemeli.");
      return;
    }
    setReadingPhoto(true);
    setError("");
    try {
      const dataUrl = await readPhoto(file);
      setPhotos((current) => [
        ...current.filter((photo) => photo.area !== area),
        { area, name: file.name, dataUrl },
      ]);
    } catch {
      fail("Fotoğraf okunamadı. Başka bir görsel seçin.");
    } finally {
      setReadingPhoto(false);
    }
  }
  return (
    <div className="intake-page">
      <div className="app-page-heading">
        <div>
          <p className="app-overline">GÜNLÜK OPERASYON</p>
          <h1>Yeni Araç Kabul</h1>
          <p>{branchName(branchId)} · Araç Kabul</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost">
              <X /> Kabulden Çık
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Kabulden çıkılsın mı?</DialogTitle>
            <DialogDescription>
              Tamamlanmayan kabul bilgileri kaydedilmeyecek. Müşteri ve araç kayıtlarınız korunur.
            </DialogDescription>
            <div className="records-form-actions">
              <DialogClose asChild>
                <Button variant="outline">Devam Et</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button asChild>
                  <Link href="/app">Kabulden Çık</Link>
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <ol className="intake-progress" aria-label="Araç kabul adımları">
        {intakeSteps.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={`${index < step ? "is-complete" : ""} ${vehicleId ? "cursor-pointer" : ""}`}
            onClick={() => {
              if (vehicleId) setStep(index);
            }}
          >
            <span>{index < step ? <Check size={17} /> : index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
      <div className="intake-layout">
        <section className="app-panel intake-panel">
          <div className="intake-step-heading">
            <p className="app-overline" role="status">
              ADIM {step + 1} / 5
            </p>
            <h2 ref={headingRef} tabIndex={-1}>
              {intakeSteps[step]}
            </h2>
            <p>
              {
                [
                  "Mevcut aracı bulun veya müşteri ve araç kaydını birlikte oluşturun.",
                  "Kabul anındaki bilgileri kaydedin. Sonraki aşamalara sağlam bir başlangıç yapın.",
                  "Eksikleri ve teslim alınanları müşterinin yanında kontrol edin.",
                  "Kabul anını fotoğraflarla belgeleyin.",
                  "Sorumlu ustayı ve teslim hedefini seçip kabulü gözden geçirin.",
                ][step]
              }
            </p>
          </div>
          {step === 0 && (
            <div className="intake-step-body">
              {creating ? (
                <>
                  <div className="records-section-heading">
                    <h3>Yeni Müşteri + Araç</h3>
                  </div>
                  <CreateRecordForm
                    initialPlate={formatPlate(query) ?? query}
                    onCancel={() => setCreating(false)}
                    onCreated={(created) => {
                      selectVehicle(created.id);
                      setCreating(false);
                      setError("");
                    }}
                  />
                </>
              ) : (
                <>
                  <div className="ux-intake-scan-row">
                    <Button
                      type="button"
                      className="ux-scanner-trigger-btn"
                      onClick={() => setScannerOpen(true)}
                    >
                      <Camera size={18} /> Plaka Oku (Kamera)
                    </Button>
                    <span className="ux-or-divider">veya listeden seçin:</span>
                  </div>
                  <label className="records-search">
                    <Search size={20} />
                    <span className="sr-only">
                      Kabul için plaka veya müşteri ara
                    </span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Plaka veya müşteri ara · 31 ABC 123"
                    />
                  </label>
                  {vehicle ? (
                    <div className="intake-selected">
                      <span className="app-overline">SEÇİLİ ARAÇ</span>
                      <strong>{vehicle.plate}</strong>
                      <p>
                        {vehicle.model}{vehicle.year ? ` · ${vehicle.year}` : ""}
                      </p>
                      <p>
                        <UserRound size={16} /> {customer?.name} ·{" "}
                        {customer?.phone}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          selectVehicle("");
                          setError("");
                        }}
                      >
                        Başka Araç Seç
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ul className="intake-vehicle-options">
                        {matches.map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              data-tour="intake-vehicle-select"
                              onClick={() => {
                                selectVehicle(item.id);
                                setError("");
                              }}
                            >
                              <span>
                                <strong>{item.plate}</strong>
                                <small>
                                  {item.model} ·{" "}
                                  {
                                    customers.find(
                                      (person) => person.id === item.customerId,
                                    )?.name
                                  }
                                </small>
                              </span>
                              <ArrowRight size={18} />
                            </button>
                          </li>
                        ))}
                      </ul>
                      {!matches.length && (
                        <p className="records-help" role="status">
                          {formatPlate(query) ?? query} için araç bulunamadı.
                        </p>
                      )}
                    </>
                  )}
                  {active && (
                    <div className="records-error">
                      <p>Bu aracın aktif iş emri var; tekrar kabul açılamaz.</p>
                      <Link href={`/app/work-orders/${active.id}`}>
                        #{active.id} iş emrini aç <ArrowRight size={16} />
                      </Link>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreating(true)}
                  >
                    <UserRound /> Yeni Müşteri + Araç Oluştur
                  </Button>
                </>
              )}
            </div>
          )}
          {step === 1 && (
            <div className="intake-step-body records-form">
              <div className="records-fields">
                <label>
                  Kilometre
                  <input
                    type="number"
                    inputMode="numeric"
                    data-tour="intake-mileage-input"
                    min={vehicle?.lastService?.mileage ?? 0}
                    max={9999999}
                    step={1}
                    value={mileage}
                    onChange={(event) => setMileage(event.target.value)}
                    placeholder="Örn. 100250"
                  />
                </label>
                <div className="intake-last-mileage">
                  <span>Son servis kilometresi</span>
                  <strong>
                    {vehicle?.lastService
                      ? `${number(vehicle.lastService.mileage)} km`
                      : "İlk servis kaydı"}
                  </strong>
                </div>
              </div>
              <label>
                Yakıt seviyesi <strong>%{fuel}</strong>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={fuel}
                  onChange={(event) => setFuel(Number(event.target.value))}
                />
                <span className="intake-range-labels">
                  <span>Boş</span>
                  <span>Yarım</span>
                  <span>Dolu</span>
                </span>
              </label>
              <div className="records-fields">
                <label>
                  Teslim edilen anahtar sayısı
                  <select
                    value={keyCount}
                    onChange={(event) => setKeyCount(event.target.value)}
                  >
                    <option value="1">1 Anahtar</option>
                    <option value="2">2 Anahtar (Yedek dahil)</option>
                    <option value="3">3 Anahtar</option>
                  </select>
                </label>
                <label>
                  Araçta bırakılan eşyalar
                  <input
                    type="text"
                    value={leftItems}
                    onChange={(event) => setLeftItems(event.target.value)}
                    placeholder="Örn. Ruhsat, çocuk koltuğu, gözlük"
                  />
                </label>
              </div>
              <div className="ux-intake-template-section">
                <label className="ux-drawer-field-label">
                  <Sparkles size={14} /> Sık Yapılan İşlem Şablonları (Tek Dokunuşla Seçin)
                </label>
                <div className="ux-template-pills-grid is-compact">
                  {SERVICE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      className={`ux-template-pill ${complaint.startsWith(tmpl.label) ? "is-selected" : ""}`}
                      onClick={() => setComplaint(`${tmpl.label} - ${tmpl.desc}`)}
                    >
                      <strong>{tmpl.label}</strong>
                    </button>
                  ))}
                </div>
              </div>
              <label>
                Müşteri şikâyeti
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={complaint}
                  onChange={(event) => setComplaint(event.target.value)}
                  placeholder="Müşterinin anlattığı sorunu kaydedin veya yukarıdaki şablonlardan seçin."
                />
              </label>
              <fieldset className="intake-damage">
                <legend>Mevcut hasar</legend>
                <label>
                  <input
                    type="radio"
                    name="damage-state"
                    checked={!hasDamage}
                    onChange={() => setHasDamage(false)}
                  />{" "}
                  Görünür hasar yok
                </label>
                <label>
                  <input
                    type="radio"
                    name="damage-state"
                    checked={hasDamage}
                    onChange={() => setHasDamage(true)}
                  />{" "}
                  Mevcut hasar var
                </label>
              </fieldset>
              {hasDamage && (
                <label>
                  Hasar açıklaması
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={damage}
                    onChange={(event) => setDamage(event.target.value)}
                    placeholder="Örn. Sol ön kapıda çizik."
                  />
                </label>
              )}
            </div>
          )}
          {step === 2 && (
            <div className="intake-step-body">
              <div className="records-section-heading">
                <span>Fiziksel Kontrol & Teslim Listesi</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInspection(DEFAULT_INSPECTION);
                    setChecklist(
                      Object.fromEntries(
                        intakeChecklist.map((item) => [item.id, "yes" as const]),
                      ),
                    );
                  }}
                >
                  <Check size={15} /> Tümünü Evet İşaretle
                </Button>
              </div>
              <div className="intake-checklist">
                {inspectionItems.map((item) => (
                  <fieldset key={item.id}>
                    <legend>{item.label}</legend>
                    <div>
                      {(
                        [
                          { value: "normal", label: "Normal" },
                          { value: "damaged", label: "Hasarlı" },
                          { value: "check", label: "Kontrol Edilecek" },
                        ] as const
                      ).map((option) => (
                        <label
                          key={option.value}
                          className={
                            inspection[item.id] === option.value
                              ? "is-selected"
                              : ""
                          }
                        >
                          <input
                            type="radio"
                            name={`insp-${item.id}`}
                            checked={inspection[item.id] === option.value}
                            onChange={() =>
                              setInspection({
                                ...inspection,
                                [item.id]: option.value,
                              })
                            }
                          />{" "}
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                {intakeChecklist.map((item) => (
                  <fieldset key={item.id}>
                    <legend>{item.label}</legend>
                    <div>
                      {(
                        [
                          { value: "yes", label: "Evet" },
                          { value: "no", label: "Hayır" },
                          { value: "na", label: "Uygulanamaz" },
                        ] as const
                      ).map((option) => (
                        <label
                          key={option.value}
                          className={
                            checklist[item.id] === option.value
                              ? "is-selected"
                              : ""
                          }
                        >
                          <input
                            type="radio"
                            name={item.id}
                            checked={checklist[item.id] === option.value}
                            onChange={() =>
                              setChecklist({
                                ...checklist,
                                [item.id]: option.value,
                              })
                            }
                          />{" "}
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
              <p className="records-help">
                Farlar, sinyaller, lastikler, camlar, aynalar, kaporta ve iç
                mekanı Normal / Hasarlı / Kontrol Edilecek olarak işaretleyin.
              </p>
            </div>
          )}
          {step === 3 && (
            <div className="intake-step-body">
              <div className="intake-photo-grid">
                {photoAreas.map((area) => {
                  const photo = photos.find((item) => item.area === area);
                  return (
                    <div key={area} className="intake-photo-slot">
                      {photo && (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photo.dataUrl}
                            alt={`${area} kabul fotoğrafı`}
                          />
                          <button
                            type="button"
                            className="intake-remove-photo"
                            aria-label={`${area} fotoğrafını kaldır`}
                            onClick={() =>
                              setPhotos((current) =>
                                current.filter((item) => item.area !== area),
                              )
                            }
                          >
                            <X size={18} />
                          </button>
                        </>
                      )}
                      <label>
                        <Camera size={22} />
                        <strong>{area}</strong>
                        <span>
                          {photo ? "Fotoğrafı değiştir" : "Fotoğraf Seç"}
                        </span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={readingPhoto}
                          onChange={(event) => void selectPhoto(area, event)}
                          aria-label={`${area} fotoğrafı seç`}
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <p className="records-help">
                JPG, PNG, WebP · Her fotoğraf en fazla 5 MB.
              </p>
              {readingPhoto && <p role="status">Fotoğraf hazırlanıyor…</p>}
            </div>
          )}
          {step === 4 && (
            <div className="intake-step-body records-form">
              <div className="records-fields">
                <div className="ux-intake-tech-section">
                  <label className="ux-drawer-field-label">
                    <UserCheck size={14} /> Sorumlu Usta (Boşta Olanlar Öncelikli)
                  </label>
                  <div className="ux-tech-cards-grid">
                    {technicians.map((item) => {
                      const busyOrders = orders.filter(
                        (o) =>
                          (o.technicianId === item.id ||
                            o.assigneeIds.includes(item.id)) &&
                          isActive(o.status),
                      );
                      const isBusy = busyOrders.length > 0;
                      const isChosen = technicianId === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-tour="intake-tech-select"
                          className={`ux-tech-selector-card ${isChosen ? "is-chosen" : ""} ${isBusy ? "is-busy" : "is-available"}`}
                          onClick={() => setTechnicianId(item.id)}
                        >
                          <div className="ux-tech-card-top">
                            <strong>{item.name}</strong>
                            <span
                              className={`ux-tech-pill ${isBusy ? "is-busy" : "is-free"}`}
                            >
                              {isBusy ? `${busyOrders.length} aktif iş` : "Boşta"}
                            </span>
                          </div>
                          <small>{item.specialty || item.role}</small>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label>
                  Teslim hedefi
                  <input
                    type="datetime-local"
                    min={defaultAppointmentTime().slice(0,10)+"T00:00"}
                    value={due}
                    onChange={(event) => setDue(event.target.value)}
                  />
                </label>
              </div>
              <p className="records-help">
                Türkiye saati (UTC+3). Teslim hedefini servis planınıza göre belirleyin.</p>
              <section className="intake-review">
                <h3>
                  <ClipboardCheck size={20} /> İş Emri Özeti
                </h3>
                <dl>
                  <div>
                    <dt>Araç / Müşteri</dt>
                    <dd>
                      {vehicle?.plate} · {customer?.name}
                    </dd>
                  </div>
                  <div>
                    <dt>Kabul durumu</dt>
                    <dd>
                      {number(Number(mileage))} km · %{fuel} yakıt · {keyCount}{" "}
                      anahtar
                    </dd>
                  </div>
                  <div>
                    <dt>Bırakılan eşyalar</dt>
                    <dd>{leftItems.trim() || "Belirtilmedi"}</dd>
                  </div>
                  <div>
                    <dt>Şikâyet</dt>
                    <dd>{complaint}</dd>
                  </div>
                  <div>
                    <dt>Mevcut hasar</dt>
                    <dd>{hasDamage ? damage : "Görünür hasar yok."}</dd>
                  </div>
                  <div>
                    <dt>Fotoğraflar</dt>
                    <dd>
                      {photos.length
                        ? `${photos.length} fotoğraf · ${photos.map((photo) => photo.area).join(", ")}`
                        : "Fotoğraf eklenmedi"}
                    </dd>
                  </div>
                </dl>
                <ul className="records-checklist-summary">
                  {inspectionItems.map((item) => (
                    <li key={item.id}>
                      <span>{item.label}</span>
                      <strong>
                        {inspectionStateLabels[inspection[item.id] ?? "normal"]}
                      </strong>
                    </li>
                  ))}
                  {intakeChecklist.map((item) => (
                    <li key={item.id}>
                      <span>{item.label}</span>
                      <strong>
                        {
                          { yes: "Evet", no: "Hayır", na: "Uygulanamaz" }[
                            checklist[item.id]
                          ]
                        }
                      </strong>
                    </li>
                  ))}
                </ul>
                <p className="records-help">
                  İlk durum: Araç Kabul Edildi. Teklif, parça veya
                  tahsilat oluşmaz.
                </p>
              </section>
            </div>
          )}
          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              className="records-error intake-error"
              role="alert"
            >
              {error}
            </p>
          )}
          {!creating && (
            <div className="intake-footer">
              <Button
                type="button"
                variant="outline"
                disabled={step === 0 || readingPhoto}
                onClick={() => go(step - 1)}
              >
                <ArrowLeft /> Geri
              </Button>
              <Button
                type="button"
                disabled={readingPhoto}
                data-tour={step === 4 ? "intake-complete-btn" : undefined}
                onClick={step === 4 ? finish : next}
              >
                {step === 4
                  ? "Kabulü Tamamla"
                  : step === 3 && !photos.length
                    ? "Fotoğrafsız Devam Et"
                    : "Devam Et"}
                <ArrowRight />
              </Button>
            </div>
          )}
        </section>
        <aside className="intake-aside">
          <span className="app-overline">BU KABUL</span>
          <h2>{vehicle?.plate ?? "Araç seçilmedi"}</h2>
          <p>
            {vehicle
              ? `${vehicle.model}${vehicle.year ? ` · ${vehicle.year}` : ""}`
              : "Plakayla başlayın."}
          </p>
          {customer && (
            <p>
              <UserRound size={16} /> {customer.name}
            </p>
          )}
          <div>
            <span>Şube</span>
            <strong>{branchName(branchId)}</strong>
          </div>
          <div>
            <span>Tamamlanan adım</span>
            <strong>{step} / 5</strong>
          </div>
          
        </aside>
      </div>

      <PlateScannerModal
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onPlateConfirmed={(plate) => {
          const match = vehicles.find(
            (v) => normalizeSearch(v.plate) === normalizeSearch(plate),
          );
          if (match) {
            selectVehicle(match.id);
            setStep(1);
          } else {
            setQuery(plate);
          }
        }}
      />
    </div>
  );
}
