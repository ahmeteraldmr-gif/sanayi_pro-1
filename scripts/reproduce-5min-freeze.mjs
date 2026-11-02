import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const TARGET_PORT = process.env.TEST_PORT || "3001";
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;
const CDP_PORT = 9446;

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
    const dataDir = path.join(os.tmpdir(), `freeze-diag-${Date.now()}`);
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
        this.networkLogs.push({ time, type: "REQ", url, id: params.requestId, method: params.request.method });
      }
    } else if (method === "Network.responseReceived") {
      const url = params.response.url;
      if (!url.includes(".svg") && !url.includes("favicon")) {
        this.networkLogs.push({
          time,
          type: "RES",
          url,
          status: params.response.status,
          statusText: params.response.statusText,
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
      const desc =
        res.exceptionDetails.exception?.description ||
        res.exceptionDetails.text ||
        JSON.stringify(res.exceptionDetails);
      throw new Error(`Eval Exception: ${desc}`);
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

async function testNavigation(browser, targetHref) {
  // Inject clean hooks
  await browser.eval(`(() => {
    window.__navState = {
      targetHref: "${targetHref}",
      startTime: Date.now(),
      clickFired: false,
      navHandlerCalled: false,
      fetchUrls: [],
      fetchErrors: [],
      startPath: window.location.pathname,
      endPath: null,
      durationMs: 0
    };

    if (!window.__origFetch) {
      window.__origFetch = window.fetch;
      window.fetch = function(...args) {
        const u = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (window.__navState) {
          window.__navState.fetchUrls.push(u);
        }
        return window.__origFetch.apply(this, args).catch(err => {
          if (window.__navState) {
            window.__navState.fetchErrors.push({ url: u, err: err.message });
          }
          throw err;
        });
      };
    }
  })()`);

  // Hit-testing
  const hitTest = await browser.eval(`(() => {
    const link = document.querySelector('a[href="${targetHref}"]');
    if (!link) return { found: false };
    const rect = link.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const directHit = Boolean(hit && (hit === link || link.contains(hit)));

    const bodyStyle = window.getComputedStyle(document.body);
    const pointerEvents = bodyStyle.pointerEvents;
    const overflow = bodyStyle.overflow;

    // Trigger click
    link.click();
    window.__navState.clickFired = true;

    return {
      found: true,
      directHit,
      hitTag: hit ? hit.tagName : null,
      hitClass: hit ? hit.className : null,
      pointerEvents,
      overflow
    };
  })()`);

  if (!hitTest.found) {
    return { success: false, error: `Link not found for ${targetHref}` };
  }

  // Poll for pathname change up to 10 seconds
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

  const navState = await browser.eval(`(() => {
    if (window.__navState) {
      window.__navState.endPath = window.location.pathname;
      window.__navState.durationMs = Date.now() - window.__navState.startTime;
    }
    return window.__navState;
  })()`);

  return {
    success: urlChanged,
    targetHref,
    finalPath,
    durationMs: navState?.durationMs || 0,
    hitTest,
    fetchUrls: navState?.fetchUrls || [],
    fetchErrors: navState?.fetchErrors || [],
  };
}

async function run() {
  console.log("=============================================================");
  console.log(`SANAYİPRO 2.0 — 5 DAKİKA BEKLEME VE DONMA TEŞHİS TESTİ`);
  console.log(`Hedef Port: ${TARGET_PORT}`);
  console.log("=============================================================");

  const browser = new DiagnosticChrome(CDP_PORT);
  try {
    console.log("\n[1] Demo hesabına giriş yapılıyor...");
    await browser.launch(`${BASE_URL}/login`);

    // Wait for login button
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const ok = await browser.eval(`Boolean(document.querySelector('.login-branch-demo-action-btn') || document.querySelector('button[type="submit"]'))`);
      if (ok) break;
    }

    await browser.eval(`
      (() => {
        const btn = document.querySelector('.login-branch-demo-action-btn') || document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 2000));

    // Dismiss tour
    await browser.eval(`
      (() => {
        const dismissBtn = document.querySelector('.tour-btn-outline') || document.querySelector('button[aria-label="Kapat"]');
        if (dismissBtn) dismissBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    // Go to work-orders
    await browser.eval(`window.location.href = '${BASE_URL}/app/work-orders'`);
    await new Promise((r) => setTimeout(r, 1500));
    console.log(`  -> Aktif URL: ${await browser.eval('window.location.href')}`);

    // TEST A: 0 saniye bekleme (hemen geçiş)
    console.log("\n[TEST A] 0 Saniye Bekleme Sonrası Navigasyon:");
    const resA = await testNavigation(browser, "/app/customers");
    console.log(`  -> Sonuç: ${resA.success ? "BAŞARILI" : "BAŞARISIZ"} (${resA.durationMs}ms)`);
    console.log(`  -> Hit Test: directHit=${resA.hitTest.directHit}, pointerEvents=${resA.hitTest.pointerEvents}`);
    console.log(`  -> Fetch URLs:`, resA.fetchUrls);

    // Geri dön
    await testNavigation(browser, "/app/work-orders");
    await new Promise((r) => setTimeout(r, 1000));

    // TEST B: 300 saniye (5 dakika) bekleme
    console.log("\n[TEST B] İŞ EMİRLERİ SAYFASINDA TAM 300 SANİYE (5 DAKİKA) BEKLENİYOR...");
    const startWait = Date.now();
    for (let elapsed = 30; elapsed <= 300; elapsed += 30) {
      await new Promise((r) => setTimeout(r, 30000));
      const cur = Math.round((Date.now() - startWait) / 1000);
      const st = await browser.eval(`(() => ({
        pointerEvents: window.getComputedStyle(document.body).pointerEvents,
        overflow: window.getComputedStyle(document.body).overflow,
        overlayCount: document.querySelectorAll('.tour-welcome-modal, [role="dialog"][data-state="open"]').length
      }))()`);
      console.log(`  -> [${cur}s / 300s] Bekleniyor... (PointerEvents: "${st.pointerEvents}", Overlay: ${st.overlayCount})`);
    }

    console.log("\n[TEST B] 5 DAKİKA DOLDU! ŞİMDİ SİDEBAR'DAN MÜŞTERİLER SAYFASINA GEÇİLİYOR...");
    const resB = await testNavigation(browser, "/app/customers");
    console.log("\n=============================================================");
    console.log("5 DAKİKA SONRASI TEST SONUCU:");
    console.log("=============================================================");
    console.log(`1. Navigasyon Başarılı mı: ${resB.success ? "EVET" : "HAYIR (DONDU / TAKILDI!)"}`);
    console.log(`2. Süre: ${resB.durationMs}ms`);
    console.log(`3. Başlangıç URL: /app/work-orders -> Bitiş URL: ${resB.finalPath}`);
    console.log(`4. Hit Test directHit: ${resB.hitTest?.directHit} (Hit: <${resB.hitTest?.hitTag}> class="${resB.hitTest?.hitClass}")`);
    console.log(`5. Body pointer-events: "${resB.hitTest?.pointerEvents}", overflow: "${resB.hitTest?.overflow}"`);
    console.log(`6. Network Fetch URLs:`, resB.fetchUrls);
    console.log(`7. Network Fetch Errors:`, resB.fetchErrors);

    if (browser.networkLogs.length > 0) {
      console.log("\nSon 10 Network Kaydı:");
      console.log(browser.networkLogs.slice(-10));
    }
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Test Hatası:", err);
  process.exit(1);
});
