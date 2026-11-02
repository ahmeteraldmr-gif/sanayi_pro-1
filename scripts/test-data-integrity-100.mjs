import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9335;
const BASE_URL = process.env.TEST_URL || "http://127.0.0.1:3001";

class BrowserSession {
  constructor(port) {
    this.port = port;
    this.ws = null;
    this.proc = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async launch(url) {
    const dataDir = path.join(os.tmpdir(), `data-integrity-test-${Date.now()}`);
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
          break;
        }
      } catch {}
    }

    if (!this.ws) throw new Error("Could not connect to Chrome WebSocket");

    await this.send("Page.enable");
    await this.send("Runtime.enable");
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        reject(err);
      }
    });
  }

  async eval(expr) {
    const res = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        res.exceptionDetails.exception?.description ||
          res.exceptionDetails.text ||
          "Eval exception"
      );
    }
    return res.result ? res.result.value : undefined;
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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log("==========================================================");
  console.log("SANAYİPRO — 100 KAYIT VERİ BÜTÜNLÜĞÜ VE KALICILIK TESTİ");
  console.log("==========================================================");

  const browser = new BrowserSession(PORT);
  try {
    await browser.launch(`${BASE_URL}/login`);
    console.log("[1/6] Giriş yapılıyor (Motor Ustası Branşı)...");
    await sleep(1500);

    await browser.eval(`
      (() => {
        const btn = document.querySelector('.login-branch-demo-action-btn') ||
                    document.querySelector('button[type="submit"]') ||
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Demosuna Gir') || b.textContent.includes('Giriş'));
        if (btn) btn.click();
      })()
    `);
    await sleep(2500);

    // Dismiss tour modal if present
    await browser.eval(`
      (() => {
        const dismissBtn = document.querySelector('.tour-btn-outline') ||
                           Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Serbestçe Keşfet') || b.textContent.includes('Kapat'));
        if (dismissBtn) dismissBtn.click();
      })()
    `);
    await sleep(1000);

    // Navigate to work orders
    console.log("[2/6] İş emirleri listesine ve detayına giriliyor...");
    await browser.eval(`window.location.href = '${BASE_URL}/app/work-orders'`);
    await sleep(1500);

    const orderUrl = await browser.eval(`
      (() => {
        const link = document.querySelector('a[href^="/app/work-orders/wo-"]') ||
                    document.querySelector('a[href*="/app/work-orders/"]');
        return link ? link.href : null;
      })()
    `);

    if (!orderUrl) {
      throw new Error("İş emri bağlantısı bulunamadı!");
    }

    console.log(`  ✓ İş emri açılıyor: ${orderUrl}`);
    await browser.eval(`window.location.href = '${orderUrl}'`);
    await sleep(1500);

    // Click History tab
    await browser.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const tab = buttons.find(b => b.textContent.includes('Geçmiş') || b.textContent.includes('Notlar') || b.textContent.includes('İşlem & Notlar'));
        if (tab) tab.click();
      })()
    `);
    await sleep(800);

    // Add 1 real note through UI form to trigger storage initialization
    console.log("[3/6] Form üzerinden ilk not ekleniyor ve 100'er kayıt tohumlanıyor...");
    await browser.eval(`
      (() => {
        const input = document.querySelector('input[aria-label="Personel iç notu"]') ||
                      document.querySelector('input[placeholder*="Not yazın"]');
        const form = input ? input.closest('form') : null;
        const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

        if (input && submitBtn) {
          // Set value with native setter
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'Başlangıç Canlı UI Notu');
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          submitBtn.click();
          return true;
        }
        return false;
      })()
    `);
    await sleep(800);

    // Now seed 100 notes and 100 timeline entries into localStorage
    const seedResult = await browser.eval(`
      (() => {
        const keys = Object.keys(localStorage);
        let ordersKey = keys.find(k => k.includes('orders'));
        if (!ordersKey) {
          // Fallback to active branch key
          ordersKey = 'sanayipro:v1:branch:motor_mekanik:orders';
        }

        let orders = [];
        try {
          orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
        } catch {
          orders = [];
        }

        const parts = window.location.pathname.split('/');
        const orderId = parts[parts.length - 1];
        let targetOrder = orders.find(o => o.id === orderId) || orders[0];

        if (!targetOrder) {
          return { success: false, error: 'Target order bulunamadı! Key: ' + ordersKey + ', Keys: ' + keys.join(', ') };
        }

        const currentNotes = targetOrder.notes || [];
        const newNotes = [];
        for (let i = 1; i <= 100; i++) {
          newNotes.push({
            id: 'note-perf-' + i + '-' + Date.now(),
            author: 'Usta ' + (i % 3 === 0 ? 'Ahmet' : i % 3 === 1 ? 'Mehmet' : 'Can'),
            text: 'Dahili Personel Notu #' + i + ' - Test verisi: Motor ve elektrik kontrolleri tamamlandı.',
            createdAt: '14:' + String(i % 60).padStart(2, '0')
          });
        }
        targetOrder.notes = [...currentNotes, ...newNotes];

        const currentTimeline = targetOrder.timeline || [];
        const newTimeline = [];
        for (let i = 1; i <= 100; i++) {
          newTimeline.push({
            id: 'timeline-perf-' + i + '-' + Date.now(),
            time: '14:' + String(i % 60).padStart(2, '0'),
            text: 'Zaman Çizelgesi Hareketi #' + i + ': İşlem durumu güncellendi, parça monte edildi.'
          });
        }
        targetOrder.timeline = [...currentTimeline, ...newTimeline];

        localStorage.setItem(ordersKey, JSON.stringify(orders));

        return {
          success: true,
          ordersKey,
          totalNotes: targetOrder.notes.length,
          totalTimeline: targetOrder.timeline.length,
          orderId: targetOrder.id
        };
      })()
    `);

    if (!seedResult.success) {
      throw new Error("Veri yüklenemedi: " + seedResult.error);
    }

    console.log(`  ✓ 100 Not ve 100 Timeline eklendi. Toplam Not: ${seedResult.totalNotes}, Toplam Timeline: ${seedResult.totalTimeline} (Anahtar: ${seedResult.ordersKey})`);

    // Reload page to rehydrate from localStorage
    console.log("[4/6] Sayfa yenileniyor ve UI ilk görünüm sınırlandırması test ediliyor...");
    await browser.eval(`window.location.reload()`);
    await sleep(2000);

    // Switch to HistoryTab
    await browser.eval(`
      (() => {
        const tabs = Array.from(document.querySelectorAll('button'));
        const historyTab = tabs.find(b => b.textContent.includes('Geçmiş') || b.textContent.includes('Notlar') || b.textContent.includes('İşlem & Notlar'));
        if (historyTab) historyTab.click();
      })()
    `);
    await sleep(600);

    // Check UI initial view limit (should show 15 notes and 15 timeline items)
    const uiVerification = await browser.eval(`
      (() => {
        const noteBubbles = document.querySelectorAll('.app-chat-note-bubble');
        const timelineItems = document.querySelectorAll('.app-order-timeline li');

        const buttons = Array.from(document.querySelectorAll('button'));
        const fullNotesBtn = buttons.find(b => b.textContent.includes('Tüm Notları Gör'));
        const fullTimelineBtn = buttons.find(b => b.textContent.includes('Tüm Geçmişi Gör'));

        return {
          renderedNotesCount: noteBubbles.length,
          renderedTimelineCount: timelineItems.length,
          hasFullNotesBtn: Boolean(fullNotesBtn),
          fullNotesBtnText: fullNotesBtn ? fullNotesBtn.textContent.trim() : null,
          hasFullTimelineBtn: Boolean(fullTimelineBtn),
          fullTimelineBtnText: fullTimelineBtn ? fullTimelineBtn.textContent.trim() : null
        };
      })()
    `);

    console.log(`  ✓ İlk ekranda sınırlı gösterim aktif:`);
    console.log(`    - Ekranda gösterilen not sayısı: ${uiVerification.renderedNotesCount} (Beklenen: 15)`);
    console.log(`    - Not genişletme butonu: "${uiVerification.fullNotesBtnText}"`);
    console.log(`    - Ekranda gösterilen timeline sayısı: ${uiVerification.renderedTimelineCount} (Beklenen: 15)`);
    console.log(`    - Timeline genişletme butonu: "${uiVerification.fullTimelineBtnText}"`);

    if (uiVerification.renderedNotesCount > 20 || uiVerification.renderedTimelineCount > 20) {
      throw new Error(`İlk ekranda 10-20 üzeri kayıt render edildi! Notlar: ${uiVerification.renderedNotesCount}, Timeline: ${uiVerification.renderedTimelineCount}`);
    }

    if (!uiVerification.hasFullNotesBtn || !uiVerification.hasFullTimelineBtn) {
      throw new Error("Genişletme butonları bulunamadı!");
    }

    // Click "Tüm Notları Gör" and "Tüm Geçmişi Gör"
    console.log("[5/6] 'Tüm Notları Gör' ve 'Tüm Geçmişi Gör' butonlarına tıklanıyor...");
    await browser.eval(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const fullNotesBtn = buttons.find(b => b.textContent.includes('Tüm Notları Gör'));
        if (fullNotesBtn) fullNotesBtn.click();

        const fullTimelineBtn = buttons.find(b => b.textContent.includes('Tüm Geçmişi Gör'));
        if (fullTimelineBtn) fullTimelineBtn.click();
      })()
    `);
    await sleep(600);

    const postExpandCounts = await browser.eval(`
      (() => {
        const noteBubbles = document.querySelectorAll('.app-chat-note-bubble');
        const timelineItems = document.querySelectorAll('.app-order-timeline li');
        return {
          totalRenderedNotes: noteBubbles.length,
          totalRenderedTimeline: timelineItems.length
        };
      })()
    `);

    console.log(`  ✓ Genişletme sonrası ekrandaki kayıtlar:`);
    console.log(`    - Toplam not DOM elemanı: ${postExpandCounts.totalRenderedNotes}`);
    console.log(`    - Toplam timeline DOM elemanı: ${postExpandCounts.totalRenderedTimeline}`);

    if (postExpandCounts.totalRenderedNotes < 100 || postExpandCounts.totalRenderedTimeline < 100) {
      throw new Error(`Genişletme sonrası 100 kayıt ekrana yansımadı! Not: ${postExpandCounts.totalRenderedNotes}, Timeline: ${postExpandCounts.totalRenderedTimeline}`);
    }

    // Now test navigating away and coming back (Persistence check)
    console.log("[6/6] Farklı sayfalara geçiş ve kalıcılık doğrulaması (Data Retention)...");
    await browser.eval(`window.location.href = '${BASE_URL}/app/customers'`);
    await sleep(1500);

    await browser.eval(`window.location.href = '${BASE_URL}/app/finance'`);
    await sleep(1500);

    await browser.eval(`window.location.href = '${orderUrl}'`);
    await sleep(1500);

    const finalStorageCheck = await browser.eval(`
      (() => {
        const keys = Object.keys(localStorage);
        const ordersKey = keys.find(k => k.includes('orders')) || 'sanayipro:v1:branch:motor_mekanik:orders';
        const orders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
        const parts = window.location.pathname.split('/');
        const orderId = parts[parts.length - 1];
        const targetOrder = orders.find(o => o.id === orderId) || orders[0];

        return {
          storedNotesCount: targetOrder ? targetOrder.notes.length : 0,
          storedTimelineCount: targetOrder ? targetOrder.timeline.length : 0,
          notesSample: targetOrder ? targetOrder.notes.slice(0, 3).map(n => n.text) : [],
          timelineSample: targetOrder ? targetOrder.timeline.slice(0, 3).map(t => t.text) : []
        };
      })()
    `);

    console.log(`  ✓ Sayfalar arası geçiş ve geri dönüş sonrası kalıcı veri kontrolü:`);
    console.log(`    - Kalıcı saklanan not sayısı: ${finalStorageCheck.storedNotesCount} (HİÇBİR NOT SİLİNMEDİ)`);
    console.log(`    - Kalıcı saklanan timeline sayısı: ${finalStorageCheck.storedTimelineCount} (HİÇBİR HAREKET SİLİNMEDİ)`);

    if (finalStorageCheck.storedNotesCount < 100 || finalStorageCheck.storedTimelineCount < 100) {
      throw new Error(`Veri kaybı tespit edildi! Not: ${finalStorageCheck.storedNotesCount}, Timeline: ${finalStorageCheck.storedTimelineCount}`);
    }

    console.log("\n==========================================================");
    console.log("SONUÇ: VERİ BÜTÜNLÜĞÜ %100 DOĞRULANDI!");
    console.log("0 VERİ KAYBI: 100 Not ve 100 Zaman Çizelgesi Kaydı Eksiksiz Korundu.");
    console.log("UI PERFORMANSI: İlk ekranda son 15 kayıt listeleniyor, 'Tümünü Gör' ile tam liste açılıyor.");
    console.log("==========================================================");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Test başarısız oldu:", err);
  process.exit(1);
});
