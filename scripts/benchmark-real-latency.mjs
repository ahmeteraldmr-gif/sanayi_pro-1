// scripts/benchmark-real-latency.mjs
import { spawn } from "node:child_process";
import http from "node:http";

const TARGET_PORT = process.env.TEST_PORT || "3001";
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9490 + Math.floor(Math.random() * 20);

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
    const userData = `C:\\Users\\ahmet\\AppData\\Local\\Temp\\chrome-latency-${Date.now()}`;
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
        timing: params.response.timing,
      });
    } else if (method === "Network.loadingFinished") {
      this.networkLogs.push({
        time,
        type: "DONE",
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

async function measureNavigation(browser, targetHref, pageName) {
  browser.networkLogs = [];

  const measurement = await browser.eval(`
    (async () => {
      const link = document.querySelector('a[href="${targetHref}"]');
      if (!link) return { error: "Link not found for ${targetHref}" };

      const t0 = performance.now();
      let clickDispatchTime = 0;
      let urlChangeTime = 0;
      let firstVisibleTime = 0;
      let usableTime = 0;

      // Attach temporary listener to capture click-to-handler time
      const onClick = () => {
        clickDispatchTime = performance.now() - t0;
      };
      link.addEventListener('click', onClick, { once: true });

      // Trigger click
      link.click();

      // Poll for URL change
      for (let i = 0; i < 80; i++) {
        if (window.location.pathname === "${targetHref}") {
          urlChangeTime = performance.now() - t0;
          break;
        }
        await new Promise(r => setTimeout(r, 10));
      }

      // Poll for content render in main#app-content
      const main = document.getElementById('app-content');
      for (let i = 0; i < 80; i++) {
        const text = main ? main.innerText.trim() : "";
        if (text.length > 20) {
          firstVisibleTime = performance.now() - t0;
          break;
        }
        await new Promise(r => setTimeout(r, 10));
      }

      // Poll for full interactivity (buttons, tables, cards rendered and clickable)
      for (let i = 0; i < 80; i++) {
        const interactiveElements = main ? main.querySelectorAll('button, a, input, [role="button"]') : [];
        if (interactiveElements.length > 2) {
          usableTime = performance.now() - t0;
          break;
        }
        await new Promise(r => setTimeout(r, 10));
      }

      return {
        success: Boolean(urlChangeTime),
        clickDispatchMs: Math.round(clickDispatchTime * 10) / 10,
        urlChangeMs: Math.round(urlChangeTime),
        firstVisibleMs: Math.round(firstVisibleTime),
        usableMs: Math.round(usableTime),
        totalMs: Math.round(performance.now() - t0),
      };
    })()
  `);

  // Analyze network requests made during this transition
  const rscReqs = browser.networkLogs.filter(l => l.url && l.url.includes("_rsc="));

  return {
    pageName,
    targetHref,
    ...measurement,
    rscRequestCount: rscReqs.filter(r => r.type === "REQ").length,
    rscResponseCount: rscReqs.filter(r => r.type === "RES").length,
  };
}

async function run() {
  console.log("=============================================================");
  console.log(`SANAYİPRO 2.0 — GERÇEK PERFORMANS VE GECİKME ÖLÇÜMÜ`);
  console.log(`Hedef Port: ${TARGET_PORT}`);
  console.log("=============================================================");

  const browser = new DiagnosticChrome();
  try {
    console.log("\n[1] Demo hesabına giriş yapılıyor...");
    await browser.launch(`${BASE_URL}/login`);

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

    // Dismiss tour modal
    await browser.eval(`
      (() => {
        const closeBtn = document.querySelector('.tour-btn-outline') || document.querySelector('[aria-label="Kapat"]') || document.querySelector('.tour-close-btn');
        if (closeBtn) closeBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    console.log("  -> Başlangıç Sayfası: " + (await browser.eval(`window.location.href`)));

    // Measure the 9 core pages in sequence (First Visit)
    const routes = [
      { name: "Genel Bakış", href: "/app" },
      { name: "İş Emirleri", href: "/app/work-orders" },
      { name: "Müşteri & Araçlar", href: "/app/customers" },
      { name: "Araç Kabul", href: "/app/intake" },
      { name: "Takvim", href: "/app/calendar" },
      { name: "Ekip", href: "/app/team" },
      { name: "Stok", href: "/app/stock" },
      { name: "Finans", href: "/app/finance" },
      { name: "Raporlar", href: "/app/reports" },
    ];

    console.log("\n[AŞAMA 1: İLK ZİYARET (FIRST VISIT) ÖLÇÜMLERİ]");
    console.log("Sayfa".padEnd(20) + "Click(ms)".padEnd(12) + "URL(ms)".padEnd(12) + "Visible(ms)".padEnd(14) + "Usable(ms)".padEnd(12) + "Total(ms)".padEnd(12) + "RSC Reqs");
    console.log("-".repeat(84));

    const firstVisitResults = [];
    for (const r of routes) {
      const res = await measureNavigation(browser, r.href, r.name);
      firstVisitResults.push(res);
      console.log(
        res.pageName.padEnd(20) +
        String(res.clickDispatchMs).padEnd(12) +
        String(res.urlChangeMs).padEnd(12) +
        String(res.firstVisibleMs).padEnd(14) +
        String(res.usableMs).padEnd(12) +
        String(res.totalMs).padEnd(12) +
        `${res.rscRequestCount} req / ${res.rscResponseCount} res`
      );
      await new Promise(r => setTimeout(r, 400));
    }

    console.log("\n[AŞAMA 2: İKİNCİ ZİYARET (RETURN VISIT / CACHED) ÖLÇÜMLERİ]");
    console.log("Sayfa".padEnd(20) + "Click(ms)".padEnd(12) + "URL(ms)".padEnd(12) + "Visible(ms)".padEnd(14) + "Usable(ms)".padEnd(12) + "Total(ms)".padEnd(12) + "RSC Reqs");
    console.log("-".repeat(84));

    const returnVisitResults = [];
    for (const r of routes.slice().reverse()) {
      const res = await measureNavigation(browser, r.href, r.name);
      returnVisitResults.push(res);
      console.log(
        res.pageName.padEnd(20) +
        String(res.clickDispatchMs).padEnd(12) +
        String(res.urlChangeMs).padEnd(12) +
        String(res.firstVisibleMs).padEnd(14) +
        String(res.usableMs).padEnd(12) +
        String(res.totalMs).padEnd(12) +
        `${res.rscRequestCount} req / ${res.rscResponseCount} res`
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
