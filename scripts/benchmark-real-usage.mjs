import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

class CDPClient {
  constructor(port) {
    this.port = port;
    this.ws = null;
    this.proc = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async launch(initialUrl) {
    const dataDir = path.join(os.tmpdir(), `sanayipro-bench-${this.port}-${Date.now()}`);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    this.proc = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        `--remote-debugging-port=${this.port}`,
        "--window-size=1440,900",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync",
        `--user-data-dir=${dataDir}`,
        initialUrl,
      ],
      { detached: false }
    );

    let connected = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const res = await fetch(`http://127.0.0.1:${this.port}/json`);
        const tabs = await res.json();
        const page = tabs.find((t) => t.type === "page");
        if (page && page.webSocketDebuggerUrl) {
          this.ws = new WebSocket(page.webSocketDebuggerUrl);
          await new Promise((r) => (this.ws.onopen = r));
          this.ws.onmessage = (evt) => {
            const data = JSON.parse(evt.data);
            if (data.id && this.pending.has(data.id)) {
              const { resolve, reject } = this.pending.get(data.id);
              this.pending.delete(data.id);
              if (data.error) reject(new Error(data.error.message));
              else resolve(data.result);
            }
          };
          connected = true;
          break;
        }
      } catch {}
    }

    if (!connected) throw new Error("Chrome CDP bağlantısı kurulamadı: port " + this.port);

    await this.send("Page.enable");
    await this.send("Runtime.enable");
    await this.send("DOM.enable");
    await this.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  async eval(expression) {
    try {
      const res = await this.send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.value;
    } catch (err) {
      if (
        err.message?.includes("Execution context was destroyed") ||
        err.message?.includes("Cannot find context") ||
        err.message?.includes("Session with given id not found")
      ) {
        return null;
      }
      throw err;
    }
  }

  async getCurrentUrl() {
    try {
      const nav = await this.send("Page.getNavigationHistory");
      if (nav && nav.entries && nav.entries[nav.currentIndex]) {
        return nav.entries[nav.currentIndex].url;
      }
    } catch {}
    return await this.eval("window.location.href");
  }

  async close() {
    try {
      if (this.ws) this.ws.close();
    } catch {}
    try {
      if (this.proc) this.proc.kill();
    } catch {}
  }
}

async function runBenchmark(envName, baseUrl, cdpPort) {
  console.log(`\n==================================================`);
  console.log(`🚀 BAŞLATILIYOR: ${envName} (${baseUrl})`);
  console.log(`==================================================`);

  const client = new CDPClient(cdpPort);
  await client.launch(`${baseUrl}/login`);

  const results = {
    env: envName,
    baseUrl,
    sidebarTransitions: [],
    workOrderOpen: null,
    quickFlow: null,
    customerSearch: null,
    plateScanner: null,
    educationFlow: null,
    mobile390Usage: null,
    stuckOverlayErrors: 0,
    failures: [],
  };

  try {
    // 0. GİRİŞ YAP (React Hydration Bekle ve Motor Ustası Demosuna Gir)
    console.log(`[0/7] Giriş yapılıyor (Motor Ustası Demosu)...`);
    
    // Wait for login button and React hydration
    let btnReady = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const isHydrated = await client.eval(`
        (() => {
          const btn = document.querySelector('.login-branch-demo-action-btn') ||
                      Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Demosuna Gir'));
          if (!btn) return false;
          return Object.keys(btn).some(k => k.startsWith('__reactFiber') || k.startsWith('__reactProps'));
        })()
      `);
      if (isHydrated) {
        btnReady = true;
        break;
      }
    }

    if (!btnReady) throw new Error("Giriş ekranında branş demo butonu (veya hydration) hazır değil!");

    // Click demo login button
    await client.eval(`
      (() => {
        const btn = document.querySelector('.login-branch-demo-action-btn') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Demosuna Gir'));
        if (btn) btn.click();
      })()
    `);

    // Wait until redirected to /app (up to 40s in dev mode due to compilation)
    let loggedIn = false;
    for (let i = 0; i < 80; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const currentUrl = await client.getCurrentUrl();
      if (currentUrl && currentUrl.includes("/app")) {
        loggedIn = true;
        break;
      }
    }
    console.log(`  ✓ Panele giriş sağlandı: ${loggedIn ? "BAŞARILI" : "HATA"}`);
    if (!loggedIn) throw new Error("Giriş redirection zaman aşımına uğradı");

    await new Promise((r) => setTimeout(r, 600));

    // Dismiss welcome modal if open
    await client.eval(`
      (() => {
        const dismissBtn = document.querySelector('.tour-btn-outline') ||
                           document.querySelector('.tour-welcome-close-btn') ||
                           Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Serbestçe Keşfet'));
        if (dismissBtn) dismissBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));

    // 1. SIDEBAR 30 ARDIŞIK SAYFA GEÇİŞİ
    console.log(`[1/7] Sidebar'da 30 ardışık sayfa geçişi test ediliyor...`);
    const routes = [
      "/app",
      "/app/work-orders",
      "/app/intake",
      "/app/customers",
      "/app/calendar",
      "/app/team",
      "/app/stock",
      "/app/finance",
      "/app/reports",
      "/app/education",
    ];

    for (let i = 0; i < 30; i++) {
      const targetRoute = routes[i % routes.length];
      const measureExpr = `
        new Promise((resolve) => {
          const link = document.querySelector('a.app-nav-link[href="${targetRoute}"]') ||
                       document.querySelector('a[href="${targetRoute}"]');
          if (!link) {
            resolve({ error: "Link bulunamadı: ${targetRoute}" });
            return;
          }
          const t0 = performance.now();
          link.click();
          
          function check() {
            if (window.location.pathname === "${targetRoute}") {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const t1 = performance.now();
                  const bodyPointerEvents = document.body.style.pointerEvents;
                  resolve({
                    duration: t1 - t0,
                    target: "${targetRoute}",
                    bodyPointerEvents: bodyPointerEvents || "auto"
                  });
                });
              });
            } else {
              if (performance.now() - t0 > 4500) {
                resolve({ error: "Timeout navigating to ${targetRoute}" });
              } else {
                setTimeout(check, 10);
              }
            }
          }
          check();
        })
      `;

      const hop = await client.eval(measureExpr);
      if (hop?.duration) {
        results.sidebarTransitions.push(hop.duration);
        if (hop.bodyPointerEvents === "none") {
          results.stuckOverlayErrors++;
          results.failures.push(`Geçiş ${i + 1}: Body pointer-events 'none' takıldı.`);
        }
      } else {
        results.failures.push(`Geçiş ${i + 1} (${targetRoute}): ${hop?.error || "Bilinmeyen hata"}`);
      }
      await new Promise((r) => setTimeout(r, 40));
    }

    const validDurations = results.sidebarTransitions;
    const avgHop = validDurations.length ? (validDurations.reduce((a, b) => a + b, 0) / validDurations.length).toFixed(1) : 0;
    const minHop = validDurations.length ? Math.min(...validDurations).toFixed(1) : 0;
    const maxHop = validDurations.length ? Math.max(...validDurations).toFixed(1) : 0;
    console.log(`  ✓ 30 Geçiş Tamamlandı (${validDurations.length}/30). Ort: ${avgHop} ms, Min: ${minHop} ms, Max: ${maxHop} ms`);

    // 2. İŞ EMRİ AÇMA VE DETAYINA GİRME
    console.log(`[2/7] İş emri listesi ve detayına girme test ediliyor...`);
    await client.eval(`
      (() => {
        const link = document.querySelector('a.app-nav-link[href="/app/work-orders"]') ||
                     document.querySelector('a[href="/app/work-orders"]');
        if (link) link.click();
      })()
    `);
    
    // Wait for work order rows
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const hasRows = await client.eval(`
        Boolean(document.querySelector('tr.app-order-row') ||
                document.querySelector('tr[data-tour="work-order-row-first"]') ||
                document.querySelector('.app-order-id'))
      `);
      if (hasRows) break;
    }

    const woMeasureExpr = `
      new Promise((resolve) => {
        const row = document.querySelector('tr.app-order-row') ||
                    document.querySelector('tr[data-tour="work-order-row-first"]') ||
                    document.querySelector('.app-order-id');
        if (!row) {
          resolve({ error: "İş emri satırı bulunamadı" });
          return;
        }
        const t0 = performance.now();
        row.click();

        function check() {
          if (window.location.pathname.startsWith('/app/work-orders/')) {
            const header = document.querySelector('.app-order-compact-header') ||
                           document.querySelector('.app-breadcrumb-id') ||
                           document.querySelector('.app-order-detail');
            if (header) {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  const t1 = performance.now();
                  resolve({
                    duration: t1 - t0,
                    url: window.location.pathname,
                    hasHeader: Boolean(header)
                  });
                });
              });
              return;
            }
          }
          if (performance.now() - t0 > 4000) {
            resolve({ error: "İş emri detayı yüklenirken zaman aşımı" });
          } else {
            setTimeout(check, 10);
          }
        }
        check();
      })
    `;
    const woResult = await client.eval(woMeasureExpr);
    results.workOrderOpen = woResult;
    console.log(`  ✓ İş emri detayı tıklamadan ekrana tepki: ${woResult?.duration ? `${woResult.duration.toFixed(1)} ms (${woResult.url})` : woResult?.error}`);

    // 3. HIZLI İŞLEM AÇIP KAPATMA
    console.log(`[3/7] Hızlı İşlem açma ve kapama test ediliyor...`);
    const qfMeasureExpr = `
      new Promise((resolve) => {
        const trigger = document.querySelector('.ux-quick-trigger') ||
                        document.querySelector('button[aria-label="Hızlı işlem menüsünü aç"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Hızlı'));
        if (!trigger) {
          resolve({ error: "Hızlı işlem butonu bulunamadı" });
          return;
        }

        const t0 = performance.now();
        trigger.click();

        function checkOpen() {
          const dialog = document.querySelector('[role="dialog"][data-state="open"]') ||
                         document.querySelector('.dialog-content');
          if (dialog) {
            requestAnimationFrame(() => {
              const openDuration = performance.now() - t0;
              const tClose0 = performance.now();
              const closeBtn = dialog.querySelector('.dialog-close') ||
                               dialog.querySelector('button[aria-label="Close"]') ||
                               dialog.querySelector('button');
              if (closeBtn) closeBtn.click();
              else {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
              }

              function checkClosed() {
                const stillOpen = document.querySelector('[role="dialog"][data-state="open"]');
                if (!stillOpen) {
                  requestAnimationFrame(() => {
                    const closeDuration = performance.now() - tClose0;
                    const bodyPE = document.body.style.pointerEvents;
                    resolve({
                      openDuration,
                      closeDuration,
                      bodyClean: bodyPE !== 'none'
                    });
                  });
                } else if (performance.now() - tClose0 > 2500) {
                  resolve({ error: "Hızlı işlem penceresi kapanmadı" });
                } else {
                  setTimeout(checkClosed, 10);
                }
              }
              checkClosed();
            });
          } else if (performance.now() - t0 > 3000) {
            resolve({ error: "Hızlı işlem penceresi açılmadı" });
          } else {
            setTimeout(checkOpen, 10);
          }
        }
        checkOpen();
      })
    `;
    const qfResult = await client.eval(qfMeasureExpr);
    results.quickFlow = qfResult;
    console.log(`  ✓ Hızlı İşlem: Açılış ${qfResult?.openDuration?.toFixed(1) || "-"} ms, Kapanış ${qfResult?.closeDuration?.toFixed(1) || "-"} ms, Overlay Temiz: ${qfResult?.bodyClean ? "EVET" : "HAYIR"}`);

    // 4. MÜŞTERİ ARAMA VE KAYIT AÇMA
    console.log(`[4/7] Müşteri arama ve kayıt açma test ediliyor...`);
    await client.eval(`
      (() => {
        const link = document.querySelector('a.app-nav-link[href="/app/customers"]') ||
                     document.querySelector('a[href="/app/customers"]');
        if (link) link.click();
      })()
    `);
    
    // Wait for customer search input
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const hasInput = await client.eval(`
        Boolean(document.querySelector('.records-search input') ||
                document.querySelector('input[placeholder*="ara"]'))
      `);
      if (hasInput) break;
    }

    const custMeasureExpr = `
      new Promise((resolve) => {
        const searchInput = document.querySelector('.records-search input') ||
                            document.querySelector('input[placeholder*="ara"]');
        if (!searchInput) {
          resolve({ error: "Müşteri arama kutusu bulunamadı" });
          return;
        }

        const t0 = performance.now();
        searchInput.focus();
        searchInput.value = "Motor";
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const searchDuration = performance.now() - t0;
            const firstRowLink = document.querySelector('tr.ux-unified-customer-row a.ux-unified-customer-link') ||
                                 document.querySelector('tr.ux-unified-customer-row a') ||
                                 document.querySelector('table tbody tr a');
            
            if (!firstRowLink) {
              resolve({ searchDuration, openDuration: null, note: "Arama sonucu satırı bulunamadı" });
              return;
            }

            const tOpen0 = performance.now();
            firstRowLink.click();

            function checkCustDetail() {
              if (window.location.pathname.startsWith('/app/customers/')) {
                requestAnimationFrame(() => {
                  resolve({
                    searchDuration,
                    openDuration: performance.now() - tOpen0,
                    url: window.location.pathname
                  });
                });
              } else if (performance.now() - tOpen0 > 2500) {
                resolve({ searchDuration, openDuration: performance.now() - tOpen0, note: "Navigasyon zaman aşımı" });
              } else {
                setTimeout(checkCustDetail, 15);
              }
            }
            checkCustDetail();
          });
        });
      })
    `;
    const custResult = await client.eval(custMeasureExpr);
    results.customerSearch = custResult;
    console.log(`  ✓ Müşteri Arama: ${custResult?.searchDuration?.toFixed(1) || "-"} ms, Kayıt Açma: ${custResult?.openDuration?.toFixed(1) || "-"} ms (${custResult?.url || custResult?.note || ""})`);

    // 5. PLAKA OKU PENCERESİNİ AÇIP KAPATMA
    console.log(`[5/7] Plaka Oku (PlateScannerModal) açma ve kapama test ediliyor...`);
    await client.eval(`
      (() => {
        const link = document.querySelector('a.app-nav-link[href="/app"]') ||
                     document.querySelector('a[href="/app"]');
        if (link) link.click();
      })()
    `);
    
    // Wait for scanner trigger button
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const hasScannerBtn = await client.eval(`
        Boolean(document.querySelector('.ux-scanner-trigger-btn') ||
                document.querySelector('button[data-tour="plate-scanner-btn"]') ||
                Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Plaka Oku')))
      `);
      if (hasScannerBtn) break;
    }

    const plateMeasureExpr = `
      new Promise((resolve) => {
        const camBtn = document.querySelector('.ux-scanner-trigger-btn') ||
                       document.querySelector('button[data-tour="plate-scanner-btn"]') ||
                       Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Plaka Oku'));
        if (!camBtn) {
          resolve({ error: "Plaka oku butonu bulunamadı" });
          return;
        }

        const t0 = performance.now();
        camBtn.click();

        function checkModalOpen() {
          const modal = document.querySelector('[role="dialog"][data-state="open"]');
          if (modal) {
            requestAnimationFrame(() => {
              const openDuration = performance.now() - t0;
              const tClose0 = performance.now();
              const closeBtn = modal.querySelector('.dialog-close') ||
                               modal.querySelector('button[aria-label="Close"]') ||
                               modal.querySelector('button');
              if (closeBtn) closeBtn.click();
              else {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
              }

              function checkModalClosed() {
                const stillOpen = document.querySelector('[role="dialog"][data-state="open"]');
                if (!stillOpen) {
                  requestAnimationFrame(() => {
                    const closeDuration = performance.now() - tClose0;
                    const bodyPE = document.body.style.pointerEvents;
                    resolve({
                      openDuration,
                      closeDuration,
                      bodyClean: bodyPE !== 'none'
                    });
                  });
                } else if (performance.now() - tClose0 > 2500) {
                  resolve({ error: "Plaka modalı kapanmadı" });
                } else {
                  setTimeout(checkModalClosed, 10);
                }
              }
              checkModalClosed();
            });
          } else if (performance.now() - t0 > 3000) {
            resolve({ error: "Plaka modalı açılmadı" });
          } else {
            setTimeout(checkModalOpen, 10);
          }
        }
        checkModalOpen();
      })
    `;
    const plateResult = await client.eval(plateMeasureExpr);
    results.plateScanner = plateResult;
    console.log(`  ✓ Plaka Oku: Açılış ${plateResult?.openDuration?.toFixed(1) || "-"} ms, Kapanış ${plateResult?.closeDuration?.toFixed(1) || "-"} ms, Overlay Temiz: ${plateResult?.bodyClean ? "EVET" : "HAYIR"}`);

    // 6. EĞİTİM MERKEZİ BAŞLATMA, ADIM GEÇME VE KAPATMA
    console.log(`[6/7] Eğitim Merkezi adımları ve kapatma testi...`);
    await client.eval(`
      (() => {
        const link = document.querySelector('a.app-nav-link[href="/app/education"]') ||
                     document.querySelector('a[href="/app/education"]');
        if (link) link.click();
      })()
    `);
    
    // Wait for education page tracks
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const hasTracks = await client.eval(`
        Boolean(Array.from(document.querySelectorAll('button')).find(
          b => b.textContent.includes('Eğitimi Başlat') || b.textContent.includes('Devam Et') || b.textContent.includes('Yeniden Başla')
        ))
      `);
      if (hasTracks) break;
    }

    const eduMeasureExpr = `
      new Promise((resolve) => {
        const startBtn = Array.from(document.querySelectorAll('button')).find(
          b => b.textContent.includes('Eğitimi Başlat') || b.textContent.includes('Devam Et') || b.textContent.includes('Yeniden Başla')
        );
        if (!startBtn) {
          resolve({ error: "Eğitim başlatma butonu bulunamadı" });
          return;
        }

        const t0 = performance.now();
        startBtn.click();

        function checkGuideStep1() {
          const guide = document.querySelector('.interactive-guide-card') ||
                        document.querySelector('.tour-guide-card') ||
                        document.querySelector('.tour-card');
          if (guide) {
            requestAnimationFrame(() => {
              const startDuration = performance.now() - t0;
              // Now Click Sonraki
              const nextBtn = guide.querySelector('.tour-action-btn') ||
                              guide.querySelector('[data-tour-action="next"]') ||
                              Array.from(guide.querySelectorAll('button')).find(b => b.textContent.includes('Sonraki'));
              
              const tStep2_0 = performance.now();
              if (nextBtn) nextBtn.click();

              function checkGuideStep2() {
                const stepBadge = guide.querySelector('.tour-step-badge') || guide.querySelector('span');
                const text = stepBadge ? stepBadge.textContent : "";
                if (text.includes("2/") || performance.now() - tStep2_0 > 500) {
                  requestAnimationFrame(() => {
                    const stepAdvanceDuration = performance.now() - tStep2_0;

                    // Now Close Training
                    const tClose0 = performance.now();
                    const closeBtn = guide.querySelector('.tour-close-btn') ||
                                     guide.querySelector('.tour-header-close') ||
                                     guide.querySelector('button[aria-label="Eğitimi Kapat"]') ||
                                     Array.from(guide.querySelectorAll('button')).find(b => b.textContent.includes('Bitir') || b.textContent.includes('Kapat'));
                    if (closeBtn) closeBtn.click();

                    function checkClosed() {
                      const stillGuide = document.querySelector('.interactive-guide-card') ||
                                         document.querySelector('.tour-guide-card');
                      if (!stillGuide) {
                        requestAnimationFrame(() => {
                          const closeDuration = performance.now() - tClose0;
                          const bodyPE = document.body.style.pointerEvents;
                          const activeTarget = document.querySelector('[data-tour-active-target]');
                          resolve({
                            startDuration,
                            stepAdvanceDuration,
                            closeDuration,
                            bodyClean: bodyPE !== 'none',
                            activeTargetCleared: !activeTarget
                          });
                        });
                      } else if (performance.now() - tClose0 > 2500) {
                        resolve({ error: "Eğitim penceresi kapanmadı" });
                      } else {
                        setTimeout(checkClosed, 10);
                      }
                    }
                    checkClosed();
                  });
                } else {
                  setTimeout(checkGuideStep2, 10);
                }
              }
              checkGuideStep2();
            });
          } else if (performance.now() - t0 > 3500) {
            resolve({ error: "Eğitim kartı DOM'a çizilmedi" });
          } else {
            setTimeout(checkGuideStep1, 15);
          }
        }
        checkGuideStep1();
      })
    `;
    const eduResult = await client.eval(eduMeasureExpr);
    results.educationFlow = eduResult;
    console.log(`  ✓ Eğitim Başlatma: ${eduResult?.startDuration?.toFixed(1) || "-"} ms, Adım İlerleme: ${eduResult?.stepAdvanceDuration?.toFixed(1) || "-"} ms, Kapanış: ${eduResult?.closeDuration?.toFixed(1) || "-"} ms, Temiz: ${eduResult?.activeTargetCleared ? "EVET" : "HAYIR"}`);

    // 7. MOBİL 390px KULLANIM
    console.log(`[7/7] Mobil 390px viewport ve menü akışı test ediliyor...`);
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
      hasTouch: true,
    });
    await client.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 5,
    });

    await client.eval(`
      (() => {
        window.location.href = "${baseUrl}/app";
      })()
    `);
    
    // Wait for mobile trigger button
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const hasMobileBtn = await client.eval(`
        Boolean(document.querySelector('.app-mobile-trigger') ||
                document.querySelector('button[aria-label="Uygulama menüsünü aç"]'))
      `);
      if (hasMobileBtn) break;
    }

    const mobileMeasureExpr = `
      new Promise((resolve) => {
        const menuBtn = document.querySelector('.app-mobile-trigger') ||
                        document.querySelector('button[aria-label="Uygulama menüsünü aç"]');
        if (!menuBtn) {
          resolve({ error: "Mobil menü butonu bulunamadı" });
          return;
        }

        const t0 = performance.now();
        menuBtn.click();

        function checkMenuOpen() {
          const drawer = document.querySelector('.app-mobile-menu') ||
                         document.querySelector('[role="dialog"][data-state="open"]');
          if (drawer) {
            requestAnimationFrame(() => {
              const openDuration = performance.now() - t0;
              const link = drawer.querySelector('a.app-nav-link[href="/app/work-orders"]') ||
                           drawer.querySelector('a[href="/app/work-orders"]') ||
                           drawer.querySelector('a');
              const tNav0 = performance.now();
              if (link) link.click();

              function checkNavDone() {
                if (window.location.pathname === '/app/work-orders') {
                  requestAnimationFrame(() => {
                    const navDuration = performance.now() - tNav0;
                    const bodyPE = document.body.style.pointerEvents;
                    resolve({
                      openDuration,
                      navDuration,
                      bodyClean: bodyPE !== 'none',
                      viewportWidth: window.innerWidth
                    });
                  });
                } else if (performance.now() - tNav0 > 2500) {
                  resolve({ error: "Mobil navigasyon tamamlanamadı" });
                } else {
                  setTimeout(checkNavDone, 10);
                }
              }
              checkNavDone();
            });
          } else if (performance.now() - t0 > 2500) {
            resolve({ error: "Mobil menü açılmadı" });
          } else {
            setTimeout(checkMenuOpen, 10);
          }
        }
        checkMenuOpen();
      })
    `;
    const mobileResult = await client.eval(mobileMeasureExpr);
    results.mobile390Usage = mobileResult;
    console.log(`  ✓ Mobil Menü: Açılış ${mobileResult?.openDuration?.toFixed(1) || "-"} ms, Navigasyon ${mobileResult?.navDuration?.toFixed(1) || "-"} ms, Görünüm: ${mobileResult?.viewportWidth || 390}px`);

  } catch (err) {
    console.error(`  ❌ Hata oluştu: ${err.message}`);
    results.failures.push(err.message);
  } finally {
    await client.close();
  }

  return results;
}

async function main() {
  console.log("==================================================");
  console.log("SANAYİPRO 2.0 GERÇEK TARAYICI KULLANIM TESTİ");
  console.log("==================================================");

  // 1. Production Mode Benchmark (Port 3001)
  const prodResults = await runBenchmark("PRODUCTION", "http://127.0.0.1:3001", 9224);

  // 2. Development Mode Benchmark (Port 3000)
  const devResults = await runBenchmark("DEVELOPMENT", "http://127.0.0.1:3000", 9225);

  fs.writeFileSync(
    "benchmark-results.json",
    JSON.stringify({ prod: prodResults, dev: devResults }, null, 2),
    "utf8"
  );
  console.log("\n✅ Testler tamamlandı. benchmark-results.json kaydedildi.");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
