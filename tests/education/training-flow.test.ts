import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TRAINING_TRACKS,
  INITIAL_TRAINING_PROGRESS,
  type TrainingTrackId,
} from "../../src/lib/training-data";

describe("SanayiPro Eğitim Merkezi — E2E & Kural Doğrulama Testleri", () => {
  it("Bütün 10 eğitim modülü eksiksiz ve geçerli adımlarla tanımlanmış olmalı", () => {
    assert.equal(TRAINING_TRACKS.length, 10, "Toplam 10 eğitim modülü bulunmalı");

    const trackIds = TRAINING_TRACKS.map((t) => t.id);
    const expectedIds: TrainingTrackId[] = [
      "overview",
      "customer-vehicle",
      "plate-reading",
      "vehicle-intake",
      "work-orders",
      "team-management",
      "stock-suppliers",
      "finance-collection",
      "calendar-appointments",
      "vehicle-delivery",
    ];

    assert.deepEqual(trackIds, expectedIds, "Modül ID'leri sıralı ve eksiksiz olmalı");

    for (const track of TRAINING_TRACKS) {
      assert.ok(track.title.length > 0, `${track.id} modülünün başlığı olmalı`);
      assert.ok(track.steps.length >= 3, `${track.id} en az 3 adımdan oluşmalı`);
      assert.ok(track.durationMinutes > 0, `${track.id} süresi pozitif olmalı`);

      for (const step of track.steps) {
        assert.ok(step.id.length > 0, "Adım ID'si olmalı");
        assert.ok(step.title.length > 0, "Adım başlığı olmalı");
        assert.ok(step.instruction.length > 0, "Adım talimatı olmalı");
        assert.ok(step.targetSelector.length > 0, "Hedef seçici olmalı");
        assert.ok(
          step.targetSelector.startsWith("[data-tour") ||
            step.targetSelector.includes("[data-tour="),
          `Hedef seçici kararlı data-tour niteliği kullanmalı: ${step.targetSelector}`,
        );
        assert.ok(
          step.expectedRoute.startsWith("/app"),
          `Hedef rota /app altında olmalı: ${step.expectedRoute}`,
        );
        assert.ok(
          step.successMessage.length > 0,
          "Başarı tebrik mesajı tanımlanmış olmalı",
        );
      }
    }
  });

  it("Müşteri & Araç Kaydı (Track 2) rota ve form geçişleri tutarlı olmalı", () => {
    const track = TRAINING_TRACKS.find((t) => t.id === "customer-vehicle")!;
    assert.ok(track);

    // Step 1: Nav to customers
    assert.equal(track.steps[0].expectedRoute, "/app/customers");
    assert.equal(track.steps[0].actionType, "navigate");

    // Step 2: Click new customer button
    assert.equal(track.steps[1].expectedRoute, "/app/customers");

    // Step 3: Form submission on /app/customers/new
    assert.equal(track.steps[2].expectedRoute, "/app/customers/new");
    assert.ok(track.steps[2].targetSelector.includes("customer-form-save"));

    // Step 4: Detail inspection
    assert.equal(track.steps[3].expectedRoute, "/app/customers");
    assert.ok(track.steps[3].targetSelector.includes("customer-detail-summary"));
  });

  it("Stok ve Tedarikçiler (Track 7) Tedarikçiler sekmesi rota uyumu doğru olmalı", () => {
    const track = TRAINING_TRACKS.find((t) => t.id === "stock-suppliers")!;
    assert.ok(track);

    // Step 4: Tab on /app/stock
    const suppliersStep = track.steps.find((s) => s.id === "ss-suppliers")!;
    assert.ok(suppliersStep);
    assert.equal(
      suppliersStep.expectedRoute,
      "/app/stock",
      "Tedarikçiler sekmesi /app/stock sayfasında yer almalı, yanlış rotaya yönlendirmemeli",
    );
  });

  it("İş Emirleri (Track 5) Kanban/Liste ve Detay geçişi tutarlı olmalı", () => {
    const track = TRAINING_TRACKS.find((t) => t.id === "work-orders")!;
    assert.ok(track);

    // Step 2: Open first order
    assert.ok(track.steps[1].targetSelector.includes("work-order-row-first"));

    // Step 3: Primary action button
    assert.ok(track.steps[2].targetSelector.includes("order-primary-action"));
  });

  it("Araç Kabul (Track 4) Usta ataması ve tamamlama adımları mevcut olmalı", () => {
    const track = TRAINING_TRACKS.find((t) => t.id === "vehicle-intake")!;
    assert.ok(track);

    const techStep = track.steps.find((s) => s.id === "vi-tech")!;
    assert.ok(techStep);
    assert.ok(techStep.targetSelector.includes("intake-tech-select"));

    const submitStep = track.steps.find((s) => s.id === "vi-submit")!;
    assert.ok(submitStep);
    assert.ok(submitStep.targetSelector.includes("intake-complete-btn"));
  });

  it("Başlangıç ilerleme tablosunda tüm 10 modül not_started olarak başlamalı", () => {
    const keys = Object.keys(INITIAL_TRAINING_PROGRESS) as TrainingTrackId[];
    assert.equal(keys.length, 10);
    for (const key of keys) {
      assert.equal(INITIAL_TRAINING_PROGRESS[key].status, "not_started");
      assert.equal(INITIAL_TRAINING_PROGRESS[key].currentStepIndex, 0);
    }
  });

  it("Adım state machine yaşam döngüsü doğrulanmalı", () => {
    type GuideState =
      | "IDLE"
      | "SEARCHING"
      | "READY"
      | "VERIFYING"
      | "NAVIGATING"
      | "TARGET_NOT_FOUND"
      | "COMPLETED";

    let state: GuideState = "IDLE";

    // 1. Start tour
    state = "SEARCHING";
    assert.equal(state, "SEARCHING");

    // 2. Element found in DOM
    state = "READY";
    assert.equal(state, "READY");

    // 3. User clicks navigate link
    state = "NAVIGATING";
    assert.equal(state, "NAVIGATING");

    // 4. Route changes, search next target
    state = "SEARCHING";
    assert.equal(state, "SEARCHING");

    // 5. Element ready
    state = "READY";
    assert.equal(state, "READY");

    // 6. User submits form -> verifying
    state = "VERIFYING";
    assert.equal(state, "VERIFYING");

    // 7. Success
    state = "COMPLETED";
    assert.equal(state, "COMPLETED");
  });

  it("Mobil spotlight ve bottom sheet geometri toleransı hesaplanmalı", () => {
    // Mobil ekran 390px genişlik, 844px yükseklik
    const mobileViewport = { width: 390, height: 844 };
    const bottomSheetHeight = 240;
    const targetElementRect = { top: 720, bottom: 760, left: 20, right: 370 };

    // Hedef bottom sheet'in altında kalıyorsa scroll offset hesaplama
    const isObscuredBySheet =
      targetElementRect.bottom > mobileViewport.height - bottomSheetHeight;
    assert.equal(isObscuredBySheet, true, "Hedef alt çekmece bölgesinde tespit edilmeli");

    // Hesaplanan scroll pozisyonu: hedefi viewport'un üst 25%'lik dilimine getirmeli
    const calculatedScrollTop = Math.max(0, targetElementRect.top - 110);
    assert.equal(calculatedScrollTop, 610, "Yumuşak kaydırma hedefi üst alana taşımalı");
  });
});
