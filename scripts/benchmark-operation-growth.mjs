import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9334;
const BASE_URL = process.env.BENCHMARK_URL || "http://127.0.0.1:3001";

class BrowserSession {
  constructor(port) {
    this.port = port;
    this.ws = null;
    this.proc = null;
    this.nextId = 1;
    this.pending = new Map();
  }

  async launch(url) {
    const dataDir = path.join(os.tmpdir(), `bench-perf-${this.port}-${Date.now()}`);
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
      if (
        err.message?.includes("Execution context was destroyed") ||
        err.message?.includes("Cannot find context")
      ) {
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

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function measureClickTransition(session, selector, targetPath) {
  const result = await session.eval(`
    (async () => {
      const link = document.querySelector('${selector}');
      if (!link) return { error: 'Link not found: ${selector}', current: window.location.pathname };

      const start = performance.now();
      link.click();

      // Poll until location.pathname matches targetPath
      let timedOut = false;
      const startTime = Date.now();

      while (window.location.pathname !== '${targetPath}' && (Date.now() - startTime < 6000)) {
        await new Promise(r => requestAnimationFrame(r));
      }

      if (window.location.pathname !== '${targetPath}') {
        return { error: 'Navigation timeout to ${targetPath}', current: window.location.pathname };
      }

      // Wait two animation frames for full render and paint
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const duration = performance.now() - start;

      const mem = window.performance.memory ? {
        usedJSHeapSize: window.performance.memory.usedJSHeapSize,
        totalJSHeapSize: window.performance.memory.totalJSHeapSize,
      } : null;

      const domNodes = document.getElementsByTagName('*').length;
      const storageBytes = JSON.stringify(window.localStorage).length;

      return {
        durationMs: Math.round(duration * 10) / 10,
        memory: mem,
        domNodes,
        storageBytes,
      };
    })()
  `);
  return result;
}

async function runRoundTrip(session) {
  // Navigation sequence: Dashboard (/app) -> Work Orders (/app/work-orders) -> Customers (/app/customers) -> Intake (/app/intake) -> Dashboard (/app)
  const transitions = [];

  // Step 1: to /app/work-orders
  const t1 = await measureClickTransition(session, 'a[href="/app/work-orders"]', '/app/work-orders');
  transitions.push({ to: '/app/work-orders', ...t1 });
  await sleep(100);

  // Step 2: to /app/customers
  const t2 = await measureClickTransition(session, 'a[href="/app/customers"]', '/app/customers');
  transitions.push({ to: '/app/customers', ...t2 });
  await sleep(100);

  // Step 3: to /app/intake
  const t3 = await measureClickTransition(session, 'a[href="/app/intake"]', '/app/intake');
  transitions.push({ to: '/app/intake', ...t3 });
  await sleep(100);

  // Step 4: back to /app
  const t4 = await measureClickTransition(session, 'a[href="/app"]', '/app');
  transitions.push({ to: '/app', ...t4 });
  await sleep(100);

  const totalMs = transitions.reduce((acc, t) => acc + (t.durationMs || 0), 0);
  const avgMs = Math.round((totalMs / transitions.length) * 10) / 10;
  const lastMemory = transitions[transitions.length - 1]?.memory?.usedJSHeapSize;
  const domNodes = transitions[transitions.length - 1]?.domNodes;
  const storageBytes = transitions[transitions.length - 1]?.storageBytes;

  return {
    transitions,
    totalMs: Math.round(totalMs * 10) / 10,
    avgMs,
    usedHeapMB: lastMemory ? Math.round((lastMemory / 1024 / 1024) * 100) / 100 : null,
    domNodes,
    storageBytes,
  };
}

async function executeBatchOperations(session, batchIndex, count) {
  return await session.eval(`
    (async () => {
      // Find branch prefix in localStorage
      const branchKey = Object.keys(window.localStorage).find(k => k.includes(':orders'));
      const branchPrefix = branchKey ? branchKey.slice(0, branchKey.indexOf(':orders')) : 'sanayipro:v1:branch:motor-mekanik';

      const opTypes = ['CREATE_CUSTOMER_VEHICLE', 'EDIT_CUSTOMER', 'CREATE_WORK_ORDER', 'CHANGE_STATUS', 'ADD_NOTE', 'STOCK_MOVEMENT'];
      const logs = [];

      for (let i = 0; i < ${count}; i++) {
        const opNum = (${batchIndex} * 100) + i + 1;
        const opType = opTypes[i % opTypes.length];

        if (opType === 'CREATE_CUSTOMER_VEHICLE') {
          const custKey = branchPrefix + ':customers';
          const vehKey = branchPrefix + ':vehicles';
          const custs = JSON.parse(window.localStorage.getItem(custKey) || '[]');
          const vehs = JSON.parse(window.localStorage.getItem(vehKey) || '[]');

          const newCustId = 'c-bench-' + opNum;
          const newVehId = 'v-bench-' + opNum;
          const plate = '31 BN ' + String(100 + (opNum % 899));

          custs.push({
            id: newCustId,
            name: 'Müşteri ' + opNum + ' Kaya',
            phone: '0532 5' + String(100000 + opNum).slice(-6),
            email: 'musteri' + opNum + '@test.com'
          });

          vehs.push({
            id: newVehId,
            plate: plate,
            brand: 'Renault',
            model: 'Megane 1.5 dCi',
            year: 2021,
            mileage: 65000 + opNum * 120,
            active: true,
            customerId: newCustId
          });

          window.localStorage.setItem(custKey, JSON.stringify(custs));
          window.localStorage.setItem(vehKey, JSON.stringify(vehs));
          window.dispatchEvent(new StorageEvent('storage', { key: custKey }));
          window.dispatchEvent(new StorageEvent('storage', { key: vehKey }));
          logs.push('Müşteri+Araç: ' + plate);
        } else if (opType === 'EDIT_CUSTOMER') {
          const custKey = branchPrefix + ':customers';
          const custs = JSON.parse(window.localStorage.getItem(custKey) || '[]');
          if (custs.length > 0) {
            const idx = opNum % custs.length;
            custs[idx].name = custs[idx].name.replace(' (Rev)', '') + ' (Rev)';
            window.localStorage.setItem(custKey, JSON.stringify(custs));
            window.dispatchEvent(new StorageEvent('storage', { key: custKey }));
            logs.push('Düzenleme: ' + custs[idx].id);
          }
        } else if (opType === 'CREATE_WORK_ORDER') {
          const ordKey = branchPrefix + ':orders';
          const vehKey = branchPrefix + ':vehicles';
          const orders = JSON.parse(window.localStorage.getItem(ordKey) || '[]');
          const vehs = JSON.parse(window.localStorage.getItem(vehKey) || '[]');
          const veh = vehs[vehs.length - 1] || vehs[0];

          const seq = 300 + opNum;
          const woId = 'WO-2026-' + String(seq).padStart(5, '0');
          orders.unshift({
            id: woId,
            vehicleId: veh?.id || 'v1',
            customerId: veh?.customerId || 'c1',
            branchId: 'dortyol',
            technicianId: 'mehmet',
            assigneeIds: ['mehmet'],
            status: 'RECEIVED',
            createdAt: new Date().toISOString(),
            dueAt: '2026-11-02T17:00',
            updatedLabel: 'Az önce',
            stageDuration: 'Az önce',
            complaint: 'Ağır bakım ve triger seti değişimi - ' + opNum,
            diagnosis: 'Tespit yapıldı.',
            intakeMileage: 92000 + opNum,
            fuel: 60,
            labor: [{ id: 'l1', name: 'Triger Değişimi', price: 2500 }],
            parts: [{ id: 'p1', name: 'Triger Kayış Seti', state: 'RESERVED', price: 3200 }],
            total: 5700,
            paid: 0,
            quoteRevision: 0,
            approval: 'PENDING',
            approvalChannel: '',
            quoteStatus: 'DRAFT',
            quoteItems: [],
            partRequests: [],
            notes: [],
            additionalCosts: 0,
            intake: { damage: 'Sol çamurluk çizik', keyCount: 1, leftItems: '', checklist: {}, photos: [] },
            timeline: [
              { id: 't1', time: '10:00', text: 'Araç kabul edildi' },
              { id: 't2', time: '10:05', text: 'Mehmet Usta atandı' }
            ]
          });

          window.localStorage.setItem(ordKey, JSON.stringify(orders));
          window.dispatchEvent(new StorageEvent('storage', { key: ordKey }));
          logs.push('İş Emri: ' + woId);
        } else if (opType === 'CHANGE_STATUS') {
          const ordKey = branchPrefix + ':orders';
          const orders = JSON.parse(window.localStorage.getItem(ordKey) || '[]');
          if (orders.length > 0) {
            const idx = opNum % orders.length;
            const flow = ['DIAGNOSIS', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CONTROL', 'READY'];
            const nextStatus = flow[opNum % flow.length];
            orders[idx].status = nextStatus;
            orders[idx].updatedLabel = 'Az önce';
            orders[idx].timeline.push({
              id: 'tl-' + Date.now() + '-' + opNum,
              time: '14:30',
              text: 'Durum güncellendi: ' + nextStatus
            });
            window.localStorage.setItem(ordKey, JSON.stringify(orders));
            window.dispatchEvent(new StorageEvent('storage', { key: ordKey }));
            logs.push('Durum: ' + orders[idx].id + ' -> ' + nextStatus);
          }
        } else if (opType === 'ADD_NOTE') {
          const ordKey = branchPrefix + ':orders';
          const orders = JSON.parse(window.localStorage.getItem(ordKey) || '[]');
          if (orders.length > 0) {
            const idx = opNum % orders.length;
            orders[idx].notes.push({
              id: 'n-' + opNum,
              text: 'Operasyon Notu ' + opNum + ': Müşteriyle telefonla görüşüldü, ek işlem onaylandı.',
              author: 'Mehmet Usta',
              createdAt: '29 Ekim 2026 15:00',
              internal: true
            });
            orders[idx].timeline.push({
              id: 'tl-n-' + opNum,
              time: '15:00',
              text: 'İç not eklendi'
            });
            window.localStorage.setItem(ordKey, JSON.stringify(orders));
            window.dispatchEvent(new StorageEvent('storage', { key: ordKey }));
            logs.push('Not: ' + orders[idx].id);
          }
        } else if (opType === 'STOCK_MOVEMENT') {
          const opKey = branchPrefix.replace(':orders', '') + ':operations';
          const opData = JSON.parse(window.localStorage.getItem(opKey) || '{}');
          if (opData.movements) {
            opData.movements.push({
              id: 'm-' + opNum,
              partId: 'part-1',
              amount: -1,
              at: new Date().toISOString(),
              note: 'İşlem ' + opNum + ' parça çıkışı'
            });
            window.localStorage.setItem(opKey, JSON.stringify(opData));
            window.dispatchEvent(new StorageEvent('storage', { key: opKey }));
            logs.push('Stok Çıkışı: ' + opNum);
          }
        }
      }

      return { logsCount: logs.length, sampleLogs: logs.slice(0, 3) };
    })()
  `);
}

async function runBenchmark() {
  console.log("==================================================================");
  console.log(`SANAYİPRO 2.0 — İŞLEM YÜKÜ PERFORMANS BENCHMARK TESTİ (${BASE_URL})`);
  console.log("==================================================================");

  const session = new BrowserSession(PORT);
  try {
    console.log("Tarayıcı başlatılıyor...");
    await session.launch(`${BASE_URL}/login`);
    await sleep(1500);

    console.log("Demo oturumu açılıyor (Motor Ustası Demosu)...");
    await session.eval(`document.querySelector('.login-branch-demo-action-btn')?.click()`);
    await sleep(2000);

    // Dismiss tour modal if present
    await session.eval(`document.querySelector('.tour-btn-outline')?.click()`);
    await sleep(600);

    const currentUrl = await session.eval("window.location.pathname");
    console.log(`Mevcut sayfa: ${currentUrl}`);

    const milestones = [
      { ops: 0, add: 0 },
      { ops: 5, add: 5 },
      { ops: 10, add: 5 },
      { ops: 20, add: 10 },
      { ops: 30, add: 10 },
      { ops: 50, add: 20 },
    ];

    const results = [];

    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];

      if (m.add > 0) {
        console.log(`\n>>> ${m.add} adet gerçekçi işlem yükleniyor... (Toplam hedef: ${m.ops} işlem)`);
        const opRes = await executeBatchOperations(session, i, m.add);
        console.log(`İşlemler uygulandı. Örnek: ${JSON.stringify(opRes?.sampleLogs)}`);
        await sleep(500); // Allow react state settling and localStorage flush
      }

      console.log(`\n--- ÖLÇÜM: ${m.ops} İŞLEM SONRASI SAYFA GEÇİŞ TESTİ ---`);
      const round = await runRoundTrip(session);

      console.log(`Ortalama Geçiş Süresi: ${round.avgMs} ms (Toplam 4 sayfa: ${round.totalMs} ms)`);
      console.log(`JS Heap: ${round.usedHeapMB} MB | DOM Eleman Sayısı: ${round.domNodes} | Storage: ${round.storageBytes} bytes`);

      for (const t of round.transitions) {
        console.log(`  -> ${t.to}: ${t.durationMs} ms`);
      }

      results.push({
        ops: m.ops,
        ...round,
      });
    }

    console.log("\n==================================================================");
    console.log("ÖZET BENCHMARK TABLOSU:");
    console.log("==================================================================");
    console.log("İşlem Sayısı | Ort. Geçiş (ms) | Toplam 4 Geçiş (ms) | JS Heap (MB) | Storage (KB)");
    console.log("------------------------------------------------------------------");
    for (const r of results) {
      const storageKb = Math.round((r.storageBytes / 1024) * 10) / 10;
      console.log(
        `${String(r.ops).padEnd(12)} | ${String(r.avgMs).padEnd(15)} | ${String(r.totalMs).padEnd(19)} | ${String(r.usedHeapMB).padEnd(12)} | ${storageKb} KB`
      );
    }
    console.log("==================================================================");

    fs.writeFileSync(
      path.join(process.cwd(), "benchmark-results-after.json"),
      JSON.stringify(results, null, 2)
    );
    console.log("Sonuçlar 'benchmark-results-after.json' dosyasına kaydedildi.");

  } catch (err) {
    console.error("Benchmark sırasında hata:", err);
  } finally {
    await session.close();
  }
}

runBenchmark();
