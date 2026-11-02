// Queries the npm bulk advisory endpoint using versions pinned in pnpm-lock.yaml.
import fs from "fs";

const lock = fs.readFileSync("pnpm-lock.yaml", "utf8");
const pkgs = {};
const re = /^ {2}'?((?:@[^/@\s']+\/)?[^@\s']+)@(\d[^\s(':]*)(?:\([^)]*\))*'?:\s*$/gm;
let m;
const section = lock.split(/^snapshots:/m)[1] ?? lock;
while ((m = re.exec(section))) {
  (pkgs[m[1]] ??= new Set()).add(m[2]);
}
const body = Object.fromEntries(Object.entries(pkgs).map(([k, v]) => [k, [...v]]));
console.log("packages:", Object.keys(body).length);
const res = await fetch("https://registry.npmjs.org/-/npm/v1/security/advisories/bulk", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
if (!res.ok) {
  console.log("audit endpoint failed:", res.status);
  process.exit(2);
}
const data = await res.json();
const counts = {};
for (const [name, list] of Object.entries(data)) {
  for (const a of list) {
    counts[a.severity] = (counts[a.severity] || 0) + 1;
    console.log(`${a.severity.toUpperCase()} ${name} ${a.vulnerable_versions} - ${a.title}`);
  }
}
console.log("summary:", counts);
