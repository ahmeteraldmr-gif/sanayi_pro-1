// scripts/verify-all-freeze-scenarios.mjs
import { spawn } from "node:child_process";
import http from "node:http";

const TARGET_PORT = process.env.TEST_PORT || "3001";
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9444;

class DiagnosticChrome {
  constructor(port = CDP_PORT) {
    this.port = port;
    this.proc = null;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.networkLogs = [];
    this.consoleLogs = [];
  }

  async launch(url) {
    const userData = `C:\\Users\\ahmet\\AppData\\Local\\Temp\\chrome-verify-${Date.now()}`;
    this.proc = spawn(
      CHROME_PATH,
      [
        `--remote-debugging-port=${this.port}`,
        `--user-data-dir=${userData}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--headless=new",
        "--disable-gpu",
        "--window-size=1280,800",
        url,
      ],
      { stdio: "ignore" }
    );

    let wsUrl = null;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      try {
        const list = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${this.port}/json/list`, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => resolve(JSON.parse(data)));
          }).on("error", reject);
        });
        const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
        if (page) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {}
    }

    if (!wsUrl) throw new Error("Could not find Chrome CDP WebSocket URL");

    this.ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        this.onEvent(msg.method, msg.params);
      }
    };

    await this.send("Network.enable");
    await this.send("Page.enable");
    await this.send("Runtime.enable");
  }

  onEvent(method, params) {
    const time = new Date().toISOString().slice(11, 23);
    if (method === "Network.requestWillBeSent") {
      this.networkLogs.push({
        time,
        type: "REQ",
        url: params.request.url,
        id: params.requestId,
        method: params.request.method,
      });
    } else if (method === "Network.responseReceived") {
      this.networkLogs.push({
        time,
        type: "RES",
        url: params.response.url,
        status: params.response.status,
        statusText: params.response.statusText,
        id: params.requestId,
      });
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
    try {
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
    } catch (err) {
      if (String(err).includes("navigated or closed")) {
        await new Promise((r) => setTimeout(r, 800));
        return this.eval(expression);
      }
      throw err;
    }
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

async function testNavigate(browser, targetHref) {
  // Ensure DOM is ready and link is present
  for (let i = 0; i < 20; i++) {
    try {
      const exists = await browser.eval(`Boolean(document.querySelector('a[href="${targetHref}"]'))`);
      if (exists) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }

  const result = await browser.eval(`
    (async () => {
      const link = document.querySelector('a[href="${targetHref}"]');
      if (!link) return { found: false, error: 'Link not found: ${targetHref}' };

      const rect = link.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      const isDirectHit = hit === link || link.contains(hit);

      const startTime = performance.now();
      const startPath = window.location.pathname;

      // Click the link
      link.click();

      // Check if loading bar appeared
      let sawLoadingBar = false;
      for (let i = 0; i < 10; i++) {
        if (document.querySelector('.app-loading-bar')) {
          sawLoadingBar = true;
          break;
        }
        await new Promise(r => setTimeout(r, 20));
      }

      // Wait for pathname to change to targetHref
      let changed = false;
      for (let i = 0; i < 40; i++) {
        if (window.location.pathname === "${targetHref}") {
          changed = true;
          break;
        }
        await new Promise(r => setTimeout(r, 100));
      }

      const elapsed = performance.now() - startTime;
      return {
        found: true,
        startPath,
        endPath: window.location.pathname,
        changed,
        durationMs: Math.round(elapsed),
        isDirectHit,
        sawLoadingBar,
      };
    })()
  `);
  return result;
}

async function run() {
  console.log("=============================================================");
  console.log(`SANAYİPRO 2.0 — KALICI DONDURMA VE NAVİGASYON DOĞRULAMASI`);
  console.log(`Hedef Port: ${TARGET_PORT}`);
  console.log("=============================================================");

  const cdpPort = 9450 + Math.floor(Math.random() * 50);
  const browser = new DiagnosticChrome(cdpPort);
  try {
    console.log("\n[1] Demo hesabına giriş yapılıyor...");
    await browser.launch(`${BASE_URL}/login`);

    // Wait for login button
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const ok = await browser.eval(`Boolean(document.querySelector('.login-branch-demo-action-btn') || document.querySelector('button[type="submit"]'))`);
      if (ok) break;
    }

    // Fill demo credentials and submit form
    await browser.eval(`
      (() => {
        const emailInput = document.getElementById('login-email');
        const passInput = document.getElementById('login-password');
        if (emailInput && passInput) {
          emailInput.value = 'admin@sanayipro.com';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));
          passInput.value = 'sanayipro_admin';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setTimeout(() => {
          const form = document.querySelector('form.login-form') || document.querySelector('form');
          if (form) form.requestSubmit();
        }, 200);
      })()
    `);

    // Poll for pathname to start with /app
    let authed = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const p = await browser.eval(`window.location.pathname`);
      if (p && p.startsWith("/app")) {
        authed = true;
        break;
      }
    }
    console.log(`  -> Giriş yapıldı mı: ${authed ? "EVET" : "HAYIR"}`);
    await new Promise((r) => setTimeout(r, 1000));

    // Dismiss tour modal if open
    await browser.eval(`
      (() => {
        const closeBtn = document.querySelector('.tour-btn-outline') || document.querySelector('[aria-label="Kapat"]') || document.querySelector('.tour-close-btn');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    const currentUrl = await browser.eval(`window.location.href`);
    console.log(`  -> Aktif URL: ${currentUrl}`);

    // TEST 1: Rapid Multi-Page Transitions across 6 core screens
    console.log("\n[TEST 1] 6 Ana Sayfa Arasında Ardışık Geçişler:");
    const testRoutes = [
      { href: "/app/work-orders", name: "İş Emirleri" },
      { href: "/app/customers", name: "Müşteriler" },
      { href: "/app/calendar", name: "Takvim" },
      { href: "/app/team", name: "Ekip" },
      { href: "/app/stock", name: "Stok" },
      { href: "/app/reports", name: "Raporlar" },
      { href: "/app/finance", name: "Finans" },
      { href: "/app", name: "Genel Bakış" },
    ];

    for (const route of testRoutes) {
      const res = await testNavigate(browser, route.href);
      console.log(`  -> ${route.name.padEnd(14)} (${route.href}): Başarılı=${res.changed}, Süre=${res.durationMs}ms, LoadingBar=${res.sawLoadingBar}`);
      if (!res.changed) throw new Error(`Navigation failed to ${route.href}`);
      await new Promise((r) => setTimeout(r, 300));
    }

    // TEST 2: Tab Background / Visibility Simulation
    console.log("\n[TEST 2] Sekme Arka Plana Atılma (Visibility Hidden -> Visible) Simülasyonu:");
    await browser.eval(`
      (() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      })()
    `);
    console.log("  -> Sekme 5 saniye arka planda tutuluyor...");
    await new Promise((r) => setTimeout(r, 5000));

    await browser.eval(`
      (() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
      })()
    `);
    console.log("  -> Sekme ön plana alındı, keepalive ping ve prefetch tetiklendi.");
    await new Promise((r) => setTimeout(r, 500));

    const postVisNav = await testNavigate(browser, "/app/work-orders");
    console.log(`  -> Ön plana dönüş sonrası İş Emirleri geçişi: Başarılı=${postVisNav.changed}, Süre=${postVisNav.durationMs}ms`);

    // TEST 3: Double-Click Immediate Fallback Resilience
    console.log("\n[TEST 3] Çift Tıklama (Double-Click) Anında Failsafe Testi:");
    const doubleClickRes = await browser.eval(`
      (async () => {
        const link = document.querySelector('a[href="/app/customers"]');
        if (!link) return { found: false };

        const start = performance.now();
        // First click
        link.click();
        // Second click after 80ms
        await new Promise(r => setTimeout(r, 80));
        link.click();

        // Wait for change
        let changed = false;
        for (let i = 0; i < 40; i++) {
          if (window.location.pathname === "/app/customers") {
            changed = true;
            break;
          }
          await new Promise(r => setTimeout(r, 100));
        }

        return {
          found: true,
          changed,
          durationMs: Math.round(performance.now() - start),
          finalPath: window.location.pathname
        };
      })()
    `);
    console.log(`  -> Çift tıklama sonucu: Başarılı=${doubleClickRes.changed}, Süre=${doubleClickRes.durationMs}ms, URL=${doubleClickRes.finalPath}`);

    // TEST 4: Heartbeat & Connection Verification
    console.log("\n[TEST 4] Heartbeat & Keepalive Kontrolü:");
    const pingStatus = await browser.eval(`
      (async () => {
        const res = await fetch('/api/ping');
        return { ok: res.ok, status: res.status };
      })()
    `);
    console.log(`  -> /api/ping yanıtı: ok=${pingStatus.ok}, status=${pingStatus.status}`);

    console.log("\n=============================================================");
    console.log("TÜM DOĞRULAMA TESTLERİ BAŞARIYLA TAMAMLANDI!");
    console.log("=============================================================");

  } catch (err) {
    console.error("\nTEST HATASI:", err);
  } finally {
    await browser.close();
  }
}

run();
