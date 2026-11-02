import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9345;
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
    const dataDir = path.join(os.tmpdir(), `fault-finder-test-${Date.now()}`);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    this.proc = spawn(
      CHROME_PATH,
      [
        "--headless=new",
        `--remote-debugging-port=${this.port}`,
        "--window-size=1280,900",
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
              if (data.error) reject(data.error);
              else resolve(data.result);
            }
          };
          await this.send("Runtime.enable");
          await this.send("Page.enable");
          return;
        }
      } catch {}
    }
    throw new Error("Could not connect to Chrome debugging port");
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
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result?.value;
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 600,
    });
    await new Promise((r) => setTimeout(r, 200));
  }

  async close() {
    try {
      if (this.ws) this.ws.close();
      if (this.proc) this.proc.kill();
    } catch {}
  }
}

async function runTests() {
  console.log("=== SANAYİPRO 2.0 — ARIZA BUL MODÜLÜ E2E TESTLERİ ===");
  const browser = new BrowserSession(PORT);

  try {
    await browser.launch(`${BASE_URL}/login`);
    await new Promise((r) => setTimeout(r, 1200));

    // Demo girişi yap
    await browser.eval(`
      (() => {
        const btn = document.querySelector('.login-branch-demo-action-btn') || document.querySelector('button[type="submit"]');
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 2000));

    // TEST 1: Sidebar Navigasyon Kontrolü
    console.log("\n[TEST 1] Sidebar Navigasyon ve Menü Kontrolü:");
    const navLinks = await browser.eval(`
      Array.from(document.querySelectorAll('a[href*="/app/"]')).map(a => ({
        href: a.getAttribute('href'),
        text: a.textContent.trim()
      }))
    `);
    const faultNav = navLinks.find((l) => l.href.includes("/app/fault-finder"));
    if (!faultNav) {
      throw new Error("Sidebar menüsünde '/app/fault-finder' bağlantısı bulunamadı!");
    }
    console.log(`  ✓ Navigasyon menüsünde Arıza Bul bulundu: "${faultNav.text}" -> ${faultNav.href}`);

    // TEST 2: Sayfa Yükleme & Başlık
    console.log("\n[TEST 2] /app/fault-finder Sayfası Yükleme:");
    await browser.eval(`window.location.href = '/app/fault-finder'`);
    await new Promise((r) => setTimeout(r, 1200));

    const pageTitle = await browser.eval(`document.querySelector('.fault-header-title')?.textContent`);
    console.log(`  ✓ Sayfa başlığı: "${pageTitle}"`);
    if (!pageTitle || !pageTitle.includes("Arıza Bul")) {
      throw new Error("Arıza Bul başlığı doğrulanamadı!");
    }

    // TEST 3: Standart DTC Arama - P0420 (Katalitik Konvertör)
    console.log("\n[TEST 3] Standart DTC Sorgusu (P0420 - Katalizör):");
    await browser.eval(`
      (() => {
        const inp = document.querySelector('.fault-search-input');
        const proto = Object.getPrototypeOf(inp);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(inp, 'p0420');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.fault-search-button').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    const p0420Title = await browser.eval(`document.querySelector('.fault-result-title')?.textContent`);
    const p0420Pill = await browser.eval(`document.querySelector('.fault-code-pill')?.textContent`);
    const p0420Type = await browser.eval(`document.querySelector('.fault-type-pill')?.textContent`);
    const p0420Disclaimer = await browser.eval(`document.querySelector('.fault-disclaimer-banner')?.textContent`);
    const p0420CausesCount = await browser.eval(`document.querySelectorAll('.fault-cause-card').length`);

    console.log(`  ✓ Kod: ${p0420Pill}`);
    console.log(`  ✓ Başlık: ${p0420Title}`);
    console.log(`  ✓ Tip: ${p0420Type}`);
    console.log(`  ✓ Neden Sayısı: ${p0420CausesCount}`);
    console.log(`  ✓ Yasal Uyarı / Disclaimer: "${p0420Disclaimer?.slice(0, 80)}..."`);

    if (p0420Pill !== "P0420" || !p0420Title?.includes("Katalitik")) {
      throw new Error("P0420 sonucu hatalı!");
    }

    // TEST 4: Güvenlik ve Emisyon İptal Önleme Kontrolü
    console.log("\n[TEST 4] Güvenlik & Emisyon İptal Uyarısı:");
    const aiPrecautions = await browser.eval(`document.querySelector('.fault-ai-precautions')?.textContent`);
    console.log(`  ✓ AI Emniyet ve İptal Uyarısı: "${aiPrecautions?.trim().slice(0, 100)}..."`);
    if (!aiPrecautions?.includes("Katalitik konvertör") && !p0420Disclaimer?.includes("iptali")) {
      throw new Error("Emisyon iptali yasal uyarısı bulunamadı!");
    }

    // TEST 5: Eksik Kod Formatı ("419" girdisi - Tahmin Etmeme İlkesi)
    console.log("\n[TEST 5] Eksik Kod Kontrolü ('419' -> Kesinlikle P0419 varsayılmamalı):");
    await browser.eval(`
      (() => {
        const inp = document.querySelector('.fault-search-input');
        const proto = Object.getPrototypeOf(inp);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(inp, '419');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.fault-search-button').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    const incompleteError = await browser.eval(`document.querySelector('.fault-error-body h3')?.textContent`);
    const errorText = await browser.eval(`document.querySelector('.fault-error-body p')?.textContent`);
    console.log(`  ✓ Hata Başlığı: "${incompleteError}"`);
    console.log(`  ✓ Hata Açıklaması: "${errorText}"`);

    if (!incompleteError?.includes("Eksik") && !incompleteError?.includes("Geçersiz")) {
      throw new Error("Eksik kod format uyarısı gösterilmedi; sistem tahmin yürütmemelidir!");
    }

    // TEST 6: Bilinmeyen Kod Kontrolü ("P9999")
    console.log("\n[TEST 6] Bilinmeyen Kod Kontrolü ('P9999'):");
    await browser.eval(`
      (() => {
        const inp = document.querySelector('.fault-search-input');
        const proto = Object.getPrototypeOf(inp);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(inp, 'P9999');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.fault-search-button').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    const unknownTitle = await browser.eval(`document.querySelector('.fault-unknown-body h3')?.textContent`);
    console.log(`  ✓ Bilinmeyen Kod Yanıtı: "${unknownTitle}"`);
    if (!unknownTitle?.includes("Doğrulanmış Açıklama Bulunamadı")) {
      throw new Error("Bilinmeyen kod için doğru mesaj verilmedi!");
    }

    // TEST 7: OEM Kod Kontrolü (P1101 - Opel GM PCV)
    console.log("\n[TEST 7] Üreticiye Özel (OEM) Kod Doğrulaması (P1101):");
    await browser.eval(`
      (() => {
        const inp = document.querySelector('.fault-search-input');
        const proto = Object.getPrototypeOf(inp);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(inp, 'P1101');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.fault-search-button').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    const p1101Type = await browser.eval(`document.querySelector('.fault-type-pill')?.textContent`);
    const p1101Title = await browser.eval(`document.querySelector('.fault-result-title')?.textContent`);
    const p1101Source = await browser.eval(`document.querySelector('.fault-meta-bar')?.textContent`);
    console.log(`  ✓ Tip: ${p1101Type}`);
    console.log(`  ✓ Başlık: ${p1101Title}`);
    console.log(`  ✓ Meta / Kaynak: "${p1101Source?.replace(/\\s+/g, ' ').trim()}"`);
    if (!p1101Type?.includes("OEM") || !p1101Title?.includes("Hava Akış")) {
      throw new Error("P1101 OEM doğrulaması başarısız!");
    }

    // TEST 8: Şasi / ABS Kodu (C0035) ve Gövde / Airbag Kodu (B1000)
    console.log("\n[TEST 8] P, C, B, U Aileleri Doğrulaması (C0035 & B1000):");
    await browser.eval(`
      (() => {
        const inp = document.querySelector('.fault-search-input');
        const proto = Object.getPrototypeOf(inp);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(inp, 'C0035');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.fault-search-button').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    const c0035Title = await browser.eval(`document.querySelector('.fault-result-title')?.textContent`);
    console.log(`  ✓ C0035 (Şasi/ABS): "${c0035Title}"`);

    await browser.eval(`
      (() => {
        const inp = document.querySelector('.fault-search-input');
        const proto = Object.getPrototypeOf(inp);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(inp, 'B1000');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.fault-search-button').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));
    const b1000Title = await browser.eval(`document.querySelector('.fault-result-title')?.textContent`);
    console.log(`  ✓ B1000 (Gövde/ECU): "${b1000Title}"`);

    // TEST 9: İş Emrine Ekleme Entegrasyonu
    console.log("\n[TEST 9] İş Emrine Teşhisi Ekleme:");
    // Geri P0420 arayalım
    await browser.eval(`
      (() => {
        const inp = document.querySelector('.fault-search-input');
        const proto = Object.getPrototypeOf(inp);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(inp, 'P0420');
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.fault-search-button').click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 400));

    // İş emri seçip not yazıp ekle
    await browser.eval(`
      (() => {
        const sel = document.querySelector('.fault-attach-select-col select');
        if (sel.options.length <= 1) return { error: 'İş emri bulunamadı' };
        sel.selectedIndex = 1;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        
        const noteArea = document.querySelector('.fault-textarea');
        noteArea.value = 'Test Usta Notu: O2 sensör voltaj salınımı osiloskopla kontrol edildi.';
        noteArea.dispatchEvent(new Event('input', { bubbles: true }));

        const btn = document.querySelector('.fault-attach-submit-btn');
        btn.click();
        return { success: true, selectedOrder: sel.value };
      })()
    `);
    await new Promise((r) => setTimeout(r, 500));

    const attachSuccessBanner = await browser.eval(`document.querySelector('.fault-attach-success-banner')?.textContent`);
    console.log(`  ✓ İş Emri Ekleme Sonucu: "${attachSuccessBanner?.trim()}"`);
    if (!attachSuccessBanner?.includes("başarıyla")) {
      throw new Error("İş emrine arıza kodu eklenemedi!");
    }

    // Geçmiş listesini kontrol et
    const historyItems = await browser.eval(`
      Array.from(document.querySelectorAll('.fault-history-item')).map(i => ({
        code: i.querySelector('.fault-history-code')?.textContent,
        date: i.querySelector('.fault-history-date')?.textContent
      }))
    `);
    console.log(`  ✓ Arıza Arama Geçmişi Kaydı (${historyItems.length} adet):`, historyItems.slice(0, 3));
    if (historyItems.length === 0) {
      throw new Error("Arıza geçmişi kaydedilmedi!");
    }

    // TEST 10: Mobil Görünüm ve Taşma Kontrolü (320px, 375px, 390px, 430px)
    console.log("\n[TEST 10] Mobil Görünüm ve Taşma Testi (320px - 430px):");
    const viewports = [320, 375, 390, 430];
    for (const w of viewports) {
      await browser.setViewport(w, 800);
      const overflow = await browser.eval(`
        (() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const bodyW = document.body.scrollWidth;
          return {
            docW,
            winW,
            bodyW,
            overflow: docW > winW || bodyW > winW
          };
        })()
      `);
      console.log(`  ✓ ${w}px Viewport: docW=${overflow.docW}, winW=${overflow.winW}, Taşma: ${overflow.overflow ? "VAR (HATA)" : "YOK (0px)"}`);
      if (overflow.overflow) {
        throw new Error(`${w}px genişlikte yatay taşma tespit edildi!`);
      }
    }

    console.log("\n=======================================================");
    console.log(" TÜM ARIZA BUL MODÜLÜ TESTLERİ BAŞARIYLA GEÇTİ! ✓");
    console.log("=======================================================\n");

  } finally {
    await browser.close();
  }
}

runTests().catch((err) => {
  console.error("\n❌ TEST BAŞARISIZ:", err);
  process.exit(1);
});
