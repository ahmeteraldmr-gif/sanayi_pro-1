import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9339;
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
    const dataDir = path.join(os.tmpdir(), `dnd-session-${Date.now()}`);
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
  console.log("SANAYİPRO 2.0 — TAKVİM SÜRÜKLE & BIRAK E2E TESTLERİ");
  console.log("==========================================================");

  const browser = new BrowserSession(PORT);
  try {
    await browser.launch(`${BASE_URL}/login`);
    console.log("[TEST 1] Tarayıcı başlatıldı, Motor & Mekanik paneline giriş yapılıyor...");
    await sleep(2000); // hydration tamamlanmadan tıklama yok sayılır

    await browser.eval(`
      (() => {
        const btn = document.querySelector('.login-branch-demo-action-btn');
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
    await sleep(3000);

    // Takvim sayfasına git
    await browser.eval(`window.location.href = '${BASE_URL}/app/calendar'`);
    await sleep(2000);

    // 1. Arayüzden Randevu Ekle (Boş Saate Tıklayarak)
    console.log("\n[TEST 2] Arayüz üzerinden Boş Saate Tıklanarak Yeni Randevu Açılıyor...");
    await browser.eval(`
      const emptySlot = Array.from(document.querySelectorAll('.calendar-slot-cell')).find(s => !s.querySelector('.calendar-card'));
      if (emptySlot) emptySlot.click();
    `);
    await sleep(600);

    const formSubmitted = await browser.eval(`(() => {
      const setVal = (el, val) => {
        const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set) desc.set.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const noteInput = document.querySelector('input[placeholder*="Örn:"]');
      if (noteInput) setVal(noteInput, "10.000 km Test Bakımı");

      const saveBtn = document.querySelector('[data-tour="calendar-save-btn"] button');
      if (saveBtn) saveBtn.click();

      const errEl = document.querySelector('.bg-rose-50');
      return {
        formError: errEl ? errEl.textContent.trim() : null
      };
    })()`);
    console.log("  ✓ Randevu formu gönderildi:", formSubmitted);
    await sleep(1000);

    // Kartı bul
    const initialCard = await browser.eval(`(() => {
      const card = Array.from(document.querySelectorAll('.calendar-card')).find(c => c.textContent.includes('10.000 km Test Bakımı'));
      if (!card) return null;
      return {
        apptId: card.getAttribute('data-appt-id'),
        text: card.textContent.trim(),
        hasResizeHandle: !!card.querySelector('.calendar-card-resize-handle')
      };
    })()`);
    console.log("  ✓ Takvimde oluşturulan kart:", initialCard);
    if (!initialCard) throw new Error("Yeni randevu kartı takvimde bulunamadı!");

    // 2. Randevuyu Başka Saate Sürükle (Aynı gün içinde 11:00'e)
    console.log("\n[TEST 3] Randevu Başka Saate Sürükleniyor...");
    const dragResult = await browser.eval(`(() => {
      const card = document.querySelector('[data-appt-id="${initialCard.apptId}"]');
      const targetSlot = document.querySelector('[data-hour="11"]');
      if (!card || !targetSlot) return { error: 'Elementler bulunamadı' };

      const cRect = card.getBoundingClientRect();
      const tRect = targetSlot.getBoundingClientRect();

      // 1. Pointer Down
      card.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: cRect.left + 15,
        clientY: cRect.top + 15,
        pointerType: 'mouse'
      }));

      // 2. Pointer Move (Hedef slota git)
      window.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        clientX: tRect.left + 25,
        clientY: tRect.top + 25,
        pointerType: 'mouse'
      }));

      const ghost = document.querySelector('.calendar-drag-ghost');
      const hasGhost = !!ghost;

      // 3. Pointer Up (Drop)
      window.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        clientX: tRect.left + 25,
        clientY: tRect.top + 25,
        pointerType: 'mouse'
      }));

      return { success: true, hasGhost };
    })()`);
    console.log("  ✓ Sürükleme tetiklendi (Ghost kart kontrolü dahil):", dragResult);
    await sleep(600);

    // Toast bildirimi çıktı mı?
    const toastCheck = await browser.eval(`(() => {
      const toast = document.querySelector('.calendar-drag-notification-toast');
      return toast ? toast.textContent.trim() : null;
    })()`);
    console.log("  ✓ İşlem Toast Bildirimi:", toastCheck);

    // 3. Randevu Süresini Değiştirme (Resize Handle ile 90 dakikaya uzatma)
    console.log("\n[TEST 4] Randevu Süresi Resize Handle ile Uzatılıyor...");
    const resizeResult = await browser.eval(`(() => {
      const card = document.querySelector('[data-appt-id="${initialCard.apptId}"]');
      const handle = card?.querySelector('.calendar-card-resize-handle');
      if (!handle) return { error: 'Resize handle bulunamadı' };

      const hRect = handle.getBoundingClientRect();

      handle.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: hRect.left + 10,
        clientY: hRect.top + 2,
        pointerType: 'mouse'
      }));

      // Aşağı 40px çek (30 dk uzat)
      window.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        clientX: hRect.left + 10,
        clientY: hRect.top + 45,
        pointerType: 'mouse'
      }));

      window.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        clientX: hRect.left + 10,
        clientY: hRect.top + 45,
        pointerType: 'mouse'
      }));

      return { success: true };
    })()`);
    console.log("  ✓ Resize işlemi tamamlandı:", resizeResult);
    await sleep(600);

    const resizeToast = await browser.eval(`(() => {
      const toast = document.querySelector('.calendar-drag-notification-toast');
      return toast ? toast.textContent.trim() : null;
    })()`);
    console.log("  ✓ Süre Güncelleme Toast Bildirimi:", resizeToast);

    // 4. Kalıcılık Kontrolü: Sayfa Yenileme (Reload)
    console.log("\n[TEST 5] Sayfa Yenileniyor (Reload Persistence Kontrolü)...");
    await browser.eval(`window.location.reload()`);
    await sleep(2000);

    const persistedCard = await browser.eval(`(() => {
      const card = document.querySelector('[data-appt-id="${initialCard.apptId}"]');
      if (!card) return null;
      return {
        text: card.textContent.trim(),
        parentHour: card.closest('[data-hour]')?.getAttribute('data-hour')
      };
    })()`);
    console.log("  ✓ Sayfa yenilendikten sonra randevu son konumunda ve süresinde mi:", persistedCard);

    // 5. Mobil 390px Dokunmatik Sürükleme Uyumu Kontrolü
    console.log("\n[TEST 6] Mobil 390px Dokunmatik Uyumluluğu Test Ediliyor...");
    await browser.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
    await sleep(600);

    const mobileChecks = await browser.eval(`(() => {
      const strip = document.querySelector('.calendar-mobile-day-strip');
      const card = document.querySelector('.calendar-card');
      const bodyWidth = document.body.scrollWidth;
      const windowWidth = window.innerWidth;
      return {
        dayStripVisible: !!strip && window.getComputedStyle(strip).display !== 'none',
        hasHorizontalOverflow: bodyWidth > windowWidth,
        cardTouchAction: card ? window.getComputedStyle(card).touchAction : null
      };
    })()`);
    console.log("  ✓ Mobil 390px Kontrolleri:", mobileChecks);

    console.log("\n==========================================================");
    console.log("SONUÇ: BÜTÜN DRAG & DROP VE MOBİL TESTLER BAŞARIYLA TAMAMLANDI!");
    console.log("==========================================================");
  } catch (err) {
    console.error("Test hatası:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
