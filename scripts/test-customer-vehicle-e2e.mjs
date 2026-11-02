import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

class BrowserSession {
  constructor(port) {
    this.port = port;
    this.ws = null;
    this.proc = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async launch(url) {
    const dataDir = path.join(os.tmpdir(), `bench-cust-test-${this.port}-${Date.now()}`);
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

    for (let i = 0; i < 30; i++) {
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
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  async eval(expression) {
    try {
      const res = await this.send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.value;
    } catch (err) {
      if (err.message?.includes("Execution context was destroyed") || err.message?.includes("Cannot find context")) {
        return null;
      }
      throw err;
    }
  }

  async close() {
    try { if (this.ws) this.ws.close(); } catch {}
    try { if (this.proc) this.proc.kill(); } catch {}
  }
}

async function runTests() {
  console.log("==========================================================");
  console.log("SANAYİPRO — MÜŞTERİ VE ARAÇ KAYIT DOĞRULAMA TESTİ");
  console.log("==========================================================");

  const browser = new BrowserSession(9246);
  await browser.launch("http://127.0.0.1:3000/login");

  let testPassed = 0;
  let testFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      testPassed++;
    } else {
      console.error(`  ❌ HATA: ${message}`);
      testFailed++;
    }
  }

  try {
    // 1. Giriş Yap (Motor Ustası Demosu)
    console.log("\n[1/7] Giriş yapılıyor...");
    await new Promise((r) => setTimeout(r, 1000));
    await browser.eval(`document.querySelector('.login-branch-demo-action-btn')?.click()`);
    await new Promise((r) => setTimeout(r, 1500));
    await browser.eval(`document.querySelector('.tour-btn-outline')?.click()`);
    await new Promise((r) => setTimeout(r, 500));

    // 2. Doğrulama: Hatalı Veri Girişleri ve Alan Altı Hata Mesajları
    console.log("\n[2/7] Alan Doğrulamaları ve Hata Mesajlarının Doğru Konumda Gösterilmesi...");
    await browser.eval(`window.location.href = "http://127.0.0.1:3000/app/customers/new"`);
    await new Promise((r) => setTimeout(r, 1200));

    // Define setVal helper in browser window
    await browser.eval(`
      window.__setVal = (selector, val) => {
        const el = document.querySelector(selector);
        if (!el) return;
        const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      };
    `);

    // Boş gönderim testi
    await browser.eval(`
      (() => {
        const btn = document.querySelector('button[data-tour="customer-form-save"]');
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    const emptyErrors = await browser.eval(`
      (() => {
        const nameErr = document.querySelector('input[name="name"] ~ .records-field-error')?.textContent;
        const phoneErr = document.querySelector('input[name="phone"] ~ .records-field-error')?.textContent;
        const plateErr = document.querySelector('input[name="plate"] ~ .records-field-error')?.textContent;
        const generalErr = document.querySelector('.records-error')?.textContent;
        return { nameErr, phoneErr, plateErr, generalErr };
      })()
    `);
    assert(Boolean(emptyErrors.nameErr), `Boş isim hatası ismin altında gösterildi: "${emptyErrors.nameErr}"`);
    assert(Boolean(emptyErrors.phoneErr), `Boş telefon hatası telefonun altında gösterildi: "${emptyErrors.phoneErr}"`);
    assert(Boolean(emptyErrors.plateErr), `Boş plaka hatası plakanın altında gösterildi: "${emptyErrors.plateErr}"`);
    assert(!emptyErrors.generalErr, `Form altında alakasız genel hata yığılması YOK: temiz.`);

    // Eksik telefon, hatalı e-posta, geçersiz il kodu plaka
    await browser.eval(`
      (() => {
        window.__setVal('input[name="name"]', "Test Müşteri");
        window.__setVal('input[name="phone"]', "0532111"); // eksik
        window.__setVal('input[name="email"]', "gecersiz-eposta");
        window.__setVal('input[name="plate"]', "99 XYZ 123"); // geçersiz il kodu 99
        document.querySelector('button[data-tour="customer-form-save"]')?.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    const invalidErrors = await browser.eval(`
      (() => {
        const nameErr = document.querySelector('input[name="name"] ~ .records-field-error')?.textContent;
        const phoneErr = document.querySelector('input[name="phone"] ~ .records-field-error')?.textContent;
        const emailErr = document.querySelector('input[name="email"] ~ .records-field-error')?.textContent;
        const plateErr = document.querySelector('input[name="plate"] ~ .records-field-error')?.textContent;
        return { nameErr, phoneErr, emailErr, plateErr };
      })()
    `);
    assert(!invalidErrors.nameErr, "Geçerli isim girilince isim hatası temizlendi.");
    assert(invalidErrors.phoneErr?.includes("telefon"), `Eksik telefon hatası telefon alanının altında: "${invalidErrors.phoneErr}"`);
    assert(invalidErrors.emailErr?.includes("e-posta"), `Hatalı e-posta hatası e-posta alanının altında: "${invalidErrors.emailErr}"`);
    assert(Boolean(invalidErrors.plateErr?.includes("01 ile 81") || invalidErrors.plateErr?.includes("plaka") || invalidErrors.plateErr?.includes("İl kodu")), `Geçersiz il kodu hatası plaka alanının altında: "${invalidErrors.plateErr}"`);

    // 3. Küçük harf ve bitişik plaka otomatik biçimlendirme
    console.log("\n[3/7] Küçük Harf ve Bitişik Plaka (31abc123) Otomatik Biçimlendirme...");
    const plateAutoFormat = await browser.eval(`
      (() => {
        window.__setVal('input[name="plate"]', "31abc123");
        return document.querySelector('input[name="plate"]').value;
      })()
    `);
    assert(plateAutoFormat === "31 ABC 123", `31abc123 otomatik olarak "31 ABC 123" yapıldı: "${plateAutoFormat}"`);

    // 4. GEÇERLİ ÖRNEK KAYIT (Kullanıcının Verdiği Veriler)
    console.log("\n[4/7] Kullanıcının Belirttiği Geçerli Verilerle Kayıt Oluşturma...");
    /*
      Ad Soyad: Test Ahmet Yılmaz
      Telefon: 05325550142
      E-posta: test@example.com
      Plaka: 31 ABC 123
      Marka: BMW
      Model: 320i
      Yıl: 2015
      Kilometre: 111000
      Yakıt: Dizel
    */
    await browser.eval(`
      (() => {
        window.__setVal('input[name="name"]', "Test Ahmet Yılmaz");
        window.__setVal('input[name="phone"]', "05325550142");
        window.__setVal('input[name="email"]', "test@example.com");
        window.__setVal('input[name="plate"]', "31 ABC 123");
        window.__setVal('input[name="brand"]', "BMW");
        window.__setVal('input[name="model"]', "320i");
        window.__setVal('input[name="year"]', "2015");
        window.__setVal('input[name="mileage"]', "111000");
        window.__setVal('select[name="fuelType"]', "Dizel");

        // Submit
        const saveBtn = document.querySelector('button[data-tour="customer-form-save"]');
        saveBtn.click();
      })()
    `);

    // Detay sayfasına yönlenme bekle
    let redirectedToDetail = false;
    let detailUrl = "";
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      detailUrl = await browser.eval(`window.location.pathname + window.location.search`);
      if (detailUrl && detailUrl.includes("/app/customers/") && detailUrl.includes("vehicle=")) {
        redirectedToDetail = true;
        break;
      }
    }
    assert(redirectedToDetail, `Kayıt sonrası araç seçili müşteri detayına yönlendi: ${detailUrl}`);

    // Detay ekranında verileri doğrula
    await new Promise((r) => setTimeout(r, 600));
    const detailContent = await browser.eval(`
      (() => {
        const text = document.body.innerText;
        return {
          hasName: text.includes("Test Ahmet Yılmaz"),
          hasPlate: text.includes("31 ABC 123"),
          hasModel: text.includes("BMW 320i") || text.includes("320i"),
          hasKm: text.includes("111.000") || text.includes("111000")
        };
      })()
    `);
    assert(detailContent.hasName, "Müşteri adı detay ekranında görünüyor (Test Ahmet Yılmaz).");
    assert(detailContent.hasPlate, "Plaka detay ekranında görünüyor (31 ABC 123).");
    assert(detailContent.hasModel, "Model bilgisi detay ekranında görünüyor (BMW 320i).");

    // 5. AYNI PLAKANIN YENİDEN KAYDEDİLMESİ (Duplicate Test)
    console.log("\n[5/7] Aynı Plakanın Yeniden Kaydedilmesi (Duplicate Test)...");
    await browser.eval(`window.location.href = "http://127.0.0.1:3000/app/customers/new"`);
    await new Promise((r) => setTimeout(r, 1200));

    await browser.eval(`
      (() => {
        window.__setVal = (selector, val) => {
          const el = document.querySelector(selector);
          if (!el) return;
          const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        };

        window.__setVal('input[name="name"]', "Farklı Kişi");
        window.__setVal('input[name="phone"]', "05339998877");
        window.__setVal('input[name="plate"]', "31 ABC 123"); // daha önce kaydedildi!

        document.querySelector('button[data-tour="customer-form-save"]')?.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));

    const dupPlateErr = await browser.eval(`
      document.querySelector('input[name="plate"] ~ .records-field-error')?.textContent
    `);
    assert(dupPlateErr?.includes("Bu plaka zaten kayıtlı"), `Aynı plaka girildiğinde plakanın altında hata gösterildi: "${dupPlateErr}"`);

    // 6. ARAÇ KABUL İÇİNDEN YENİ MÜŞTERİ + ARAÇ OLUŞTURMA
    console.log("\n[6/7] Araç Kabul Formunda Yeni Kayıt ve İlgisiz Hata Kontrolü...");
    await browser.eval(`window.location.href = "http://127.0.0.1:3000/app/intake"`);
    await new Promise((r) => setTimeout(r, 1200));

    // Önce bilerek 'İleri' butonuna bas (araç seçilmediği için hata tetikler)
    await browser.eval(`
      (() => {
        const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('İleri') || b.textContent.includes('Sonraki'));
        if (nextBtn) nextBtn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 200));

    // Şimdi "Yeni Müşteri + Araç Oluştur" butonuna bas
    await browser.eval(`
      (() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Yeni Müşteri + Araç Oluştur'));
        if (btn) btn.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 300));

    // Form açıldığında "Önce bir araç ve ilişkili müşteriyi seçin" hatasının kaybolduğunu doğrula!
    const ghostError = await browser.eval(`
      (() => {
        const intakeErr = document.querySelector('.intake-error');
        const bodyText = document.body.innerText;
        return {
          intakeErrVisible: Boolean(intakeErr),
          hasGhostText: bodyText.includes("Önce bir araç ve ilişkili müşteriyi seçin.")
        };
      })()
    `);
    assert(!ghostError.intakeErrVisible && !ghostError.hasGhostText, 'Yeni kayıt açıldığında ilgisiz "Önce bir araç ve ilişkili müşteriyi seçin." hatası YOK (tamamen temiz).');

    // Araç kabulde yeni aracı kaydet
    await browser.eval(`
      (() => {
        window.__setVal = (selector, val) => {
          const el = document.querySelector(selector);
          if (!el) return;
          const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        };

        window.__setVal('input[name="name"]', "Kabul Müşterisi Ali");
        window.__setVal('input[name="phone"]', "05342223344");
        window.__setVal('input[name="plate"]', "34 KBL 55");
        window.__setVal('input[name="model"]', "Renault Megane");

        document.querySelector('button[data-tour="customer-form-save"]')?.click();
      })()
    `);
    await new Promise((r) => setTimeout(r, 600));

    const intakeAutoSelected = await browser.eval(`
      (() => {
        const selectedPlate = document.body.innerText.includes("34 KBL 55");
        return selectedPlate;
      })()
    `);
    assert(intakeAutoSelected, 'Araç kabul içinde oluşturulan yeni araç anında seçildi ve kabul akışına bağlandı.');

    // 7. KALICILIK VE ARAMA TESTİ (Sayfa Yenilenince Korunma)
    console.log("\n[7/7] Veri Kalıcılığı ve Müşteri Araması Testi...");
    await browser.eval(`window.location.href = "http://127.0.0.1:3000/app/customers"`);
    await new Promise((r) => setTimeout(r, 1200));

    // Sayfayı yenile (reload)
    await browser.send("Page.reload");
    await new Promise((r) => setTimeout(r, 1200));

    // Müşteriyi ara
    const searchResult = await browser.eval(`
      (() => {
        const input = document.querySelector('.records-search input');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, "Test Ahmet");
        input.dispatchEvent(new Event('input', { bubbles: true }));

        const rows = Array.from(document.querySelectorAll('tr.ux-unified-customer-row'));
        const found = rows.some(r => r.innerText.includes("Test Ahmet Yılmaz") && r.innerText.includes("31 ABC 123"));
        return { found, count: rows.length };
      })()
    `);
    assert(searchResult.found, `Sayfa yenilendikten sonra kayıt korundu ve aramayla bulundu (Test Ahmet Yılmaz - 31 ABC 123).`);

  } catch (err) {
    console.error(`❌ Beklenmeyen test hatası: ${err.message}`);
    testFailed++;
  } finally {
    await browser.close();
  }

  console.log("\n==========================================================");
  console.log(`TEST SONUCU: ${testPassed} BAŞARILI, ${testFailed} BAŞARISIZ`);
  console.log("==========================================================");

  if (testFailed > 0) process.exit(1);
}

runTests();
