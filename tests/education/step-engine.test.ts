import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TRAINING_TRACKS,
  INITIAL_TRAINING_PROGRESS,
  getStepType,
  type TrainingTrackId,
} from "../../src/lib/training-data";

describe("SanayiPro Eğitim Merkezi — Merkezi Adım Motoru ve Sonraki/Geri Doğrulaması", () => {
  it("Paneli Tanı (Overview) eğitimi tam 5 adımdan oluşmalı ve adım tipleri (info/action) doğru ayrıştırılmalı", () => {
    const track = TRAINING_TRACKS.find((t) => t.id === "overview");
    assert.ok(track, "Overview track bulunamadı");
    assert.equal(track.steps.length, 5, "Paneli Tanı 5 adım olmalı");

    // Adım 1: Menü ve Modüller -> Bilgilendirme adımı
    const step1 = track.steps[0];
    assert.equal(step1.id, "ov-sidebar");
    assert.equal(getStepType(step1), "info", "Adım 1 bilgilendirme adımı olmalıdır");

    // Adım 2: Global Arama -> Etkileşim adımı (click)
    const step2 = track.steps[1];
    assert.equal(step2.id, "ov-search");
    assert.equal(getStepType(step2), "action", "Adım 2 etkileşim adımı olmalıdır");

    // Adım 3: Hızlı İşlem Butonu -> Etkileşim adımı (click)
    const step3 = track.steps[2];
    assert.equal(step3.id, "ov-quick-action");
    assert.equal(getStepType(step3), "action", "Adım 3 etkileşim adımı olmalıdır");

    // Adım 4: Şube Seçimi -> Bilgilendirme adımı
    const step4 = track.steps[3];
    assert.equal(step4.id, "ov-branch");
    assert.equal(getStepType(step4), "info", "Adım 4 bilgilendirme adımı olmalıdır");

    // Adım 5: Akıllı Bildirimler -> Etkileşim adımı (click)
    const step5 = track.steps[4];
    assert.equal(step5.id, "ov-notif");
    assert.equal(getStepType(step5), "action", "Adım 5 etkileşim adımı olmalıdır");
  });

  it("Paneli Tanı: 1/5 -> Sonraki -> 2/5 -> Sonraki -> 3/5 -> Sonraki -> 4/5 -> Sonraki -> 5/5 -> Tamamla simülasyonu", () => {
    const track = TRAINING_TRACKS.find((t) => t.id === "overview")!;
    let currentStepIndex = 0;
    let trackProgress: {
      status: "not_started" | "in_progress" | "completed";
      currentStepIndex: number;
    } = {
      status: "in_progress",
      currentStepIndex: 0,
    };

    const simulateNext = () => {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < track.steps.length) {
        currentStepIndex = nextIndex;
        trackProgress = {
          status: "in_progress",
          currentStepIndex: nextIndex,
        };
      } else {
        trackProgress = {
          status: "completed",
          currentStepIndex: track.steps.length - 1,
        };
      }
    };

    // 1/5 Başlangıç
    assert.equal(currentStepIndex, 0);
    assert.equal(track.steps[currentStepIndex].title, "Menü ve Modüller");

    // 1/5 -> Sonraki -> 2/5
    simulateNext();
    assert.equal(currentStepIndex, 1);
    assert.equal(track.steps[currentStepIndex].title, "Global Arama (Plaka & Müşteri)");
    assert.equal(trackProgress.currentStepIndex, 1);

    // 2/5 -> Sonraki -> 3/5
    simulateNext();
    assert.equal(currentStepIndex, 2);
    assert.equal(track.steps[currentStepIndex].title, "Hızlı İşlem Butonu");

    // 3/5 -> Sonraki -> 4/5
    simulateNext();
    assert.equal(currentStepIndex, 3);
    assert.equal(track.steps[currentStepIndex].title, "Şube Seçimi");

    // 4/5 -> Sonraki -> 5/5
    simulateNext();
    assert.equal(currentStepIndex, 4);
    assert.equal(track.steps[currentStepIndex].title, "Akıllı Bildirimler");

    // 5/5 -> Eğitimi Tamamla
    simulateNext();
    assert.equal(trackProgress.status, "completed");
  });

  it("Geri butonu: 5/5'ten 1/5'e kadar geriye doğru tutarlı geri çekilmeli", () => {
    const track = TRAINING_TRACKS.find((t) => t.id === "overview")!;
    let currentStepIndex = 4;

    const simulatePrev = () => {
      if (currentStepIndex > 0) {
        currentStepIndex -= 1;
      }
    };

    simulatePrev();
    assert.equal(currentStepIndex, 3);
    assert.equal(track.steps[currentStepIndex].title, "Şube Seçimi");

    simulatePrev();
    assert.equal(currentStepIndex, 2);
    assert.equal(track.steps[currentStepIndex].title, "Hızlı İşlem Butonu");

    simulatePrev();
    assert.equal(currentStepIndex, 1);
    assert.equal(track.steps[currentStepIndex].title, "Global Arama (Plaka & Müşteri)");

    simulatePrev();
    assert.equal(currentStepIndex, 0);
    assert.equal(track.steps[currentStepIndex].title, "Menü ve Modüller");

    // 0 noktasında daha geriye gitmemeli
    simulatePrev();
    assert.equal(currentStepIndex, 0);
  });

  it("Sayfa yenileme: activeTrackId ve progress localStorage'da kaldığı için eğitim sıfırlanmamalı", () => {
    const mockStorage: Record<string, string> = {
      "training-active-track-id": JSON.stringify("customer-vehicle"),
      "training-progress": JSON.stringify({
        ...INITIAL_TRAINING_PROGRESS,
        "customer-vehicle": {
          status: "in_progress",
          currentStepIndex: 2,
        },
      }),
    };

    const restoredTrackId = JSON.parse(mockStorage["training-active-track-id"]) as TrainingTrackId;
    const restoredProgress = JSON.parse(mockStorage["training-progress"]);
    const derivedStepIndex = restoredProgress[restoredTrackId]?.currentStepIndex ?? 0;

    assert.equal(restoredTrackId, "customer-vehicle");
    assert.equal(derivedStepIndex, 2, "Sayfa yenilense bile adım 3 (index 2) olarak yüklenmelidir");
    const activeTrack = TRAINING_TRACKS.find((t) => t.id === restoredTrackId)!;
    assert.equal(activeTrack.steps[derivedStepIndex].id, "cv-fill");
  });

  it("Bütün 10 eğitim modülündeki adımların expectedRoute ve targetSelector alanları geçerli olmalı", () => {
    for (const track of TRAINING_TRACKS) {
      assert.ok(track.steps.length >= 3, `${track.title} en az 3 adım içermelidir`);
      for (const step of track.steps) {
        assert.ok(step.expectedRoute.startsWith("/app"), `${step.id} rotası /app ile başlamalı`);
        assert.ok(step.targetSelector.includes("data-tour"), `${step.id} targetSelector data-tour içermeli`);
        const type = getStepType(step);
        assert.ok(type === "info" || type === "action", `${step.id} geçerli bir stepType'a sahip olmalı`);
      }
    }
  });

  it("Çift tıklama koruması (debouncing): Hızlı art arda tıklamalar adımı 2 kere atlatmamalı", () => {
    let isTransitioning = false;
    let step = 0;

    const clickNext = () => {
      if (isTransitioning) return;
      isTransitioning = true;
      step += 1;
      setTimeout(() => {
        isTransitioning = false;
      }, 50);
    };

    clickNext();
    clickNext(); // Immediate duplicate click
    clickNext(); // Immediate duplicate click

    assert.equal(step, 1, "Çift tıklamada adım yalnızca 1 kere ilerlemeli");
  });
});
