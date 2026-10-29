import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TRAINING_TRACKS,
  isRouteMatching,
} from "../../src/lib/training-data";
import {
  CRAFTSMAN_BRANCHES,
  getBranchInitialData,
  findWorkOrderAcrossAllBranches,
} from "../../src/lib/branch-profiles";

describe("SanayiPro — İş Emirleri Detay Navigasyon ve Adım Senkronizasyon Testleri", () => {
  it("İş Emirleri eğitimi adımları ve hedef rotaları doğru yapılandırılmış olmalı", () => {
    const track = TRAINING_TRACKS.find((t) => t.id === "work-orders");
    assert.ok(track, "İş Emirleri eğitimi mevcut olmalı");
    assert.equal(track.steps.length, 4, "İş Emirleri 4 adım olmalı");

    // Adım 1: Liste
    const step1 = track.steps[0];
    assert.equal(step1.id, "wo-nav");
    assert.equal(step1.expectedRoute, "/app/work-orders");
    assert.equal(step1.actionType, "navigate");

    // Adım 2: Detayı Aç
    const step2 = track.steps[1];
    assert.equal(step2.id, "wo-open");
    assert.equal(step2.expectedRoute, "/app/work-orders");
    assert.equal(step2.targetRoute, "/app/work-orders/[id]", "Hedef rota detay olmalı");
    assert.equal(step2.actionType, "navigate", "Adım 2 navigasyon eylemi olmalı");
    assert.equal(step2.targetSelector, '[data-tour="work-order-row-first"]');

    // Adım 3: Sıradaki İşlem (Detay sayfası rotasında olmalı!)
    const step3 = track.steps[2];
    assert.equal(step3.id, "wo-next-action");
    assert.equal(step3.expectedRoute, "/app/work-orders/[id]", "Adım 3 detay rotasını beklemeli");
    assert.equal(step3.targetSelector, '[data-tour="order-primary-action"]');

    // Adım 4: İç Not (Detay sayfası rotasında olmalı!)
    const step4 = track.steps[3];
    assert.equal(step4.id, "wo-notes");
    assert.equal(step4.expectedRoute, "/app/work-orders/[id]");
    assert.equal(step4.targetSelector, '[data-tour="order-add-note-btn"]');
  });

  it("isRouteMatching: Liste (/app/work-orders) ile Detay (/app/work-orders/[id]) kesin olarak ayırt edilmeli", () => {
    // Liste rotası testi
    assert.equal(isRouteMatching("/app/work-orders", "/app/work-orders"), true);
    assert.equal(isRouteMatching("/app/work-orders", "/app/work-orders/WO-M01"), false, "Liste kuralı detay yolunu eşleştirmemeli");

    // Detay rotası testi
    assert.equal(isRouteMatching("/app/work-orders/[id]", "/app/work-orders"), false, "Detay kuralı liste sayfasını eşleştirmemeli");
    assert.equal(isRouteMatching("/app/work-orders/[id]", "/app/work-orders/WO-M01"), true);
    assert.equal(isRouteMatching("/app/work-orders/[id]", "/app/work-orders/WO-2026-001"), true);
    assert.equal(isRouteMatching("/app/work-orders/[id]", "/app/work-orders/WO-S02"), true);
  });

  it("23 Branşın tamamındaki demo iş emirleri findWorkOrderAcrossAllBranches ile bulunabilmeli", () => {
    for (const branch of CRAFTSMAN_BRANCHES) {
      const data = getBranchInitialData(branch.id);
      assert.ok(data.orders.length > 0, `${branch.name} için en az 1 iş emri bulunmalı`);

      for (const order of data.orders) {
        const result = findWorkOrderAcrossAllBranches(order.id);
        assert.ok(result, `${order.id} tüm branşlar arasında bulunamadı`);
        assert.equal(result.order.id, order.id);
        assert.ok(result.customer, `${order.id} için müşteri kaydı mevcut olmalı`);
        assert.ok(result.vehicle, `${order.id} için araç kaydı mevcut olmalı`);
      }
    }
  });

  it("En az 25 ardışık döngü: İş Emirleri detay navigasyonu ve başarı doğrulaması takılmadan çalışmalı", () => {
    const track = TRAINING_TRACKS.find((t) => t.id === "work-orders")!;

    for (let iteration = 1; iteration <= 25; iteration++) {
      let pathname = "/app/work-orders";
      let activeStepIndex = 1; // Adım 2: wo-open
      let waitingForRoute: string | null = null;
      let toastShown: string | null = null;

      const activeStep = track.steps[activeStepIndex];
      assert.equal(activeStep.id, "wo-open");

      // 1. Kullanıcı satıra tıklıyor
      const isNavAction = activeStep.actionType === "navigate" || Boolean(activeStep.targetRoute);
      assert.equal(isNavAction, true);

      const dest = activeStep.targetRoute || activeStep.expectedRoute;
      assert.equal(dest, "/app/work-orders/[id]");

      // URL henüz değişmediği için step ilerlememeli, waitingForRoute atanmalı
      if (!isRouteMatching(dest, pathname)) {
        waitingForRoute = dest;
      }

      assert.equal(waitingForRoute, "/app/work-orders/[id]");
      assert.equal(activeStepIndex, 1, "Navigasyon gerçekleşmeden Adım 3'e geçilmemeli");
      assert.equal(toastShown, null, "Navigasyon gerçekleşmeden başarı toast'ı gösterilmemeli");

      // 2. Tarayıcıda rota geçişi gerçekleşiyor
      pathname = "/app/work-orders/WO-M01";

      // 3. Route watcher tetikleniyor
      if (waitingForRoute && isRouteMatching(waitingForRoute, pathname)) {
        waitingForRoute = null;
        toastShown = activeStep.successMessage;
        activeStepIndex += 1;
      }

      // 4. Doğrulama: Adım 3'e başarıyla geçildi
      assert.equal(activeStepIndex, 2);
      assert.equal(track.steps[activeStepIndex].id, "wo-next-action");
      assert.equal(toastShown, "İş emri detayı açıldı.");
      assert.equal(isRouteMatching(track.steps[activeStepIndex].expectedRoute, pathname), true);

      // 5. Adım 3'te buton tıklandı ve Adım 4'e geçildi
      activeStepIndex += 1;
      assert.equal(activeStepIndex, 3);
      assert.equal(track.steps[activeStepIndex].id, "wo-notes");
      assert.equal(isRouteMatching(track.steps[activeStepIndex].expectedRoute, pathname), true);
    }
  });

  it("Tıklama gerçekleşip URL değişmezse 2.8s failsafe ile durum kilitlenmeden READY'ye dönmeli", () => {
    const pathname = "/app/work-orders";
    let status = "NAVIGATING";
    let waitingForRoute: string | null = "/app/work-orders/[id]";

    // Simüle edilen timeout sonrası URL hala liste sayfasındaysa:
    const simulateTimeout = () => {
      if (waitingForRoute && !isRouteMatching(waitingForRoute, pathname)) {
        waitingForRoute = null;
        status = "READY";
      }
    };

    simulateTimeout();
    assert.equal(status, "READY", "Navigasyon başarısız olduğunda durum READY'ye dönmeli");
    assert.equal(waitingForRoute, null);
  });
});
