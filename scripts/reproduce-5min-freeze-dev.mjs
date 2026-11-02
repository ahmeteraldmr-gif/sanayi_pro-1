import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET_PORT = "3000"; // DEVELOPMENT
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;
const CDP_PORT = 9445;

class DiagnosticChrome {
  constructor(port) {
    this.port = port;
    this.ws = null;
    this.proc = null;
    this.nextId = 1;
    this.pending = new Map();
    this.networkLogs = [];
    this.consoleLogs = [];
  }

  async launch(url) {
    const dataDir = path.join(os.tmpdir(), `freeze-diag-dev-${Date.now()}`);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    this.proc = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        `--remote-debugging-port=${this.port}`,
        "--window-size=1440,900",
        "--no-first-run",
        "--no-default-browser-check",
        `--user-data-dir=${dataDir}`,
        url,
      ],
      { detached: false }
    );

    for (let i = 0; i < 40; i++) {
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
            } else if (data.method) {
              this.handleEvent(data.method, data.params);
            }
          };
          await this.send("Page.enable");
          await this.send("Runtime.enable");
          await this.send("Network.enable");
          return;
        }
      } catch {}
    }
    throw new Error("Chrome başlatılamadı.");
  }

  handleEvent(method, params) {
    const time = new Date().toISOString().slice(11, 23);
    if (method === "Network.requestWillBeSent") {
      const url = params.request.url;
      if (!url.includes(".svg") && !url.includes("favicon")) {
        this.networkLogs.push({ time, type: "REQ", url, id: params.requestId });
      }
    } else if (method === "Network.responseReceived") {
      const url = params.response.url;
      if (!url.includes(".svg") && !url.includes("favicon")) {
        this.networkLogs.push({
          time,
          type: "RES",
          url,
          status: params.response.status,
          id: params.requestId,
        });
      }
    } else if (method === "Network.loadingFailed") {
      this.networkLogs.push({
        time,
        type: "FAIL",
        errorText: params.errorText,
        canceled: params.canceled,
        id: params.requestId,
      });
    } else if (method === "Runtime.consoleAPICalled") {
      const text = params.args.map((a) => a.value || a.description).join(" ");
      this.consoleLogs.push({ time, type: params.type, text });
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || "Eval Exception");
    }
    return res.result?.value;
  }

  async close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
    if (this.proc) {
      try {
        this.proc.kill("SIGKILL");
      } catch {}
    }
  }
}

async function run() {
  console.log("=============================================================");
  console.log(`SANAYİPRO 2.0 — 5 DAKİKA BEKLEME VE DONMA TEŞHİS TESTİ`);
  console.log(`Hedef Port: 3000 (DEVELOPMENT)`);
  console.log("=============================================================");

  const browser = new DiagnosticChrome(CDP_PORT);
  try {
    console.log("\n[ADIM 1] Tarayıcı açılıyor ve Demo paneline giriş yapılıyor...");
    await browser.launch(`${BASE_URL}/login`);
    
    // Dev sunucunun derlemesini bekle (15 saniyeye kadar)
    let loginBtnFound = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      loginBtnFound = await browser.eval(`Boolean(document.querySelector('.login-branch-demo-action-btn') || document.querySelector('button[type="submit"]'))`);
      if (loginBtnFound) break;
    }
    console.log(`  -> Giriş sayfası yüklendi mi: ${loginBtnFound ? "EVET" : "HAYIR"}`);

    // Login
    await browser.eval(`
      (() => {
        const btn = document.querySelector('.login-branch-demo-action-btn') || document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    
    // /app sayfasına yönlenene kadar bekle
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const p = await browser.eval(`window.location.pathname`);
      if (p.startsWith('/app')) break;
    }

    // Dismiss tour
    await browser.eval(`
      (() => {
        const dismissBtn = document.querySelector('.tour-btn-outline') || document.querySelector('button[aria-label="Kapat"]');
        if (dismissBtn) dismissBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    // İş Emirleri sayfasına git
    console.log("[ADIM 2] İş Emirleri sayfasına yönlendiriliyor...");
    await browser.eval(`window.location.href = '${BASE_URL}/app/work-orders'`);
    await new Promise((r) => setTimeout(r, 2000));

    const currentUrl = await browser.eval(`window.location.href`);
    console.log(`  -> Aktif URL: ${currentUrl}`);

    // Test 1: İlk anda navigasyon çalışıyor mu?
    console.log("\n[ADIM 3] İlk anda (0 sn bekleme) Müşteriler sayfasına geçiş deneniyor...");
    const initialNavResult = await testSidebarNavigation(browser, "/app/customers", "Müşteriler");
    console.log(`  -> 0 sn geçiş sonucu: ${initialNavResult.success ? "BAŞARILI (" + initialNavResult.durationMs + "ms)" : "BAŞARISIZ"}`);

    // İş Emirleri sayfasına geri dön
    await browser.eval(`
      const link = document.querySelector('a[href="/app/work-orders"]');
      if (link) link.click();
    `);
    await new Promise((r) => setTimeout(r, 1500));

    // GERÇEK 5 DAKİKA (300 SANİYE) BEKLEME
    console.log("\n[ADIM 4] DEV SUNUCUDA İŞ EMİRLERİ SAYFASINDA TAM 5 DAKİKA (300 SANİYE) BEKLENİYOR...");

    const totalSeconds = 300;
    const startTime = Date.now();
    for (let sec = 30; sec <= totalSeconds; sec += 30) {
      await new Promise((r) => setTimeout(r, 30000));
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      const memStats = await browser.eval(`(() => {
        return {
          heapSize: window.performance?.memory?.usedJSHeapSize,
          pointerEvents: window.getComputedStyle(document.body).pointerEvents,
          overflow: window.getComputedStyle(document.body).overflow,
        };
      })()`);

      console.log(`  -> [DEV ${elapsed}s / ${totalSeconds}s] Bekleniyor... (Body pointer-events: "${memStats.pointerEvents}")`);
    }

    console.log("\n[ADIM 5] DEV 5 DAKİKA DOLDU! ŞİMDİ SİDEBAR'DAN MÜŞTERİLER SAYFASINA TIKLANIYOR...");

    const navDiag = await testSidebarNavigation(browser, "/app/customers", "Müşteriler");

    console.log("\n=============================================================");
    console.log("DEVELOPMENT 5 DAKİKA SONRASI NAVİGASYON TEŞHİS RAPORU:");
    console.log("=============================================================");
    console.log(`1. Click olayı oluştu mu: ${navDiag.clickDispatched ? "EVET" : "HAYIR"}`);
    console.log(`2. Click'i karşılayan element: <${navDiag.hitTarget?.tagName}> class="${navDiag.hitTarget?.className}"`);
    console.log(`3. Is Element from point sidebar link: ${navDiag.isLinkDirectlyHit ? "EVET (ENGEL YOK)" : `HAYIR (Engellendi: ${navDiag.hitTarget?.tagName}.${navDiag.hitTarget?.className})`}`);
    console.log(`4. Navigation handler çalıştı mı: ${navDiag.navigationHandlerFired ? "EVET" : "HAYIR"}`);
    console.log(`5. Network RSC isteği gönderildi mi: ${navDiag.networkRequestSent ? "EVET" : "HAYIR"}`);
    console.log(`6. İstek tamamlandı mı: ${navDiag.networkRequestCompleted ? "EVET" : "HAYIR"}`);
    console.log(`7. URL değişti mi: ${navDiag.urlChanged ? "EVET (" + navDiag.finalUrl + ")" : "HAYIR (Değişmedi)"}`);
    console.log(`8. Yeni sayfa render edildi mi: ${navDiag.pageRendered ? "EVET" : "HAYIR"}`);
    console.log(`9. Toplam Geçiş Süresi: ${navDiag.durationMs}ms`);
    console.log(`GENEL DURUM: ${navDiag.success ? "BAŞARILI (DONMADI)" : "DONDU / TAKILDI!"}`);

    if (browser.networkLogs.length > 0) {
      console.log("\nSon Network Hareketleri (son 10):");
      console.log(browser.networkLogs.slice(-10));
    }
    if (browser.consoleLogs.length > 0) {
      console.log("\nConsole Hataları / Mesajları:");
      console.log(browser.consoleLogs.slice(-10));
    }
  } finally {
    await browser.close();
  }
}

async function testSidebarNavigation(browser, targetHref) {
  await browser.eval(`
    window.__navDiag = {
      clickDispatched: false,
      hitTarget: null,
      isLinkDirectlyHit: false,
      navigationHandlerFired: false,
      startUrl: window.location.pathname,
      finalUrl: null,
      rscFetchStarted: false,
      rscFetchCompleted: false,
      fetchError: null
    };

    const origFetch = window.fetch;
    window.fetch = function(...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.includes('${targetHref}') || url.includes('_rsc')) {
        window.__navDiag.rscFetchStarted = true;
      }
      return origFetch.apply(this, args)
        .then(res => {
          if (url.includes('${targetHref}') || url.includes('_rsc')) {
            window.__navDiag.rscFetchCompleted = true;
          }
          return res;
        })
        .catch(err => {
          window.__navDiag.fetchError = err.message;
          throw err;
        });
    };
  `);

  const startTime = Date.now();

  const clickInfo = await browser.eval(`(() => {
    const link = document.querySelector('a[href="${targetHref}"]');
    if (!link) return { found: false };

    const rect = link.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);

    window.__navDiag.hitTarget = hit ? {
      tagName: hit.tagName,
      className: hit.className,
      id: hit.id
    } : null;
    window.__navDiag.isLinkDirectlyHit = Boolean(hit && (hit === link || link.contains(hit)));

    window.__navDiag.clickDispatched = true;
    link.click();
    return {
      found: true,
      hitTarget: window.__navDiag.hitTarget,
      isLinkDirectlyHit: window.__navDiag.isLinkDirectlyHit
    };
  })()`);

  let urlChanged = false;
  let finalPath = "";
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    finalPath = await browser.eval(`window.location.pathname`);
    if (finalPath === targetHref) {
      urlChanged = true;
      break;
    }
  }

  const durationMs = Date.now() - startTime;

  const pageRendered = await browser.eval(`
    Boolean(document.querySelector('.records-dir') || document.querySelector('.module-page') || document.querySelector('h1'))
  `);

  const diag = await browser.eval(`window.__navDiag`);

  return {
    success: urlChanged && pageRendered,
    clickDispatched: Boolean(clickInfo.found),
    hitTarget: clickInfo.hitTarget,
    isLinkDirectlyHit: clickInfo.isLinkDirectlyHit,
    navigationHandlerFired: diag?.rscFetchStarted || urlChanged,
    networkRequestSent: diag?.rscFetchStarted,
    networkRequestCompleted: diag?.rscFetchCompleted,
    urlChanged,
    finalUrl: finalPath,
    pageRendered,
    durationMs,
  };
}

run().catch((err) => {
  console.error("Test Hatası:", err);
  process.exit(1);
});
