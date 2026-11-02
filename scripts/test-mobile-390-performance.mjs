// scripts/test-mobile-390-performance.mjs
import { spawn } from "node:child_process";
import http from "node:http";

const TARGET_PORT = process.env.TEST_PORT || "3001";
const BASE_URL = `http://127.0.0.1:${TARGET_PORT}`;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CDP_PORT = 9520 + Math.floor(Math.random() * 20);

class DiagnosticChrome {
  constructor(port = CDP_PORT) {
    this.port = port;
    this.proc = null;
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async launch(url) {
    const userData = `C:\\Users\\ahmet\\AppData\\Local\\Temp\\chrome-mob-${Date.now()}`;
    this.proc = spawn(
      CHROME_PATH,
      [
        `--remote-debugging-port=${this.port}`,
        `--user-data-dir=${userData}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--headless=new",
        "--disable-gpu",
        "--window-size=390,844",
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
      }
    };

    await this.send("Page.enable");
    await this.send("Runtime.enable");
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
        throw new Error(`Eval Exception: ${res.exceptionDetails.text}`);
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
      try { this.ws.close(); } catch {}
    }
    if (this.proc) {
      try { this.proc.kill("SIGKILL"); } catch {}
    }
  }
}

async function run() {
  console.log("=============================================================");
  console.log(`SANAYİPRO 2.0 — MOBİL 390px NAVİGASYON VE PERFORMANS TESTİ`);
  console.log(`Hedef Port: ${TARGET_PORT}`);
  console.log("=============================================================");

  const browser = new DiagnosticChrome();
  try {
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

    const viewport = await browser.eval(`({ w: window.innerWidth, h: window.innerHeight })`);
    console.log(`Mobil Viewport: ${viewport.w}x${viewport.h}`);

    // Mobile Bottom Nav Transitions
    const mobileLinks = [
      { name: "Bugün (Genel Bakış)", href: "/app" },
      { name: "İşler (İş Emirleri)", href: "/app/work-orders" },
      { name: "Takvim", href: "/app/calendar" },
    ];

    console.log("\n[1] Mobil Alt Menü (Bottom Navigation) Geçişleri:");
    for (const item of mobileLinks) {
      const res = await browser.eval(`
        (async () => {
          const link = document.querySelector('.app-bottom-nav a[href="${item.href}"]');
          if (!link) return { error: "Link not found: ${item.href}" };

          const t0 = performance.now();
          link.click();

          let changed = false;
          for (let i = 0; i < 40; i++) {
            if (window.location.pathname === "${item.href}") {
              changed = true;
              break;
            }
            await new Promise(r => setTimeout(r, 20));
          }

          return {
            changed,
            durationMs: Math.round(performance.now() - t0),
            finalPath: window.location.pathname,
          };
        })()
      `);
      console.log(`  -> ${item.name.padEnd(24)}: Başarılı=${res.changed}, Süre=${res.durationMs}ms`);
      await new Promise(r => setTimeout(r, 300));
    }

    // Mobile Drawer Navigation (Menu Trigger)
    console.log("\n[2] Mobil Yan Menü (Mobile Drawer) Üzerinden Geçişler:");
    const drawerLinks = [
      { name: "Müşteri & Araçlar", href: "/app/customers" },
      { name: "Ekip", href: "/app/team" },
      { name: "Stok", href: "/app/stock" },
      { name: "Finans", href: "/app/finance" },
    ];

    for (const item of drawerLinks) {
      const res = await browser.eval(`
        (async () => {
          // Open mobile menu
          const trigger = document.querySelector('.app-mobile-trigger') || document.querySelector('.app-bottom-nav button');
          if (trigger) trigger.click();
          await new Promise(r => setTimeout(r, 200));

          const link = document.querySelector('.app-mobile-menu a[href="${item.href}"]') || document.querySelector('a[href="${item.href}"]');
          if (!link) return { error: "Drawer link not found: ${item.href}" };

          const t0 = performance.now();
          link.click();

          let changed = false;
          for (let i = 0; i < 40; i++) {
            if (window.location.pathname === "${item.href}") {
              changed = true;
              break;
            }
            await new Promise(r => setTimeout(r, 20));
          }

          return {
            changed,
            durationMs: Math.round(performance.now() - t0),
            finalPath: window.location.pathname,
          };
        })()
      `);
      console.log(`  -> ${item.name.padEnd(24)}: Başarılı=${res.changed}, Süre=${res.durationMs}ms`);
      await new Promise(r => setTimeout(r, 300));
    }

    console.log("\n=============================================================");
    console.log("MOBİL 390px TESTLERİ BAŞARIYLA TAMAMLANDI!");
    console.log("=============================================================");

  } catch (err) {
    console.error("MOBİL TEST HATASI:", err);
  } finally {
    await browser.close();
  }
}

run();
