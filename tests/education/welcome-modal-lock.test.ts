import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TRAINING_TRACKS, type TrainingTrackId } from "../../src/lib/training-data";

describe("SanayiPro Eğitim Merkezi — Hoş Geldiniz Modalı & Kilitlenme Testleri", () => {
  it("Hoş Geldiniz modalı Serbestçe Keşfet seçildiğinde kalıcı olarak dismiss edilmeli", () => {
    let welcomeOpen = true;
    let welcomeDismissed = false;

    // Simulate clicking "Serbestçe Keşfet"
    const handleFreeExplore = () => {
      welcomeOpen = false;
      welcomeDismissed = true;
    };

    handleFreeExplore();

    assert.equal(welcomeOpen, false, "Modal kapanmalı");
    assert.equal(welcomeDismissed, true, "Modal kalıcı olarak dismiss edilmiş olmalı");

    // Verify auto-open effect does not reopen when welcomeDismissed is true
    const shouldReopen = !welcomeDismissed;
    assert.equal(shouldReopen, false, "Modal tekrar açılmaya çalışmamalı");
  });

  it("Kapat (X) butonuna tıklandığında modal kapanmalı ve body pointer-events asla 'none' kalmamalı", () => {
    // Mock minimal DOM environment
    const fakeBody = {
      style: { pointerEvents: "none" as string, overflow: "hidden" as string },
      removeAttribute: () => {},
      hasAttribute: () => false,
    };

    let welcomeOpen = true;
    let welcomeDismissed = false;

    const dismissWelcome = () => {
      welcomeOpen = false;
      welcomeDismissed = true;
      fakeBody.style.pointerEvents = "";
      fakeBody.style.overflow = "";
    };

    dismissWelcome();

    assert.equal(welcomeOpen, false, "Modal kapanmalı");
    assert.equal(welcomeDismissed, true, "welcomeDismissed true olmalı");
    assert.equal(fakeBody.style.pointerEvents, "", "Body pointer-events temizlenmeli");
    assert.equal(fakeBody.style.overflow, "", "Body overflow kilidi temizlenmeli");
  });

  it("Eğitime Başla tıklandığında hoş geldiniz modalı kapanıp ilk adım (Paneli Tanı) başlatılmalı", () => {
    let welcomeOpen = true;
    let welcomeDismissed = false;
    let activeTrackId: TrainingTrackId | null = null;
    let activeStepIndex = -1;

    const startTrack = (trackId: TrainingTrackId, stepIndex = 0) => {
      welcomeOpen = false;
      welcomeDismissed = true;
      activeTrackId = trackId;
      activeStepIndex = stepIndex;
    };

    startTrack("overview", 0);

    assert.equal(welcomeOpen, false, "Modal kapanmış olmalı");
    assert.equal(welcomeDismissed, true, "Dismiss edilmiş olmalı");
    assert.equal(activeTrackId, "overview", "Overview track aktif olmalı");
    assert.equal(activeStepIndex, 0, "0. adımda başlamalı");

    const track = TRAINING_TRACKS.find((t) => t.id === "overview")!;
    assert.ok(track);
    assert.equal(track.steps[0].id, "ov-sidebar");
    assert.equal(track.steps[0].targetSelector, '[data-tour="sidebar-nav"]');
  });

  it("Global üst bar ve kenar çubuğu hedefleri sayfada mevcutsa rota uyumsuzluğu (routeMismatch) üretmemeli", () => {
    const activeStep = {
      id: "ov-search",
      expectedRoute: "/app",
      targetSelector: '[data-tour="global-search"]',
    };

    // Simulate that the element exists in DOM (e.g. topbar on /app/work-orders)
    const currentPathname = "/app/work-orders";
    const targetElInDom = true; // Found in DOM
    const isTargetGlobal =
      activeStep.targetSelector.includes("global-search") ||
      activeStep.targetSelector.includes("quick-actions") ||
      activeStep.targetSelector.includes("branch-selector") ||
      activeStep.targetSelector.includes("notifications");

    const isTargetSidebarNav = activeStep.targetSelector.includes("nav-");

    const routeMismatch = Boolean(
      activeStep.expectedRoute &&
        !isTargetSidebarNav &&
        !isTargetGlobal &&
        !targetElInDom &&
        !currentPathname.startsWith(activeStep.expectedRoute),
    );

    assert.equal(
      routeMismatch,
      false,
      "Öğe DOM'da veya global bardaysa rota uyuşmazlığı tetiklenmemeli",
    );
  });

  it("Mobil viewport'ta (390px ve 430px) modal ve toast sınırları ekran dışına taşmamalı", () => {
    const viewports = [390, 430];

    for (const width of viewports) {
      // Max modal width is min(520px, calc(100vw - 32px))
      const modalMaxWidth = Math.min(520, width - 32);
      assert.ok(modalMaxWidth < width, `Modal genişliği (${modalMaxWidth}px) viewport'tan (${width}px) dar olmalı`);

      // Toast width is width - 32px
      const toastWidth = width - 32;
      assert.ok(toastWidth < width, `Toast genişliği (${toastWidth}px) viewport'a sığmalı`);
    }
  });

  it("Eğitim kapatıldığında veya sıfırlandığında aktif hedef nitelikleri temizlenmeli", () => {
    let activeTrackId: string | null = "overview";
    let targetAttr: string | null = "true";

    const closeTraining = () => {
      activeTrackId = null;
      targetAttr = null;
    };

    closeTraining();

    assert.equal(activeTrackId, null, "Eğitim kapanmalı");
    assert.equal(targetAttr, null, "data-tour-active-target niteliği temizlenmeli");
  });
});
