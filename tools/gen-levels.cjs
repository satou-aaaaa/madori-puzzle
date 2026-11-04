// 間取りの問題を作って data.js に書く。使い方: node tools/gen-levels.cjs
// 1. 答えの置き方を種から決める 2. その置き方で正しい条件を全部挙げる 3. 答えが1つになるまで条件を足す 4. 外しても答えが1つのままの条件を外す（要らない条件を残さない）
const path = require("path"), fs = require("fs");
const M = require(path.join(__dirname, "..", "rules.js"));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PER = 365;
function make(R, S) {
  const N = S.w * S.h, cells = [...Array(N).keys()], at = {};
  if (S.fixed) for (const r in S.fixed) at[r] = S.fixed[r];
  const free = cells.filter((c) => !Object.values(at).includes(c));
  for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
  S.rooms.filter((r) => at[r] == null).forEach((r, k) => (at[r] = free[k]));
  // 正しい条件を全部挙げる（決まっている部屋だけの条件は除く）
  const all = [], rs = S.rooms;
  for (const a of rs) {
    if (S.fixed && S.fixed[a] != null) continue;
    if (S.types.includes("side")) for (const d of ["s", "n", "e", "w"]) all.push({ t: "side", a, d });
    if (S.types.includes("corner")) all.push({ t: "corner", a });
    for (const b of rs) { if (a === b) continue;
      if (S.types.includes("adj") && a < b) all.push({ t: "adj", a, b });
      if (S.types.includes("nadj") && a < b) all.push({ t: "nadj", a, b });
      if (S.types.includes("dir")) for (const d of ["n", "s", "e", "w"]) all.push({ t: "dir", a, b, d }); }
  }
  let ok = all.filter((q) => M.holds(q, at, S) === true);
  for (let i = ok.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [ok[i], ok[j]] = [ok[j], ok[i]]; }
  // 新しく習う種類を少なくとも1つ入れる（章ごとに増える）
  const newest = S.types[S.types.length - 1], first = ok.find((q) => q.t === newest);
  if (!first) return null;
  const qs = [first];
  for (const q of ok) { if (M.count(S, qs) === 1) break; if (q !== first) qs.push(q); }
  if (M.count(S, qs) !== 1) return null;
  for (let i = qs.length - 1; i >= 0; i--) { const t = qs.slice(0, i).concat(qs.slice(i + 1)); if (M.count(S, t) === 1) qs.splice(i, 1); }
  if (!qs.some((q) => q.t === newest)) return null;
  const sol = S.rooms.map((r) => at[r]);
  // 短く書く：条件は「種類の字＋部屋の番号＋相手の番号＋向き」、答えは部屋の順のますの番号
  const T = { side: "S", corner: "C", adj: "A", nadj: "N", dir: "D" }, ri = (r) => S.rooms.indexOf(r);
  return qs.map((q) => T[q.t] + ri(q.a) + (q.b ? ri(q.b) : "") + (q.d || "")).join(",") + "|" + sol.join("");
}
const out = { P: [], H: [] };
const t0 = Date.now();
M.SIZES.forEach((S, si) => { const R = rng(1000 + si), list = []; while (list.length < PER) { const p = make(R, S); if (p && p.split("|")[0].split(",").length <= (si === 0 ? 6 : 9)) list.push(p); } out.P.push(list); });
{ const R = rng(9000), S = M.HARD; while (out.H.length < PER * 2) { const p = make(R, S); if (p && p.split("|")[0].split(",").length >= 7 && p.split("|")[0].split(",").length <= 10) out.H.push(p); } }
fs.writeFileSync(path.join(__dirname, "..", "data.js"), "// 間取りの問題。tools/gen-levels.cjs で作る（手で直さない）。「条件,条件|答え」。条件は 種類（S 側・C 角・A となり・N 離す・D 向きのとなり）＋部屋の番号＋相手の番号＋向き。答えは部屋の順のますの番号\n(function(r){var D=" + JSON.stringify(out) + ";if(typeof module!=='undefined')module.exports=D;else r.MADORI_DATA=D;})(this);\n");
console.log("ok", Date.now() - t0, "ms", out.P.map((l) => l.reduce((a, p) => a + p.split("|")[0].split(",").length, 0) / l.length), out.H.reduce((a, p) => a + p.split("|")[0].split(",").length, 0) / out.H.length);
