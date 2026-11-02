"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Phone,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  X,
  Edit2,
  ArrowRight,
  Calendar as CalendarIcon,
  Search,
} from "lucide-react";
import { useDemo } from "@/components/app-shell/demo-provider";
import { useOperations } from "./operations-store";
import { ModuleHeading } from "./module-ui";
import { Button } from "@/components/ui/button";

// Saat Aralığı (08:00 - 19:00 arası 12 saatlik çalışma dilimi)
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 19;
const HOURS = Array.from(
  { length: DEFAULT_END_HOUR - DEFAULT_START_HOUR + 1 },
  (_, i) => DEFAULT_START_HOUR + i,
);

const DAY_NAMES_TR = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
];

const SHORT_DAY_NAMES_TR = [
  "Paz",
  "Pzt",
  "Sal",
  "Çar",
  "Per",
  "Cum",
  "Cmt",
];

const MONTH_NAMES_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

function formatTimeHour(h: number): string {
  return `${h.toString().padStart(2, "0")}:00`;
}

function formatDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateISO(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// Duruma göre pastel stil sınıfı belirleme
function getStatusTheme(status?: string): {
  cardClass: string;
  pillClass: string;
  label: string;
} {
  const s = (status || "Planlandı").trim();
  switch (s) {
    case "Onaylandı":
      return {
        cardClass: "status-confirmed",
        pillClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
        label: "Onaylandı",
      };
    case "Geldi":
    case "Servise Geldi":
      return {
        cardClass: "status-arrived",
        pillClass: "bg-purple-100 text-purple-800 border-purple-200",
        label: "Servise Geldi",
      };
    case "Tamamlandı":
      return {
        cardClass: "status-completed",
        pillClass: "bg-slate-100 text-slate-700 border-slate-300",
        label: "Tamamlandı",
      };
    case "İptal":
      return {
        cardClass: "status-cancelled",
        pillClass: "bg-rose-100 text-rose-800 border-rose-200",
        label: "İptal",
      };
    case "Gecikti":
      return {
        cardClass: "status-delayed",
        pillClass: "bg-amber-100 text-amber-800 border-amber-200",
        label: "Gecikti",
      };
    case "Planlandı":
    default:
      return {
        cardClass: "status-planned",
        pillClass: "bg-sky-100 text-sky-800 border-sky-200",
        label: "Planlandı",
      };
  }
}

export function CalendarPage() {
  const demo = useDemo();
  const { data } = useOperations();

  // Seçili tarih ve görünüm modu (varsayılan: haftalık desktop, günlük mobil)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() =>
    formatDateISO(new Date()),
  );
  const [viewMode, setViewMode] = useState<"daily" | "weekly">("weekly");

  // Ekran boyutunu izle (mobilde varsayılan günlük görünüm)
  useEffect(() => {
    function checkWidth() {
      if (window.innerWidth < 768) {
        setViewMode("daily");
      }
    }
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  // Hızlı Detay Drawer State
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [isEditingInDrawer, setIsEditingInDrawer] = useState<boolean>(false);

  // Yeni Randevu Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newModalDate, setNewModalDate] = useState<string>("");
  const [newModalHour, setNewModalHour] = useState<string>("09:00");
  const [newVehicleSearch, setNewVehicleSearch] = useState<string>("");
  const [newSelectedVehicleId, setNewSelectedVehicleId] = useState<string>("");
  const [newTechnicianId, setNewTechnicianId] = useState<string>("");
  const [newNote, setNewNote] = useState<string>("");
  const [newStatus, setNewStatus] = useState<string>("Planlandı");
  const [formError, setFormError] = useState<string>("");

  // İptal Onay Dialog State
  const [confirmCancelApptId, setConfirmCancelApptId] = useState<string | null>(
    null,
  );

  // Drag & Drop ve Resize State'leri
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<"move" | "resize" | null>(null);
  const [dragPointerPos, setDragPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [dragTargetSlot, setDragTargetSlot] = useState<{
    dateStr: string;
    hour: number;
    minute: number;
    isConflict?: boolean;
    conflictReason?: string;
  } | null>(null);
  const [resizeDuration, setResizeDuration] = useState<number | null>(null);
  const [dragToast, setDragToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDragToast = useCallback((message: string, isError = false) => {
    if (dragToastTimerRef.current) clearTimeout(dragToastTimerRef.current);
    setDragToast({ message, isError });
    dragToastTimerRef.current = setTimeout(() => {
      setDragToast(null);
    }, 3500);
  }, []);

  // Aktif Branşa ait randevular (23 Branş İzolasyonu)
  const branchAppointments = useMemo(() => {
    return demo.demoAppointments.filter((a) => a.branchId === demo.branchId);
  }, [demo.demoAppointments, demo.branchId]);

  // Aktif Branş Teknisyenleri
  const branchTechnicians = useMemo(() => {
    return data.employees.filter(
      (e) => e.branchId === demo.branchId && e.active,
    );
  }, [data.employees, demo.branchId]);

  // Seçili tarihin Date objesi
  const currentDate = useMemo(
    () => parseDateISO(selectedDateStr),
    [selectedDateStr],
  );

  // Haftalık Görünüm İçin 7 Günün Hesaplanması (Pazartesi başlangıçlı ISO Hafta)
  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const dayOfWeek = d.getDay(); // 0: Pazar, 1: Pazartesi, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);

    const todayStr = formatDateISO(new Date());

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const dateStr = formatDateISO(dayDate);
      return {
        dateStr,
        dateObj: dayDate,
        dayNum: dayDate.getDate(),
        monthNum: dayDate.getMonth(),
        monthName: MONTH_NAMES_TR[dayDate.getMonth()],
        dayName: DAY_NAMES_TR[dayDate.getDay()],
        shortDay: SHORT_DAY_NAMES_TR[dayDate.getDay()],
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
      };
    });
  }, [currentDate, selectedDateStr]);

  // Randevuları Tarih ve Saat Dilimine Göre İndeksle
  // Key: "YYYY-MM-DD:HH"
  const { appointmentSlotMap, technicianConflictMap } = useMemo(() => {
    const slotMap = new Map<string, typeof branchAppointments[number][]>();
    const techSchedule = new Map<string, typeof branchAppointments[number][]>();

    for (const appt of branchAppointments) {
      if (!appt.at) continue;
      const dateKey = appt.at.slice(0, 10);
      const hourNum = parseInt(appt.at.slice(11, 13), 10);
      if (isNaN(hourNum)) continue;

      const slotKey = `${dateKey}:${hourNum}`;
      const existing = slotMap.get(slotKey) || [];
      existing.push(appt);
      slotMap.set(slotKey, existing);

      // Teknisyen Çakışma Kontrolü
      if (appt.technicianId && appt.status !== "İptal") {
        const techKey = `${appt.technicianId}:${dateKey}:${hourNum}`;
        const techExisting = techSchedule.get(techKey) || [];
        techExisting.push(appt);
        techSchedule.set(techKey, techExisting);
      }
    }

    // Çakışan Randevu ID'leri
    const conflictSet = new Set<string>();
    for (const [, appts] of techSchedule.entries()) {
      if (appts.length > 1) {
        for (const a of appts) conflictSet.add(a.id);
      }
    }

    return {
      appointmentSlotMap: slotMap,
      technicianConflictMap: conflictSet,
    };
  }, [branchAppointments]);

  // Randevu Detay Haritası (Araç, Müşteri, Teknisyen İlişkileri)
  const getAppointmentDetails = useCallback(
    (appt: typeof branchAppointments[number]) => {
      const vehicle = demo.vehicles.find((v) => v.id === appt.vehicleId);
      const customer = demo.customers.find((c) => c.id === vehicle?.customerId);
      const tech = data.employees.find((e) => e.id === appt.technicianId);
      const hasConflict = technicianConflictMap.has(appt.id);
      const theme = getStatusTheme(appt.status);

      return {
        appointment: appt,
        vehicle,
        customer,
        technician: tech,
        hasConflict,
        theme,
      };
    },
    [demo.vehicles, demo.customers, data.employees, technicianConflictMap],
  );

  // Drag işlemi için aktif randevu nesnesi
  const draggingAppt = useMemo(() => {
    if (!activeDragId) return null;
    const found = branchAppointments.find((a) => a.id === activeDragId);
    if (!found) return null;
    return getAppointmentDetails(found);
  }, [activeDragId, branchAppointments, getAppointmentDetails]);

  // Çakışma ve İzin Kontrol Fonksiyonu
  const checkAppointmentConflict = useCallback(
    (
      apptId: string,
      targetDateStr: string,
      targetHour: number,
      targetMinute: number,
      targetDuration = 60,
    ): { hasConflict: boolean; reason?: string } => {
      const appt = branchAppointments.find((a) => a.id === apptId);
      if (!appt) return { hasConflict: false };

      // Tamamlandı veya İptal durumundakiler taşınamaz
      if (appt.status === "Tamamlandı") {
        return { hasConflict: true, reason: "Tamamlanmış randevular başka bir saate taşınamaz." };
      }
      if (appt.status === "İptal") {
        return { hasConflict: true, reason: "İptal edilmiş randevular taşınamaz." };
      }

      // Çalışma saatleri kontrolü (08:00 - 19:00)
      const targetStartMinutes = targetHour * 60 + targetMinute;
      const targetEndMinutes = targetStartMinutes + targetDuration;
      if (targetStartMinutes < DEFAULT_START_HOUR * 60 || targetEndMinutes > (DEFAULT_END_HOUR + 1) * 60) {
        return { hasConflict: true, reason: "Randevu işletme çalışma saatleri (08:00 - 20:00) dışına taşınamaz." };
      }

      // Teknisyen çakışma kontrolü
      if (appt.technicianId) {
        for (const other of branchAppointments) {
          if (other.id === apptId || other.status === "İptal") continue;
          if (other.technicianId !== appt.technicianId) continue;
          if (!other.at || other.at.slice(0, 10) !== targetDateStr) continue;

          const otherHour = parseInt(other.at.slice(11, 13), 10) || 0;
          const otherMin = parseInt(other.at.slice(14, 16), 10) || 0;
          const otherDuration = other.durationMinutes || 60;

          const otherStart = otherHour * 60 + otherMin;
          const otherEnd = otherStart + otherDuration;

          // Zaman aralığı çakışması (Overlap check)
          if (targetStartMinutes < otherEnd && targetEndMinutes > otherStart) {
            const techName = data.employees.find((e) => e.id === appt.technicianId)?.name || "Usta";
            return {
              hasConflict: true,
              reason: `${techName} bu saat aralığında (${other.at.slice(11, 16)}) başka bir randevuda görevli!`,
            };
          }
        }
      }

      return { hasConflict: false };
    },
    [branchAppointments, data.employees],
  );

  // Global Pointer Events (Sürükleme ve Resize Dinleyicileri)
  useEffect(() => {
    if (!activeDragId || !dragType) return;

    function handlePointerMove(e: PointerEvent) {
      setDragPointerPos({ x: e.clientX, y: e.clientY });

      // Otomatik Kaydırma (Auto-scroll)
      if (scrollContainerRef.current) {
        const rect = scrollContainerRef.current.getBoundingClientRect();
        const threshold = 60;
        const scrollSpeed = 14;

        if (e.clientY < rect.top + threshold) {
          scrollContainerRef.current.scrollTop -= scrollSpeed;
        } else if (e.clientY > rect.bottom - threshold) {
          scrollContainerRef.current.scrollTop += scrollSpeed;
        }

        if (e.clientX < rect.left + threshold) {
          scrollContainerRef.current.scrollLeft -= scrollSpeed;
        } else if (e.clientX > rect.right - threshold) {
          scrollContainerRef.current.scrollLeft += scrollSpeed;
        }
      }

      if (dragType === "move") {
        // Fare altındaki elementi tespit et (Slot tespiti)
        const elemUnder = document.elementFromPoint(e.clientX, e.clientY);
        const slotElem = elemUnder?.closest(".calendar-slot-cell, .calendar-daily-row") as HTMLElement | null;

        if (slotElem) {
          const slotDate = slotElem.getAttribute("data-date");
          const slotHourStr = slotElem.getAttribute("data-hour");

          if (slotDate && slotHourStr) {
            const hour = parseInt(slotHourStr, 10);
            const rect = slotElem.getBoundingClientRect();
            const relY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
            const quarter = Math.min(3, Math.floor((relY / rect.height) * 4));
            const minute = quarter * 15;

            const duration = draggingAppt?.appointment.durationMinutes || 60;
            const conflictCheck = activeDragId
              ? checkAppointmentConflict(activeDragId, slotDate, hour, minute, duration)
              : { hasConflict: false };

            setDragTargetSlot({
              dateStr: slotDate,
              hour,
              minute,
              isConflict: conflictCheck.hasConflict,
              conflictReason: conflictCheck.reason,
            });
            return;
          }
        }
        setDragTargetSlot(null);
      } else if (dragType === "resize") {
        // Süre değiştirme hesabı (15 dk hassasiyet)
        const appt = branchAppointments.find((a) => a.id === activeDragId);
        if (appt && appt.at) {
          const cardElem = document.querySelector(`[data-appt-id="${activeDragId}"]`);
          if (cardElem) {
            const rect = cardElem.getBoundingClientRect();
            const deltaY = e.clientY - rect.bottom;
            const stepMinutes = Math.round(deltaY / 20) * 15;
            const currentDur = appt.durationMinutes || 60;
            const nextDuration = Math.max(15, Math.min(480, currentDur + stepMinutes));
            setResizeDuration(nextDuration);
          }
        }
      }
    }

    function handlePointerUp() {
      if (dragType === "move" && dragTargetSlot && activeDragId) {
        if (dragTargetSlot.isConflict) {
          showDragToast(dragTargetSlot.conflictReason || "Bu saat dilimine taşıma yapılamaz!", true);
        } else {
          // Başarılı Taşıma Kaydı
          const dateStr = dragTargetSlot.dateStr;
          const timeStr = `${dragTargetSlot.hour.toString().padStart(2, "0")}:${dragTargetSlot.minute.toString().padStart(2, "0")}`;
          const newAt = `${dateStr}T${timeStr}`;

          const curAppt = branchAppointments.find((a) => a.id === activeDragId);
          const duration = curAppt?.durationMinutes || 60;
          const startDate = new Date(newAt);
          const endDate = new Date(startDate.getTime() + duration * 60000);

          demo.updateAppointment(activeDragId, {
            at: newAt,
            endAt: endDate.toISOString(),
            durationMinutes: duration,
          });

          showDragToast(`Randevu ${dateStr} saat ${timeStr}'e başarıyla taşındı.`);
        }
      } else if (dragType === "resize" && resizeDuration && activeDragId) {
        const curAppt = branchAppointments.find((a) => a.id === activeDragId);
        if (curAppt && curAppt.at) {
          const startDate = new Date(curAppt.at);
          const endDate = new Date(startDate.getTime() + resizeDuration * 60000);

          const startHour = parseInt(curAppt.at.slice(11, 13), 10) || 0;
          const startMin = parseInt(curAppt.at.slice(14, 16), 10) || 0;
          const dateKey = curAppt.at.slice(0, 10);

          const conflictCheck = checkAppointmentConflict(activeDragId, dateKey, startHour, startMin, resizeDuration);
          if (conflictCheck.hasConflict) {
            showDragToast(conflictCheck.reason || "Süre uzatımı çakışmaya neden oldu!", true);
          } else {
            demo.updateAppointment(activeDragId, {
              durationMinutes: resizeDuration,
              endAt: endDate.toISOString(),
            });
            showDragToast(`Randevu süresi ${resizeDuration} dakikaya güncellendi.`);
          }
        }
      }

      // Sıfırla
      setActiveDragId(null);
      setDragType(null);
      setDragPointerPos(null);
      setDragTargetSlot(null);
      setResizeDuration(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [
    activeDragId,
    dragType,
    dragTargetSlot,
    resizeDuration,
    branchAppointments,
    checkAppointmentConflict,
    demo,
    draggingAppt,
    showDragToast,
  ]);

  // Randevu Başlatıcılar
  const handleStartCardDrag = useCallback(
    (e: React.PointerEvent, apptId: string) => {
      // Eğer kullanıcı resize barına veya aksiyon linkine bastıysa drag'i başlatma
      if ((e.target as HTMLElement).closest(".calendar-card-resize-handle, a, button")) {
        return;
      }

      const appt = branchAppointments.find((a) => a.id === apptId);
      if (appt?.status === "Tamamlandı" || appt?.status === "İptal") {
        showDragToast("Tamamlanmış veya iptal edilmiş randevular taşınamaz.", true);
        return;
      }

      // Mobilde normal tıklama ile sürüklemeyi ayırmak için uzun basma desteği
      const clientX = e.clientX;
      const clientY = e.clientY;
      if (e.pointerType === "touch") {
        longPressTimerRef.current = setTimeout(() => {
          // Destekleyen mobil tarayıcılarda hafif dokunsal titreşim (Haptic Feedback)
          if (typeof window !== "undefined" && "vibrate" in navigator) {
            try {
              navigator.vibrate(35);
            } catch {}
          }
          setActiveDragId(apptId);
          setDragType("move");
          setDragPointerPos({ x: clientX, y: clientY });
        }, 220);
      } else {
        // Masaüstünde doğrudan fare basılı tutulduğunda
        setActiveDragId(apptId);
        setDragType("move");
        setDragPointerPos({ x: clientX, y: clientY });
      }
    },
    [branchAppointments, showDragToast],
  );

  const handlePointerUpTouchGuard = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleStartResize = useCallback(
    (e: React.PointerEvent, apptId: string) => {
      e.stopPropagation();
      e.preventDefault();
      const appt = branchAppointments.find((a) => a.id === apptId);
      if (appt?.status === "Tamamlandı" || appt?.status === "İptal") {
        showDragToast("Tamamlanmış veya iptal edilmiş randevuların süresi değiştirilemez.", true);
        return;
      }
      setActiveDragId(apptId);
      setDragType("resize");
      setDragPointerPos({ x: e.clientX, y: e.clientY });
      setResizeDuration(appt?.durationMinutes || 60);
    },
    [branchAppointments, showDragToast],
  );

  // Navigasyon Fonksiyonları
  const handlePrev = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - (viewMode === "weekly" ? 7 : 1));
    setSelectedDateStr(formatDateISO(d));
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (viewMode === "weekly" ? 7 : 1));
    setSelectedDateStr(formatDateISO(d));
  };

  const handleToday = () => {
    setSelectedDateStr(formatDateISO(new Date()));
  };

  // Boş Saate Tıklayarak Yeni Randevu Açma
  const handleEmptySlotClick = (dateStr: string, hourNum: number) => {
    setNewModalDate(dateStr);
    setNewModalHour(formatTimeHour(hourNum));
    setNewVehicleSearch("");
    setNewSelectedVehicleId(demo.vehicles[0]?.id || "");
    setNewTechnicianId(branchTechnicians[0]?.id || "");
    setNewNote("");
    setNewStatus("Planlandı");
    setFormError("");
    setIsNewModalOpen(true);
  };

  // Üst Bar "+ Yeni Randevu" Tıklaması
  const handleOpenNewModalDirect = () => {
    setNewModalDate(selectedDateStr);
    setNewModalHour("09:00");
    setNewVehicleSearch("");
    setNewSelectedVehicleId(demo.vehicles[0]?.id || "");
    setNewTechnicianId(branchTechnicians[0]?.id || "");
    setNewNote("");
    setNewStatus("Planlandı");
    setFormError("");
    setIsNewModalOpen(true);
  };

  // Yeni Randevu Form Kaydetme
  const handleSaveNewAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!newSelectedVehicleId) {
      setFormError("Lütfen bir araç seçin.");
      return;
    }
    if (!newModalDate || !newModalHour) {
      setFormError("Tarih ve saat zorunludur.");
      return;
    }

    const atISO = `${newModalDate}T${newModalHour.slice(0, 5)}`;
    const success = demo.addAppointment(
      newSelectedVehicleId,
      atISO,
      newNote.trim() || `${demo.activeBranchProfile.name} Randevusu`,
      newTechnicianId || undefined,
      newStatus || "Planlandı",
    );

    if (!success) {
      setFormError(
        "Bu araç için bu saatte zaten bir randevu mevcut veya tarih geçersiz.",
      );
      return;
    }

    setIsNewModalOpen(false);
  };

  // Seçili Randevu Objesi
  const activeDetailAppt = useMemo(() => {
    if (!selectedAppointmentId) return null;
    const found = branchAppointments.find((a) => a.id === selectedAppointmentId);
    if (!found) return null;
    return getAppointmentDetails(found);
  }, [selectedAppointmentId, branchAppointments, getAppointmentDetails]);

  // Drawer'da Düzenleme State'leri
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editTechId, setEditTechId] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editStatus, setEditStatus] = useState("");

  const handleStartDrawerEdit = () => {
    if (!activeDetailAppt) return;
    const at = activeDetailAppt.appointment.at || "";
    setEditDate(at.slice(0, 10));
    setEditTime(at.slice(11, 16) || "09:00");
    setEditTechId(activeDetailAppt.appointment.technicianId || "");
    setEditNote(activeDetailAppt.appointment.note || "");
    setEditStatus(activeDetailAppt.appointment.status || "Planlandı");
    setIsEditingInDrawer(true);
  };

  const handleCloseDrawer = () => {
    setSelectedAppointmentId(null);
    setIsEditingInDrawer(false);
  };

  const handleSaveDrawerEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointmentId) return;
    const newAt = `${editDate}T${editTime.slice(0, 5)}`;
    demo.updateAppointment(selectedAppointmentId, {
      at: newAt,
      technicianId: editTechId,
      note: editNote.trim(),
      status: editStatus,
    });
    setIsEditingInDrawer(false);
  };

  // Randevu İptal Et
  const handleConfirmCancel = () => {
    if (!confirmCancelApptId) return;
    demo.updateAppointment(confirmCancelApptId, { status: "İptal" });
    setConfirmCancelApptId(null);
  };

  // Randevu Kalıcı Sil
  const handleDeleteAppointment = (id: string) => {
    if (window.confirm("Bu randevu kaydını silmek istediğinize emin misiniz?")) {
      demo.deleteAppointment(id);
      setSelectedAppointmentId(null);
    }
  };

  // Seçili Hafta veya Gün İçin Metrikler
  const activePeriodAppointments = useMemo(() => {
    if (viewMode === "daily") {
      return branchAppointments.filter(
        (a) => a.at && a.at.slice(0, 10) === selectedDateStr,
      );
    } else {
      const datesInWeek = new Set(weekDays.map((w) => w.dateStr));
      return branchAppointments.filter(
        (a) => a.at && datesInWeek.has(a.at.slice(0, 10)),
      );
    }
  }, [branchAppointments, viewMode, selectedDateStr, weekDays]);

  const stats = useMemo(() => {
    const total = activePeriodAppointments.length;
    const arrived = activePeriodAppointments.filter(
      (a) => a.status === "Geldi" || a.status === "Servise Geldi",
    ).length;
    const completed = activePeriodAppointments.filter(
      (a) => a.status === "Tamamlandı",
    ).length;
    const planned = activePeriodAppointments.filter(
      (a) => a.status === "Planlandı" || !a.status,
    ).length;
    const conflicts = activePeriodAppointments.filter((a) =>
      technicianConflictMap.has(a.id),
    ).length;

    return { total, arrived, completed, planned, conflicts };
  }, [activePeriodAppointments, technicianConflictMap]);

  // Seçili Tarih Formatı (Türkçe Başlık)
  const headerDateLabel = useMemo(() => {
    if (viewMode === "daily") {
      const d = currentDate;
      return `${d.getDate()} ${MONTH_NAMES_TR[d.getMonth()]} ${d.getFullYear()}, ${DAY_NAMES_TR[d.getDay()]}`;
    } else {
      const first = weekDays[0];
      const last = weekDays[6];
      return `${first.dayNum} ${first.monthName} - ${last.dayNum} ${last.monthName} ${last.dateObj.getFullYear()}`;
    }
  }, [viewMode, currentDate, weekDays]);

  // Filtrelenmiş Araç Arama Listesi (Yeni Randevu Modalı)
  const filteredVehicles = useMemo(() => {
    const q = newVehicleSearch.toLocaleLowerCase("tr").trim();
    if (!q) return demo.vehicles;
    return demo.vehicles.filter((v) => {
      const c = demo.customers.find((cust) => cust.id === v.customerId);
      return (
        v.plate.toLocaleLowerCase("tr").includes(q) ||
        v.model.toLocaleLowerCase("tr").includes(q) ||
        (c && c.name.toLocaleLowerCase("tr").includes(q))
      );
    });
  }, [demo.vehicles, demo.customers, newVehicleSearch]);

  // Seçili teknisyenin yeni randevu saatinde çakışması var mı?
  const isNewTechnicianConflicted = useMemo(() => {
    if (!newTechnicianId || !newModalDate || !newModalHour) return false;
    const hourNum = parseInt(newModalHour.slice(0, 2), 10);
    const key = `${newModalDate}:${hourNum}`;
    const slotAppts = appointmentSlotMap.get(key) || [];
    return slotAppts.some(
      (a) => a.technicianId === newTechnicianId && a.status !== "İptal",
    );
  }, [newTechnicianId, newModalDate, newModalHour, appointmentSlotMap]);

  return (
    <div className="module-page calendar-root">
      {/* Sayfa Başlığı */}
      <ModuleHeading
        overline="OTO SERVİS ÇALIŞMA PLANI"
        title="Randevu Çizelgesi"
        subtitle="Hangi gün, hangi saatte, hangi aracın geleceğini kaydırılabilir zaman çizelgesinde takip edin."
        action={
          <div data-tour="calendar-new-appt-btn">
            <button
              type="button"
              className="calendar-new-btn"
              onClick={handleOpenNewModalDirect}
            >
              <Plus size={16} /> Yeni Randevu
            </button>
          </div>
        }
      />

      {/* Kompakt Tek Satır Metrik Çubuğu */}
      <div className="calendar-metrics-bar">
        <div className="calendar-metrics-group">
          <span className="calendar-metric-pill is-primary">
            Toplam: <strong>{stats.total}</strong> Randevu
          </span>
          <span className="calendar-metric-pill">
            Planlandı: <strong>{stats.planned}</strong>
          </span>
          <span className="calendar-metric-pill is-success">
            Servise Gelen / Tamamlanan: <strong>{stats.arrived + stats.completed}</strong>
          </span>
          {stats.conflicts > 0 && (
            <span className="calendar-metric-pill is-warning">
              <AlertTriangle size={13} /> {stats.conflicts} Usta Çakışması
            </span>
          )}
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Çalışma Saatleri: <strong>08:00 – 19:00</strong> · {demo.activeBranchProfile.name}
        </div>
      </div>

      {/* Navigasyon ve Kontrol Araç Çubuğu */}
      <div className="calendar-toolbar">
        <div className="calendar-toolbar-left">
          {/* Görünüm Değiştirici */}
          <div className="calendar-view-segmented" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "daily"}
              className={`calendar-view-btn ${viewMode === "daily" ? "active" : ""}`}
              onClick={() => setViewMode("daily")}
            >
              Günlük
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "weekly"}
              className={`calendar-view-btn ${viewMode === "weekly" ? "active" : ""}`}
              onClick={() => setViewMode("weekly")}
            >
              Haftalık
            </button>
          </div>

          {/* Tarih Değiştirme Butonları */}
          <div className="calendar-nav-group">
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handlePrev}
              title={viewMode === "weekly" ? "Önceki Hafta" : "Önceki Gün"}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="calendar-today-btn"
              onClick={handleToday}
            >
              Bugün
            </button>
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={handleNext}
              title={viewMode === "weekly" ? "Sonraki Hafta" : "Sonraki Gün"}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Tarih Başlığı */}
          <h2 className="calendar-current-date-title">
            <CalendarIcon size={16} className="text-blue-600" />
            {headerDateLabel}
          </h2>
        </div>

        <div className="calendar-toolbar-right">
          {/* Doğrudan Tarih Seçici */}
          <input
            type="date"
            aria-label="Tarihe Git"
            className="calendar-date-picker-input"
            value={selectedDateStr}
            onChange={(e) => {
              if (e.target.value) setSelectedDateStr(e.target.value);
            }}
          />
        </div>
      </div>

      {/* Mobil Yatay Gün Şeridi */}
      <div className="calendar-mobile-day-strip">
        {weekDays.map((day) => {
          const hasAppts = (appointmentSlotMap.size > 0 &&
            HOURS.some((h) => appointmentSlotMap.has(`${day.dateStr}:${h}`)));

          return (
            <button
              key={day.dateStr}
              type="button"
              className={`calendar-mobile-day-pill ${
                day.dateStr === selectedDateStr ? "active" : ""
              }`}
              onClick={() => {
                setSelectedDateStr(day.dateStr);
                if (viewMode !== "daily") setViewMode("daily");
              }}
            >
              <span className="calendar-mobile-day-name">{day.shortDay}</span>
              <span className="calendar-mobile-day-num">{day.dayNum}</span>
              {hasAppts && <span className="calendar-mobile-day-dot" />}
            </button>
          );
        })}
      </div>

      {/* Takvim Çizelgesi Kartı ve Scroll Alanı */}
      <div className="calendar-viewport-card">
        <div className="calendar-scroll-container" ref={scrollContainerRef}>
          {viewMode === "weekly" ? (
            /* ================= HAFTALIK GÖRÜNÜM ================= */
            <div className="calendar-weekly-table">
              {/* Sol Üst Köşe Kesişimi */}
              <div className="calendar-corner-cell">Saat</div>

              {/* 7 Günlük Sütun Başlıkları (Sticky Header) */}
              {weekDays.map((day) => (
                <div
                  key={`head-${day.dateStr}`}
                  className={`calendar-header-cell ${day.isToday ? "is-today" : ""}`}
                >
                  <div className="calendar-header-day-title">
                    <span className="calendar-header-day-name">
                      {day.shortDay}
                    </span>
                    <span className="calendar-header-day-num">
                      {day.dayNum}
                    </span>
                  </div>
                </div>
              ))}

              {/* Saat Satırları (08:00 - 19:00) */}
              {HOURS.map((hour) => {
                const hourFormatted = formatTimeHour(hour);

                return (
                  <div key={`hour-row-${hour}`} style={{ display: "contents" }}>
                    {/* Sticky Sol Saat Kolonu */}
                    <div className="calendar-time-cell">{hourFormatted}</div>

                    {/* 7 Günün Her Biri İçin Hücre */}
                    {weekDays.map((day) => {
                      const slotKey = `${day.dateStr}:${hour}`;
                      const apptsInSlot = appointmentSlotMap.get(slotKey) || [];
                      const isMulti = apptsInSlot.length > 1;

                      const isTarget =
                        dragTargetSlot &&
                        dragTargetSlot.dateStr === day.dateStr &&
                        dragTargetSlot.hour === hour;

                      return (
                        <div
                          key={`slot-${day.dateStr}-${hour}`}
                          data-date={day.dateStr}
                          data-hour={hour}
                          className={`calendar-slot-cell ${
                            day.isToday ? "is-today-col" : ""
                          } ${
                            isTarget
                              ? dragTargetSlot.isConflict
                                ? "is-drop-target-conflict"
                                : "is-drop-target"
                              : ""
                          }`}
                          onClick={() => handleEmptySlotClick(day.dateStr, hour)}
                        >
                          {/* Sürükleme hedefi canlı etiket önizlemesi */}
                          {isTarget && (
                            <div
                              className={`calendar-slot-drop-preview-pill ${
                                dragTargetSlot.isConflict ? "is-conflict" : ""
                              }`}
                            >
                              <span>
                                {dragTargetSlot.hour.toString().padStart(2, "0")}:
                                {dragTargetSlot.minute.toString().padStart(2, "0")}
                              </span>
                              <span>{dragTargetSlot.isConflict ? "Çakışma!" : "Bırak"}</span>
                            </div>
                          )}

                          {/* Boş Saat Hücresine Hover'da Tıklama İpucu */}
                          {apptsInSlot.length === 0 && !isTarget && (
                            <div className="calendar-slot-add-hint">
                              <Plus size={13} /> Randevu Ekle
                            </div>
                          )}

                          {/* Randevular Varsa Kartları Göster */}
                          {apptsInSlot.length > 0 && (
                            <div
                              className={`calendar-slot-appointments ${
                                isMulti ? "is-multi" : ""
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {apptsInSlot.map((appt) => {
                                const details = getAppointmentDetails(appt);
                                const isCurrentDrag = activeDragId === appt.id;
                                const duration =
                                  isCurrentDrag && resizeDuration
                                    ? resizeDuration
                                    : appt.durationMinutes || 60;
                                const heightPx = Math.max(70, (duration / 60) * 85);

                                return (
                                  <div
                                    key={appt.id}
                                    data-appt-id={appt.id}
                                    style={{
                                      minHeight: `${heightPx}px`,
                                    }}
                                    className={`calendar-card ${details.theme.cardClass} ${
                                      isCurrentDrag && dragType === "move" ? "is-dragging" : ""
                                    }`}
                                    onPointerDown={(e) => handleStartCardDrag(e, appt.id)}
                                    onPointerUp={handlePointerUpTouchGuard}
                                    onClick={() => setSelectedAppointmentId(appt.id)}
                                    title="Tıklayın: Detay | Sürükleyin: Saati değiştir | Alt kenar: Süreyi ayarla"
                                  >
                                    <div className="calendar-card-head">
                                      <span className="calendar-card-time">
                                        {appt.at?.slice(11, 16)}
                                        {duration !== 60 && (
                                          <span className="text-[10px] opacity-75 font-normal ml-1">
                                            ({duration} dk)
                                          </span>
                                        )}
                                      </span>
                                      <strong className="calendar-card-plate">
                                        {details.vehicle?.plate || "Plaka Yok"}
                                      </strong>
                                    </div>

                                    <div className="calendar-card-customer">
                                      {details.customer?.name || "Müşteri Yok"}
                                    </div>

                                    <div className="calendar-card-job">
                                      {appt.note || "Periyodik Servis"}
                                    </div>

                                    <div className="calendar-card-footer">
                                      <span className="calendar-card-tech">
                                        <Wrench size={11} />
                                        {details.technician?.name || "Usta Yok"}
                                      </span>
                                      <span className="calendar-card-status-pill">
                                        {details.theme.label}
                                      </span>
                                    </div>

                                    {details.hasConflict && (
                                      <span className="calendar-conflict-badge">
                                        <AlertTriangle size={10} /> Çakışma
                                      </span>
                                    )}

                                    {/* Kart Süresini Ayarlama Alt Resize Handle'ı */}
                                    <div
                                      className="calendar-card-resize-handle"
                                      onPointerDown={(e) => handleStartResize(e, appt.id)}
                                      title="Süreyi uzatmak/kısaltmak için dikey sürükleyin"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= GÜNLÜK GÖRÜNÜM ================= */
            <div className="calendar-daily-table">
              {HOURS.map((hour) => {
                const hourFormatted = formatTimeHour(hour);
                const slotKey = `${selectedDateStr}:${hour}`;
                const apptsInSlot = appointmentSlotMap.get(slotKey) || [];

                const isTarget =
                  dragTargetSlot &&
                  dragTargetSlot.dateStr === selectedDateStr &&
                  dragTargetSlot.hour === hour;

                return (
                  <div
                    key={`daily-row-${hour}`}
                    data-date={selectedDateStr}
                    data-hour={hour}
                    className={`calendar-daily-row ${
                      isTarget
                        ? dragTargetSlot.isConflict
                          ? "is-drop-target-conflict"
                          : "is-drop-target"
                        : ""
                    }`}
                    onClick={() => handleEmptySlotClick(selectedDateStr, hour)}
                  >
                    {/* Saat Kolonu */}
                    <div className="calendar-daily-time-col">
                      {hourFormatted}
                    </div>

                    {/* Günlük Saat İçerik Alanı */}
                    <div
                      className="calendar-daily-content-col"
                      onClick={(e) => {
                        if (apptsInSlot.length > 0) e.stopPropagation();
                      }}
                    >
                      {/* Canlı bırakma önizlemesi */}
                      {isTarget && (
                        <div
                          className={`calendar-slot-drop-preview-pill ${
                            dragTargetSlot.isConflict ? "is-conflict" : ""
                          }`}
                        >
                          <span>
                            {dragTargetSlot.hour.toString().padStart(2, "0")}:
                            {dragTargetSlot.minute.toString().padStart(2, "0")}
                          </span>
                          <span>{dragTargetSlot.isConflict ? "Çakışma!" : "Bırak"}</span>
                        </div>
                      )}

                      {apptsInSlot.length === 0 ? (
                        <button
                          type="button"
                          className="calendar-daily-empty-action"
                          onClick={() =>
                            handleEmptySlotClick(selectedDateStr, hour)
                          }
                        >
                          <Plus size={13} /> {hourFormatted} saatine randevu ekle
                        </button>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                          {apptsInSlot.map((appt) => {
                            const details = getAppointmentDetails(appt);
                            const isCurrentDrag = activeDragId === appt.id;
                            const duration =
                              isCurrentDrag && resizeDuration
                                ? resizeDuration
                                : appt.durationMinutes || 60;

                            return (
                              <div
                                key={appt.id}
                                data-appt-id={appt.id}
                                className={`calendar-card ${details.theme.cardClass} p-3.5 ${
                                  isCurrentDrag && dragType === "move" ? "is-dragging" : ""
                                }`}
                                onPointerDown={(e) => handleStartCardDrag(e, appt.id)}
                                onPointerUp={handlePointerUpTouchGuard}
                                onClick={() =>
                                  setSelectedAppointmentId(appt.id)
                                }
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <Clock size={13} />
                                    <span className="font-mono font-bold text-xs">
                                      {appt.at?.slice(11, 16)}
                                      {duration !== 60 && (
                                        <span className="text-[10px] opacity-75 font-normal ml-1">
                                          ({duration} dk)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <strong className="calendar-card-plate text-xs px-2 py-0.5">
                                    {details.vehicle?.plate || "Plaka"}
                                  </strong>
                                </div>

                                <div className="mt-1">
                                  <div className="font-bold text-sm text-slate-900">
                                    {details.customer?.name || "Müşteri Kayıtlı Değil"}
                                  </div>
                                  <div className="text-xs text-slate-600 mt-0.5">
                                    {details.vehicle?.model}
                                  </div>
                                </div>

                                <div className="bg-white/60 p-2 rounded text-xs text-slate-800 border border-slate-200/60 mt-1">
                                  <strong>İşlem:</strong> {appt.note || "Servis Bakımı"}
                                </div>

                                <div className="calendar-card-footer mt-2">
                                  <span className="calendar-card-tech font-semibold text-xs">
                                    <Wrench size={13} />
                                    {details.technician?.name || "Atanan Usta Yok"}
                                  </span>
                                  <span className="calendar-card-status-pill text-xs">
                                    {details.theme.label}
                                  </span>
                                </div>

                                {details.hasConflict && (
                                  <div className="calendar-conflict-badge mt-1 self-start">
                                    <AlertTriangle size={11} /> Usta bu saatte başka bir işte kayıtlı!
                                  </div>
                                )}

                                {/* Resize Barı */}
                                <div
                                  className="calendar-card-resize-handle"
                                  onPointerDown={(e) => handleStartResize(e, appt.id)}
                                  title="Süreyi değiştirmek için dikey sürükleyin"
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===================================================================
          HIZLI DETAY DRAWER'I (RANDEVU KARTINA TIKLANINCA AÇILIR)
          =================================================================== */}
      {activeDetailAppt && (
        <>
          <div
            className="calendar-drawer-backdrop"
            onClick={handleCloseDrawer}
          />
          <div
            className="calendar-drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Randevu Detayı"
          >
            {/* Drawer Başlığı */}
            <div className="calendar-drawer-head">
              <div className="calendar-drawer-title-row">
                <span className="app-plate-chip text-sm px-2.5 py-1">
                  {activeDetailAppt.vehicle?.plate || "PLAKA"}
                </span>
                <div>
                  <h3 className="font-bold text-base text-slate-900 m-0">
                    Randevu Detayı
                  </h3>
                  <p className="text-xs text-slate-500 m-0">
                    {activeDetailAppt.vehicle?.model || "Model Belirtilmemiş"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="ux-drawer-close-btn"
                onClick={handleCloseDrawer}
                aria-label="Kapat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Drawer Gövdesi */}
            <div className="calendar-drawer-body">
              {isEditingInDrawer ? (
                /* Düzenleme Formu */
                <form onSubmit={handleSaveDrawerEdit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tarih
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full text-sm border border-slate-300 rounded-lg p-2"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Saat
                      </label>
                      <select
                        className="w-full text-sm border border-slate-300 rounded-lg p-2"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                      >
                        {HOURS.map((h) => (
                          <option key={h} value={formatTimeHour(h)}>
                            {formatTimeHour(h)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Atanan Usta
                    </label>
                    <select
                      className="w-full text-sm border border-slate-300 rounded-lg p-2"
                      value={editTechId}
                      onChange={(e) => setEditTechId(e.target.value)}
                    >
                      <option value="">Atanmadı</option>
                      {branchTechnicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.specialty})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Durum
                    </label>
                    <select
                      className="w-full text-sm border border-slate-300 rounded-lg p-2"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="Planlandı">Planlandı</option>
                      <option value="Onaylandı">Onaylandı</option>
                      <option value="Servise Geldi">Servise Geldi</option>
                      <option value="Tamamlandı">Tamamlandı</option>
                      <option value="Gecikti">Gecikti</option>
                      <option value="İptal">İptal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Yapılacak İşlem / Not
                    </label>
                    <textarea
                      rows={3}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button type="submit" size="sm" className="flex-1">
                      Değişiklikleri Kaydet
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingInDrawer(false)}
                    >
                      Vazgeç
                    </Button>
                  </div>
                </form>
              ) : (
                /* Görüntüleme Modu */
                <>
                  {/* Usta Çakışma Uyarısı (varsa) */}
                  {activeDetailAppt.hasConflict && (
                    <div className="bg-amber-50 border border-amber-300 p-3 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Usta Çakışması Algılandı:</strong> Atanan usta (
                        {activeDetailAppt.technician?.name || "Usta"}) bu saat diliminde
                        birden fazla randevuda kayıtlı.
                      </div>
                    </div>
                  )}

                  {/* Araç ve Müşteri Özeti */}
                  <div className="calendar-drawer-section">
                    <h4 className="calendar-drawer-section-title">
                      Araç ve Müşteri Bilgisi
                    </h4>
                    <div className="calendar-drawer-field-row">
                      <span className="calendar-drawer-field-label">Plaka</span>
                      <span className="calendar-drawer-field-value font-mono">
                        {activeDetailAppt.vehicle?.plate}
                      </span>
                    </div>
                    <div className="calendar-drawer-field-row">
                      <span className="calendar-drawer-field-label">Araç</span>
                      <span className="calendar-drawer-field-value">
                        {activeDetailAppt.vehicle?.brand}{" "}
                        {activeDetailAppt.vehicle?.model}{" "}
                        {activeDetailAppt.vehicle?.year}
                      </span>
                    </div>
                    <div className="calendar-drawer-field-row">
                      <span className="calendar-drawer-field-label">Müşteri</span>
                      <span className="calendar-drawer-field-value">
                        {activeDetailAppt.customer?.name || "Müşteri Yok"}
                      </span>
                    </div>
                    {activeDetailAppt.customer?.phone && (
                      <div className="calendar-drawer-field-row">
                        <span className="calendar-drawer-field-label">Telefon</span>
                        <a
                          href={`tel:${activeDetailAppt.customer.phone.replace(
                            /\s+/g,
                            "",
                          )}`}
                          className="calendar-drawer-field-value text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Phone size={13} /> {activeDetailAppt.customer.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Randevu Zamanı ve İşlem */}
                  <div className="calendar-drawer-section">
                    <h4 className="calendar-drawer-section-title">
                      Randevu & Planlama
                    </h4>
                    <div className="calendar-drawer-field-row">
                      <span className="calendar-drawer-field-label">Tarih</span>
                      <span className="calendar-drawer-field-value">
                        {activeDetailAppt.appointment.at?.slice(0, 10)}
                      </span>
                    </div>
                    <div className="calendar-drawer-field-row">
                      <span className="calendar-drawer-field-label">Saat</span>
                      <span className="calendar-drawer-field-value font-mono">
                        {activeDetailAppt.appointment.at?.slice(11, 16)} –{" "}
                        {activeDetailAppt.appointment.endAt
                          ? activeDetailAppt.appointment.endAt.slice(11, 16)
                          : formatTimeHour(
                              parseInt(
                                activeDetailAppt.appointment.at?.slice(11, 13) ||
                                  "9",
                                10,
                              ) + 1,
                            )}
                        <span className="ml-1 text-slate-500 font-normal">
                          ({activeDetailAppt.appointment.durationMinutes || 60} dk)
                        </span>
                      </span>
                    </div>

                    {/* Mobilde Kolay Süre Ayarlama Kontrolü (Quick Duration Buttons) */}
                    <div className="calendar-drawer-field-row py-2">
                      <span className="calendar-drawer-field-label">Süre Ayarı</span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {[30, 45, 60, 90, 120].map((mins) => {
                          const currentMins = activeDetailAppt.appointment.durationMinutes || 60;
                          const isCur = currentMins === mins;
                          return (
                            <button
                              key={mins}
                              type="button"
                              className={`text-xs px-2.5 py-1 rounded-md font-semibold border transition-all ${
                                isCur
                                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                  : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
                              }`}
                              onClick={() => {
                                const at = activeDetailAppt.appointment.at;
                                if (!at) return;
                                const startDate = new Date(at);
                                const endDate = new Date(startDate.getTime() + mins * 60000);
                                demo.updateAppointment(activeDetailAppt.appointment.id, {
                                  durationMinutes: mins,
                                  endAt: endDate.toISOString(),
                                });
                                showDragToast(`Randevu süresi ${mins} dakikaya ayarlandı.`);
                              }}
                            >
                              {mins} dk
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="calendar-drawer-field-row">
                      <span className="calendar-drawer-field-label">Atanan Usta</span>
                      <span className="calendar-drawer-field-value">
                        {activeDetailAppt.technician?.name || "Atanmadı"}
                      </span>
                    </div>
                    <div className="calendar-drawer-field-row">
                      <span className="calendar-drawer-field-label">Durum</span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${activeDetailAppt.theme.pillClass}`}
                      >
                        {activeDetailAppt.theme.label}
                      </span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <span className="calendar-drawer-field-label block mb-1 text-xs">
                        Yapılacak İşlem / Not
                      </span>
                      <div className="text-sm text-slate-800 bg-white p-2.5 rounded border border-slate-200">
                        {activeDetailAppt.appointment.note ||
                          "Belirtilmemiş randevu"}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Hızlı Aksiyonlar */}
            {!isEditingInDrawer && (
              <div className="calendar-drawer-actions">
                <div className="calendar-drawer-action-btn-row">
                  {/* Araç Kabul Başlat Butonu */}
                  <Button asChild size="sm">
                    <Link
                      href={`/app/intake?vehicleId=${activeDetailAppt.appointment.vehicleId}&appointmentId=${activeDetailAppt.appointment.id}`}
                    >
                      <ArrowRight size={14} /> Araç Kabul Başlat
                    </Link>
                  </Button>

                  {/* Düzenle Butonu */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartDrawerEdit}
                  >
                    <Edit2 size={14} /> Düzenle
                  </Button>
                </div>

                <div className="calendar-drawer-action-btn-row">
                  {/* Müşteriyi Ara */}
                  {activeDetailAppt.customer?.phone ? (
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`tel:${activeDetailAppt.customer.phone.replace(
                          /\s+/g,
                          "",
                        )}`}
                      >
                        <Phone size={14} /> Müşteriyi Ara
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <Phone size={14} /> Telefon Yok
                    </Button>
                  )}

                  {/* İptal Et Butonu (Onay İster) */}
                  {activeDetailAppt.appointment.status !== "İptal" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                      onClick={() =>
                        setConfirmCancelApptId(activeDetailAppt.appointment.id)
                      }
                    >
                      Randevuyu İptal Et
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-rose-600"
                      onClick={() =>
                        handleDeleteAppointment(activeDetailAppt.appointment.id)
                      }
                    >
                      Kaydı Tamamen Sil
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================================================================
          YENİ RANDEVU MODALI (BOŞ SAATE TIKLANDIĞINDA VEYA BUTONLA AÇILIR)
          =================================================================== */}
      {isNewModalOpen && (
        <div className="calendar-drawer-backdrop flex items-center justify-center p-4">
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Yeni Randevu Ekle"
          >
            {/* Modal Başlığı */}
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 m-0 flex items-center gap-2">
                  <CalendarDays size={18} className="text-blue-600" />
                  Yeni Randevu Oluştur
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tarih ve saat otomatik doldurulmuştur.
                </p>
              </div>
              <button
                type="button"
                className="ux-drawer-close-btn"
                onClick={() => setIsNewModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Formu */}
            <form onSubmit={handleSaveNewAppointment} className="p-5 overflow-y-auto space-y-4">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Tarih ve Saat Seçimi (Otomatik Doldurulur) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Randevu Tarihi
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-slate-50"
                    value={newModalDate}
                    onChange={(e) => setNewModalDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Başlangıç Saati
                  </label>
                  <select
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 bg-slate-50"
                    value={newModalHour}
                    onChange={(e) => setNewModalHour(e.target.value)}
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={formatTimeHour(h)}>
                        {formatTimeHour(h)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Araç Seçimi */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Araç Seçin *
                  </label>
                  <span className="text-xs text-slate-500">
                    {demo.vehicles.length} kayıtlı araç
                  </span>
                </div>

                <div className="relative mb-2">
                  <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Plaka veya müşteri adı ile ara..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    value={newVehicleSearch}
                    onChange={(e) => setNewVehicleSearch(e.target.value)}
                  />
                </div>

                <select
                  required
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 bg-white max-h-36"
                  value={newSelectedVehicleId}
                  onChange={(e) => setNewSelectedVehicleId(e.target.value)}
                  size={4}
                >
                  {filteredVehicles.map((v) => {
                    const c = demo.customers.find((cust) => cust.id === v.customerId);
                    return (
                      <option key={v.id} value={v.id} className="p-1.5">
                        {v.plate} — {v.model} ({c?.name || "Müşteri Yok"})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Atanan Usta Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Atanan Usta (Opsiyonel)
                </label>
                <select
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  value={newTechnicianId}
                  onChange={(e) => setNewTechnicianId(e.target.value)}
                >
                  <option value="">Usta Atanmadı</option>
                  {branchTechnicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.specialty})
                    </option>
                  ))}
                </select>

                {/* Canlı Usta Çakışma Uyarısı */}
                {isNewTechnicianConflicted && (
                  <div className="mt-1.5 text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded text-xs flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />
                    <span>
                      Dikkat: Seçilen ustanın bu tarih ve saatte başka bir randevusu var.
                    </span>
                  </div>
                )}
              </div>

              {/* Yapılacak İşlem / Not */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Yapılacak İşlem / Şikayet
                </label>
                <input
                  type="text"
                  placeholder="Örn: 10.000 km Yağ & Filtre Bakımı"
                  className="w-full text-sm border border-slate-300 rounded-lg p-2"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />

                {/* Hızlı Şablon Butonları */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {[
                    "Periyodik Bakım",
                    "Fren Balata Kontrolü",
                    "Ön Takım Kontrolü",
                    "Yağ & Filtre Değişimi",
                    "Arıza Tespiti",
                  ].map((tpl) => (
                    <button
                      key={tpl}
                      type="button"
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded transition"
                      onClick={() => setNewNote(tpl)}
                    >
                      + {tpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Durum */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Başlangıç Durumu
                </label>
                <div className="flex items-center gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="newStatus"
                      value="Planlandı"
                      checked={newStatus === "Planlandı"}
                      onChange={() => setNewStatus("Planlandı")}
                    />
                    Planlandı
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="newStatus"
                      value="Onaylandı"
                      checked={newStatus === "Onaylandı"}
                      onChange={() => setNewStatus("Onaylandı")}
                    />
                    Onaylandı
                  </label>
                </div>
              </div>

              {/* Form Butonları */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Vazgeç
                </Button>
                <div data-tour="calendar-save-btn">
                  <Button type="submit">
                    <CheckCircle2 size={15} /> Randevuyu Kaydet
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          İPTAL ONAY DİYALOĞU
          =================================================================== */}
      {confirmCancelApptId && (
        <div className="calendar-drawer-backdrop flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={24} />
              <h3 className="font-bold text-base text-slate-900 m-0">
                Randevuyu İptal Et
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Bu randevuyu iptal etmek istediğinize emin misiniz? Randevu takvimde
              iptal statüsüyle arşivlenecektir.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancelApptId(null)}
              >
                Vazgeç
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={handleConfirmCancel}
              >
                Evet, İptal Et
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          SÜRÜKLE & BIRAK UÇAN HAYALET KART (DRAG GHOST OVERLAY)
          =================================================================== */}
      {activeDragId && dragType === "move" && dragPointerPos && draggingAppt && (
        <div
          className="calendar-drag-ghost"
          style={{
            left: `${dragPointerPos.x}px`,
            top: `${dragPointerPos.y}px`,
          }}
        >
          {dragTargetSlot ? (
            <div
              className={`calendar-drag-ghost-target-time ${
                dragTargetSlot.isConflict ? "is-conflict" : ""
              }`}
            >
              <Clock size={11} />
              <span>
                {dragTargetSlot.dateStr} — {dragTargetSlot.hour.toString().padStart(2, "0")}:
                {dragTargetSlot.minute.toString().padStart(2, "0")}
              </span>
            </div>
          ) : (
            <div className="calendar-drag-ghost-target-time">
              <Clock size={11} />
              <span>{draggingAppt.appointment.at?.slice(11, 16)}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mb-1">
            <strong className="text-xs font-bold font-mono text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
              {draggingAppt.vehicle?.plate || "Plaka"}
            </strong>
            <span className="text-[11px] font-semibold text-slate-500">
              {draggingAppt.appointment.durationMinutes || 60} dk
            </span>
          </div>

          <div className="text-xs font-bold text-slate-800 truncate">
            {draggingAppt.customer?.name || "Müşteri"}
          </div>
          <div className="text-[11px] text-slate-600 truncate">
            {draggingAppt.appointment.note || "İşlem"}
          </div>

          {dragTargetSlot?.isConflict && (
            <div className="mt-1.5 text-[10px] font-bold text-rose-600 flex items-center gap-1">
              <AlertTriangle size={11} />
              <span className="truncate">{dragTargetSlot.conflictReason || "Çakışma"}</span>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          BİLGİLENDİRME VE UYARI TOAST BİLDİRİMİ
          =================================================================== */}
      {dragToast && (
        <div
          className={`calendar-drag-notification-toast ${
            dragToast.isError ? "is-error" : ""
          }`}
        >
          {dragToast.isError ? (
            <AlertTriangle size={16} className="text-rose-300 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          )}
          <span>{dragToast.message}</span>
        </div>
      )}
    </div>
  );
}
