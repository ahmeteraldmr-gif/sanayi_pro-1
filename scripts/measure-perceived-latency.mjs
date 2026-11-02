// scripts/measure-perceived-latency.mjs
import { spawn } from "node:child_process";
import http from "node:http";

const TARGET_PORT = process.env.TEST_PORT || "3001";
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9495 + Math.floor(Math.random() * 20);

class DiagnosticChrome {
  constructor(port = CDP_PORT) {
    this.port = port;
    this.proc = null;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
    this.networkLogs = [];
  }

  async launch(url) {
    const userData = `C:\\Users\\ahmet\\AppData\\Local\\Temp\\chrome-perceived-${Date.now()}`;
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
    const time = performance.now();
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
    } else if (method === "Network.loadingFinished") {
      this.networkLogs.push({
        time,
        type: "DONE",
        id: params.requestId,
      });
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
        await new Promise((r) => setTimeout(r, 600));
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

async function measurePerceivedPageTransition(browser, targetHref, expectedH1Regex, expectedContentSelector) {
  browser.networkLogs = [];

  const result = await browser.eval(`
    (async () => {
      const link = document.querySelector('a[href="${targetHref}"]');
      if (!link) return { error: "Link not found: ${targetHref}" };

      const initialH1 = document.querySelector('h1')?.innerText?.trim() || "";
      const initialPath = window.location.pathname;

      let clickEventFiredMs = 0;
      let firstVisualFeedbackMs = 0;
      let urlChangedMs = 0;
      let contentMountedMs = 0;
      let fullyInteractiveMs = 0;
      let sawLoadingPlaceholder = false;

      const t0 = performance.now();

      // Check click event timing
      link.addEventListener('click', () => {
        clickEventFiredMs = performance.now() - t0;
      }, { once: true });

      // Click
      link.click();

      // Loop to capture real perception milestones
      const expectedRegex = new RegExp("${expectedH1Regex}", "i");

      for (let i = 0; i < 200; i++) {
        const now = performance.now() - t0;

        // Visual feedback (loading bar or optimistic nav highlight)
        if (!firstVisualFeedbackMs) {
          const loadingBar = document.querySelector('.app-loading-bar');
          const activeLink = document.querySelector('.app-nav-link.is-active[href="${targetHref}"]');
          if (loadingBar || activeLink) {
            firstVisualFeedbackMs = now;
          }
        }

        // Did app-route-loading / placeholder appear?
        if (document.querySelector('.app-route-loading')) {
          sawLoadingPlaceholder = true;
        }

        // URL change
        if (!urlChangedMs && window.location.pathname === "${targetHref}") {
          urlChangedMs = now;
        }

        // New content mounted (H1 or heading changed)
        const currentH1 = document.querySelector('h1')?.innerText?.trim() || "";
        if (!contentMountedMs && expectedRegex.test(currentH1) && currentH1 !== initialH1) {
          contentMountedMs = now;
        }

        // Fully interactive (target content selector present and interactive)
        if (!fullyInteractiveMs && contentMountedMs) {
          const contentEl = document.querySelector("${expectedContentSelector}");
          if (contentEl) {
            fullyInteractiveMs = now;
            break;
          }
        }

        await new Promise(r => setTimeout(r, 15));
      }

      return {
        initialPath,
        finalPath: window.location.pathname,
        initialH1,
        finalH1: document.querySelector('h1')?.innerText?.trim() || "",
        clickEventFiredMs: Math.round(clickEventFiredMs * 10) / 10,
        firstVisualFeedbackMs: Math.round(firstVisualFeedbackMs),
        urlChangedMs: Math.round(urlChangedMs),
        contentMountedMs: Math.round(contentMountedMs),
        fullyInteractiveMs: Math.round(fullyInteractiveMs),
        sawLoadingPlaceholder,
        totalDurationMs: Math.round(performance.now() - t0),
      };
    })()
  `);

  const rscReq = browser.networkLogs.find(l => l.type === "REQ" && l.url && l.url.includes("_rsc="));
  const rscRes = browser.networkLogs.find(l => l.type === "RES" && l.url && l.url.includes("_rsc="));
  const rscDuration = rscReq && rscRes ? Math.round(rscRes.time - rscReq.time) : 0;

  return {
    ...result,
    rscDurationMs: rscDuration,
    rscCount: browser.networkLogs.filter(l => l.url && l.url.includes("_rsc=")).length,
  };
}

async function run() {
  console.log("=============================================================");
  console.log(`SANAYİPRO 2.0 — GERÇEK KULLANICI ALGI VE YÜKLENME GECİKMESİ ÖLÇÜMÜ`);
  console.log(`Hedef Port: ${TARGET_PORT}`);
  console.log("=============================================================");

  const browser = new DiagnosticChrome();
  try {
    await browser.launch(`${BASE_URL}/login`);

    // Login
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const ok = await browser.eval(`Boolean(document.getElementById('login-email'))`);
      if (ok) break;
    }

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
        }, 150);
      })()
    `);

    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const p = await browser.eval(`window.location.pathname`);
      if (p && p.startsWith("/app")) break;
    }
    await new Promise((r) => setTimeout(r, 800));

    // Dismiss tour
    await browser.eval(`
      (() => {
        const closeBtn = document.querySelector('.tour-btn-outline') || document.querySelector('[aria-label="Kapat"]') || document.querySelector('.tour-close-btn');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    console.log("Başlangıç Sayfası: " + (await browser.eval(`window.location.href`)));

    // Transition suite:
    // 1. /app -> /app/work-orders
    // 2. /app/work-orders -> /app/customers
    // 3. /app/customers -> /app/intake
    // 4. /app/intake -> /app/calendar
    // 5. /app/calendar -> /app/team
    // 6. /app/team -> /app/stock
    // 7. /app/stock -> /app/finance
    // 8. /app/finance -> /app/reports
    // 9. /app/reports -> /app (Genel Bakış)
    const testCases = [
      { name: "İş Emirleri", href: "/app/work-orders", h1: "İş Emirleri", selector: ".app-orders-toolbar, button" },
      { name: "Müşteri & Araçlar", href: "/app/customers", h1: "Müşteri & Araçlar", selector: ".records-summary-wrap, button" },
      { name: "Araç Kabul", href: "/app/intake", h1: "Yeni Araç Kabul|Araç Kabul", selector: ".intake-layout, .intake-panel, button" },
      { name: "Takvim", href: "/app/calendar", h1: "Randevu Çizelgesi|Takvim", selector: ".calendar-root, button" },
      { name: "Ekip", href: "/app/team", h1: "Ekip", selector: ".app-team-grid, button" },
      { name: "Stok", href: "/app/stock", h1: "Stok", selector: ".app-stock-table, button" },
      { name: "Finans", href: "/app/finance", h1: "Finans", selector: ".finance-summary, button" },
      { name: "Raporlar", href: "/app/reports", h1: "Raporlar", selector: ".reports-container, button" },
      { name: "Genel Bakış", href: "/app", h1: "Genel Bakış|Atölye", selector: ".app-dashboard-grid, button" },
    ];

    console.log("\n" + "Sayfa".padEnd(18) + "Tepki(ms)".padEnd(12) + "URL(ms)".padEnd(10) + "H1(ms)".padEnd(10) + "İçerik(ms)".padEnd(12) + "Toplam(ms)".padEnd(12) + "RSC(ms)");
    console.log("-".repeat(84));

    for (const tc of testCases) {
      const res = await measurePerceivedPageTransition(browser, tc.href, tc.h1, tc.selector);
      console.log(
        tc.name.padEnd(18) +
        String(res.firstVisualFeedbackMs).padEnd(12) +
        String(res.urlChangedMs).padEnd(10) +
        String(res.contentMountedMs).padEnd(10) +
        String(res.fullyInteractiveMs).padEnd(12) +
        String(res.totalDurationMs).padEnd(12) +
        (res.rscDurationMs ? `${res.rscDurationMs}ms` : "cache")
      );
      await new Promise(r => setTimeout(r, 400));
    }

  } catch (err) {
    console.error("ÖLÇÜM HATASI:", err);
  } finally {
    await browser.close();
  }
}

run();
