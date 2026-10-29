"use client";

import {
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  GraduationCap,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { TRAINING_TRACKS } from "@/lib/training-data";
import { useTraining } from "./training-context";
import { Button } from "@/components/ui/button";

export function TrainingHub() {
  const {
    progress,
    startTrack,
    resetTrainingProgress,
    resetAllDemoData,
  } = useTraining();

  const completedCount = Object.values(progress).filter(
    (p) => p.status === "completed",
  ).length;
  const inProgressCount = Object.values(progress).filter(
    (p) => p.status === "in_progress",
  ).length;
  const totalCount = TRAINING_TRACKS.length;
  const percentCompleted = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* 1. Üst Başlık & İlerleme Özeti */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold">
            <GraduationCap size={15} />
            <span>SANAYİPRO EĞİTİM MERKEZİ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Uygulamalı Servis Eğitimi
          </h1>
          <p className="text-sm text-slate-600 max-w-xl">
            Her adımı gerçek panel üzerinde tıklayarak, kayıt açarak ve işlem yaparak öğrenin.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center min-w-[130px]">
            <span className="block text-2xl font-bold text-purple-600">
              %{percentCompleted}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {completedCount}/{totalCount} Tamamlandı {inProgressCount > 0 ? `(${inProgressCount} Devam)` : ""}
            </span>
          </div>

          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={resetTrainingProgress}
              className="text-xs text-slate-600 hover:text-slate-900"
            >
              <RotateCcw size={14} /> Eğitimi Sıfırla
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllDemoData}
              className="text-xs text-amber-700 hover:bg-amber-50"
            >
              <Sparkles size={14} /> Demo Verilerini Sıfırla
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Güvenli Demo İzolasyon Bilgilendirme Notu */}
      <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-900 text-xs leading-relaxed">
        <ShieldCheck size={20} className="text-blue-600 shrink-0" />
        <span>
          <strong>Tamamen İzole Demo Ortamı:</strong> Bu eğitimdeki bütün işlemler &quot;SanayiPro Eğitim Servisi&quot; örnek atölyesinde çalışır. Gerçek müşteri, araç, stok ve kasa verileriniz kesinlikle etkilenmez veya değiştirilmez.
        </span>
      </div>

      {/* 3. 10 Eğitim Modülü Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TRAINING_TRACKS.map((track) => {
          const trackProgress = progress[track.id];
          const isCompleted = trackProgress?.status === "completed";
          const isInProgress = trackProgress?.status === "in_progress";
          const stepIndex = trackProgress?.currentStepIndex ?? 0;

          return (
            <article
              key={track.id}
              className={`p-5 rounded-2xl border transition-all ${
                isCompleted
                  ? "bg-emerald-50/40 border-emerald-200"
                  : isInProgress
                    ? "bg-purple-50/40 border-purple-200 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {track.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={12} /> {track.durationMinutes} dk
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-slate-900 mt-1">
                    {track.title}
                  </h3>
                </div>

                {isCompleted ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 size={13} /> Tamamlandı
                  </span>
                ) : isInProgress ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold">
                    <Compass size={13} /> Devam Ediyor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                    Başlanmadı
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                {track.shortDesc}
              </p>

              {/* Adım Durum Çubuğu */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-[11.5px] text-slate-500 font-medium">
                  {track.steps.length} Uygulamalı Görev
                  {isInProgress && ` · Adım ${stepIndex + 1}/${track.steps.length}`}
                </span>

                <Button
                  size="sm"
                  variant={isCompleted ? "outline" : isInProgress ? "default" : "secondary"}
                  onClick={() => startTrack(track.id, isCompleted ? 0 : stepIndex)}
                  className="text-xs"
                >
                  {isCompleted ? (
                    <>
                      <RotateCcw size={13} /> Yeniden Başla
                    </>
                  ) : isInProgress ? (
                    <>
                      <Play size={13} /> Devam Et
                    </>
                  ) : (
                    <>
                      <BookOpen size={13} /> Eğitimi Başlat
                    </>
                  )}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
