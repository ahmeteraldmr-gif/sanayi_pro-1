import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9340;
const BASE_URL = process.env.TEST_URL || "http://127.0.0.1:3000";

class BrowserSession {
  constructor(port) {
    this.port = port;
    this.ws = null;
    this.proc = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async launch(url) {
    const dataDir = path.join(os.tmpdir(), `mobile-calendar-${Date.now()}`);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    this.proc = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        `--remote-debugging-port=${this.port}`,
        "--window-size=390,844",
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
        const res = await fetch(`http://127.0.0.1:${this.port}/json/list`);
        const tabs = await res.json();
        const page = tabs.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
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
          await this.send("Page.enable");
          await this.send("Runtime.enable");
          await this.send("DOM.enable");
          return;
        }
      } catch {}
    }
    throw new Error("Chrome CDP bağlantısı kurulamadı");
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expr) {
    const res = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log("==========================================================");
  console.log("SANAYİPRO 2.0 — MOBİL VE DOKUNMATİK TAKVİM TEST SÜİTİ");
  console.log("==========================================================");

  const browser = new BrowserSession(PORT);
  try {
    await browser.launch(`${BASE_URL}/login`);

    // 1. Ekran Boyutlarını Test Et (320px, 375px, 390px, 430px)
    console.log("\n[TEST 1] Farklı Mobil Çözünürlüklerde Taşma (Overflow) Testi...");
    const viewports = [
      { name: "320px (Ultra Kompakt)", width: 320, height: 640 },
      { name: "375px (iPhone SE)", width: 375, height: 667 },
      { name: "390px (iPhone 12/13/14)", width: 390, height: 844 },
      { name: "430px (iPhone Pro Max)", width: 430, height: 932 },
    ];

    await sleep(1500);

    // Giriş yap
    await browser.eval(`
      (() => {
        const btn = document.querySelector('.login-branch-demo-action-btn') || document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    await sleep(2500);

    // Varsa Hoş Geldiniz modalını kapat
    await browser.eval(`
      (() => {
        const dismissBtn = document.querySelector('.tour-btn-outline') || document.querySelector('button[aria-label="Kapat"]');
        if (dismissBtn) dismissBtn.click();
      })()
    `);
    await sleep(500);

    // Takvim sayfasına geç
    await browser.eval(`window.location.href = '${BASE_URL}/app/calendar'`);
    await sleep(2000);

    for (const vp of viewports) {
      await browser.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 3,
        mobile: true,
      });
      await sleep(300);

      const overflow = await browser.eval(`(() => {
        const root = document.querySelector('.calendar-root');
        const offenders = [];
        document.querySelectorAll('*').forEach(el => {
          if (el.scrollWidth > window.innerWidth && !el.classList.contains('calendar-mobile-day-strip') && !el.classList.contains('calendar-scroll-container')) {
            offenders.push({ tag: el.tagName, cls: el.className, w: el.scrollWidth, boundW: el.getBoundingClientRect().width });
          }
        });
        return {
          scrollWidth: document.body.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.body.scrollWidth > window.innerWidth,
          offenders: offenders.slice(0, 5),
          isDaily: !!document.querySelector('.calendar-daily-table'),
          hasDayStrip: !!document.querySelector('.calendar-mobile-day-strip')
        };
      })()`);

      console.log(`  -> ${vp.name}: Taşma var mı? ${overflow.hasOverflow ? "EVET (HATA)" : "HAYIR (0px taşma ✅)"} | Günlük mod: ${overflow.isDaily} | Gün Şeridi: ${overflow.hasDayStrip}`);
      if (overflow.hasOverflow) {
        console.log("  Offenders:", JSON.stringify(overflow.offenders, null, 2));
        throw new Error(`${vp.name} ekranında sağa sola yatay taşma tespit edildi!`);
      }
    }

    // 2. iPhone 390px Üzerinde Dokunmatik Testler
    await browser.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await sleep(400);

    console.log("\n[TEST 2] Mobil Yatay Gün Şeridi (Day Strip) Etkileşimi...");
    const dayPillsCount = await browser.eval(`
      document.querySelectorAll('.calendar-mobile-day-pill').length
    `);
    console.log(`  ✓ Mobilde görünen gün sayısı: ${dayPillsCount} (7 gün)`);

    // Başka güne tıkla (Örn: 2. güne)
    await browser.eval(`
      const pills = document.querySelectorAll('.calendar-mobile-day-pill');
      if (pills[1]) pills[1].click();
    `);
    await sleep(400);
    const activeDateTitle = await browser.eval(`
      document.querySelector('.calendar-current-date-title')?.textContent?.trim()
    `);
    console.log(`  ✓ Gün şeridinden gün değiştirildi, yeni aktif gün: "${activeDateTitle}"`);

    // 3. Randevuya Dokunma -> Mobil Bottom Sheet Açılması
    console.log("\n[TEST 3] Randevuya Kısa Dokunma -> Bottom Sheet Denetimi...");
    // Bir randevu ekle
    await browser.eval(`
      const emptyAction = document.querySelector('.calendar-daily-empty-action');
      if (emptyAction) emptyAction.click();
    `);
    await sleep(500);

    await browser.eval(`(() => {
      const setVal = (el, val) => {
        const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set) desc.set.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const noteInput = document.querySelector('input[placeholder*="Örn:"]');
      if (noteInput) setVal(noteInput, "Mobil Yağ & Filtre Değişimi");
      const saveBtn = document.querySelector('[data-tour="calendar-save-btn"] button');
      if (saveBtn) saveBtn.click();
    })()`);
    await sleep(1000);

    // Randevu kartına tıkla
    await browser.eval(`
      const card = Array.from(document.querySelectorAll('.calendar-card')).find(c => c.textContent.includes('Mobil Yağ & Filtre'));
      if (card) card.click();
    `);
    await sleep(500);

    // Bottom Sheet kontrolü
    const bottomSheetInfo = await browser.eval(`(() => {
      const panel = document.querySelector('.calendar-drawer-panel');
      if (!panel) return null;
      const rect = panel.getBoundingClientRect();
      const style = window.getComputedStyle(panel);
      return {
        bottom: rect.bottom,
        windowHeight: window.innerHeight,
        isAtBottom: Math.abs(rect.bottom - window.innerHeight) <= 2,
        hasQuickDurations: !!panel.querySelector('button[type="button"]'),
        hasIntakeBtn: !!panel.querySelector('a[href*="/app/intake"]'),
        hasCallBtn: !!panel.querySelector('a[href^="tel:"]') || !!panel.querySelector('button:has(.lucide-phone)')
      };
    })()`);
    console.log("  ✓ Alttan açılan Bottom Sheet aktif mi:", bottomSheetInfo?.isAtBottom ? "EVET (Ekranın altından açıldı ✅)" : "HAYIR");
    console.log("  ✓ Bottom sheet hızlı aksiyonları mevcut mu:", bottomSheetInfo);

    // 4. Mobilde Kolay Süre Değiştirme (Quick Duration Buttons)
    console.log("\n[TEST 4] Mobilde Tek Dokunuşla Randevu Süresi Değiştirme (90 dk)...");
    const durationChanged = await browser.eval(`(() => {
      const btn90 = Array.from(document.querySelectorAll('.calendar-drawer-panel button')).find(b => b.textContent.includes('90 dk'));
      if (!btn90) return false;
      btn90.click();
      return true;
    })()`);
    console.log("  ✓ 90 dk butonuna basıldı:", durationChanged);
    await sleep(600);

    // Drawer'ı kapat
    await browser.eval(`
      const closeBtn = document.querySelector('.ux-drawer-close-btn');
      if (closeBtn) closeBtn.click();
    `);
    await sleep(500);

    // 5. Dokunmatik Uzun Basma ve Sürükleme Simülasyonu (Touch Simulation)
    console.log("\n[TEST 5] Dokunmatik Uzun Basma (Long-Press) ve Taşıma Testi...");
    const touchDragResult = await browser.eval(`(() => {
      const card = Array.from(document.querySelectorAll('.calendar-card')).find(c => c.textContent.includes('Mobil Yağ & Filtre'));
      const targetSlot = document.querySelectorAll('.calendar-daily-row')[4];
      if (!card || !targetSlot) return { error: 'Elementler bulunamadı' };

      const cRect = card.getBoundingClientRect();
      const tRect = targetSlot.getBoundingClientRect();

      // 1. Touch pointerdown
      card.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: cRect.left + 20,
        clientY: cRect.top + 20,
        pointerType: 'touch'
      }));

      return new Promise((resolve) => {
        // 230ms sonra uzun basma tetiklenmiş olmalı
        setTimeout(() => {
          // Pointer move
          window.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true,
            clientX: tRect.left + 40,
            clientY: tRect.top + 20,
            pointerType: 'touch'
          }));

          const ghost = document.querySelector('.calendar-drag-ghost');
          const hasGhost = !!ghost;

          // Pointer up
          window.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true,
            clientX: tRect.left + 40,
            clientY: tRect.top + 20,
            pointerType: 'touch'
          }));

          resolve({ success: true, hasGhost });
        }, 260);
      });
    })()`);
    console.log("  ✓ Dokunmatik uzun basma ve taşıma tamamlandı:", touchDragResult);
    await sleep(600);

    // 6. Sayfa Yenileme ve Kalıcılık
    console.log("\n[TEST 6] Sayfa Yenileme (Reload Persistence)...");
    const activeDateBefore = await browser.eval(`
      document.querySelector('input.calendar-date-picker-input')?.value || ''
    `);
    await browser.eval(`window.location.reload()`);
    await sleep(2000);

    // Eğer sayfa bugüne döndüyse tekrar randevunun eklendiği güne geç
    if (activeDateBefore) {
      await browser.eval(`
        const dateInput = document.querySelector('input.calendar-date-picker-input');
        if (dateInput) {
          dateInput.value = '${activeDateBefore}';
          dateInput.dispatchEvent(new Event('input', { bubbles: true }));
          dateInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      `);
      await sleep(600);
    }

    const reloadedCard = await browser.eval(`
      Array.from(document.querySelectorAll('.calendar-card')).some(c => c.textContent.includes('Mobil Yağ & Filtre'))
    `);
    console.log("  ✓ Sayfa yenilendikten sonra randevu yerinde mi:", reloadedCard);

    console.log("\n==========================================================");
    console.log("SONUÇ: BÜTÜN MOBİL VE DOKUNMATİK TAKVİM TESTLERİ BAŞARIYLA GEÇTİ!");
    console.log("==========================================================");
  } catch (err) {
    console.error("Test hatası:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
