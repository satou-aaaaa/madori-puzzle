// 間取りパズルの検査。問題（答えが1つ・要らない条件が無い・習った種類だけ）・3軒の組み方・置く/動かす/戻す・ヒント・続きから・上級・記録・スマホ幅・PWA。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const req = createRequire(import.meta.url), R = req(path.join(root, "rules.js")), D = req(path.join(root, "data.js"));

// 1. 問題（ブラウザを使わない）。全部の家を確かめ直す
const TYPE = { S: "side", C: "corner", A: "adj", N: "nadj", D: "dir" };
const parse = (raw, S) => { const [qs, sol] = raw.split("|"); return { q: qs.split(",").map((t) => { const m = t.match(/^([SCAND])(\d)(\d?)([nsew]?)$/); return m ? { t: TYPE[m[1]], a: S.rooms[+m[2]], b: m[3] !== "" ? S.rooms[+m[3]] : null, d: m[4] || null } : null; }), at: Object.fromEntries(S.rooms.map((r, i) => [r, +sol[i]])) }; };
{
  const sets = [...D.P.map((l, i) => [l, R.SIZES[i]]), [D.H, R.HARD]], bad = [], extra = [], typeNg = [], long = [], dup = [];
  for (const [list, S] of sets) {
    if (list.length !== (S === R.HARD ? 730 : 365) || new Set(list).size !== list.length) dup.push(S.name);
    list.forEach((raw, n) => {
      const p = parse(raw, S);
      if (p.q.some((q) => !q) || new Set(Object.values(p.at)).size !== S.rooms.length) { bad.push(`${S.name}${n} 形`); return; }
      if (S.fixed && Object.keys(S.fixed).some((r) => p.at[r] !== S.fixed[r])) bad.push(`${S.name}${n} 玄関`);
      if (!p.q.every((q) => R.holds(q, p.at, S) === true)) bad.push(`${S.name}${n} 答えが条件を守らない`);
      if (R.count(S, p.q, 3) !== 1) bad.push(`${S.name}${n} 答えが1つでない`);
      p.q.forEach((q, k) => { if (R.count(S, p.q.filter((_, j) => j !== k), 2) === 1) extra.push(`${S.name}${n}:${k}`); });
      if (p.q.some((q) => !S.types.includes(q.t)) || !p.q.some((q) => q.t === S.types[S.types.length - 1])) typeNg.push(`${S.name}${n}`);
      p.q.forEach((q) => { if (R.text(q).length > 18) long.push(R.text(q)); });
    });
  }
  check("どの家も、答えが希望を全部守り、答えはちょうど1つ（3種類×365軒・上級730軒）", bad.length === 0, bad.slice(0, 3).join(","));
  check("どの希望を外しても答えが2つ以上になる（要らない希望が無い）", extra.length === 0, extra.slice(0, 3).join(","));
  check("その家の種類で習った希望だけを使い、新しい種類が必ず1つ入る（平屋：側・となり・離す、二世帯：＋角、注文住宅：＋向きのとなり）", typeNg.length === 0, typeNg.slice(0, 3).join(","));
  check("希望の文は18字以内", long.length === 0, long.slice(0, 3).join(","));
  check("家は種類ごとに365軒（上級は730軒）で、同じ家が無い（1年は同じ家が出ない）", dup.length === 0, dup.join(","));
  { // 答えの数を、別の数え方（全部の並べ方を試す）で確かめる
    const perm = (a) => a.length <= 1 ? [a] : a.flatMap((x, i) => perm([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
    const ng = [];
    for (let n = 0; n < 12; n++) { const S = R.SIZES[n % 3], p = parse(D.P[n % 3][n * 29 % 365], S), free = S.rooms.filter((r) => !(S.fixed && S.fixed[r] != null)), cells = [...Array(S.w * S.h).keys()].filter((c) => !Object.values(S.fixed || {}).includes(c)); let k = 0; for (const pm of perm(cells)) { const at = Object.assign({}, S.fixed || {}); free.forEach((r, i) => (at[r] = pm[i])); if (p.q.every((q) => R.holds(q, at, S) === true)) k++; } if (k !== 1) ng.push(`${S.name}:${k}`); }
    check("答えの数が、別の数え方（全部の並べ方）でも1つ", ng.length === 0, ng.join(",")); }
  { // 判定の見本（北が上・東が右）
    const S = R.SIZES[1], at = { liv: 0, kit: 1, bed: 4, gen: 7 };
    check("判定の見本：左上は北側・西側・角、真ん中のとなりは上下左右だけ、北どなりは真上", R.holds({ t: "side", a: "liv", d: "n" }, at, S) && R.holds({ t: "side", a: "liv", d: "w" }, at, S) && R.holds({ t: "corner", a: "liv" }, at, S) && !R.holds({ t: "corner", a: "kit" }, at, S) && R.holds({ t: "adj", a: "kit", b: "bed" }, at, S) && !R.holds({ t: "adj", a: "liv", b: "bed" }, at, S) && R.holds({ t: "dir", a: "kit", b: "bed", d: "n" }, at, S) && R.holds({ t: "dir", a: "bed", b: "gen", d: "n" }, at, S) && !R.holds({ t: "dir", a: "liv", b: "bed", d: "n" }, at, S));
  }
}

const html = readFileSync(path.join(root, "index.html"), "utf8");
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない", ext.length === 0, ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習の家選びだけ（今日の3軒・上級は日付で決まる）", (html.match(/Math\.random/g) || []).length === 1 && !/Math\.random/.test(readFileSync(path.join(root, "rules.js"), "utf8")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/madori-puzzle/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームは名前・メールを聞かない（楽しさ・よかった所・直してほしい所だけ）", /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy) && /labels: \["感想"\]/.test(fy)); }
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  const need = ["./index.html", "./rules.js", "./data.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
  check("PWA：ネットの返事の保存は、イベントの中で waitUntil に預ける（遅れて届いた新しい版も保存できる）", /e\.waitUntil\(Promise\.race\(\[net\.then[^\n]*Promise\.race\(\[caches\.open[^\n]*wait\(15000\)\]\); \}, \(\) => \{\}\)\.catch\(\(\) => \{\}\), wait\(60000\)\]\)\);/.test(sw) && !/\.then\([^\n]*e\.waitUntil/.test(sw));
  check("PWA：sw.js は画面のファイルを全部保存し、外へ何も送らない", need.every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "間取りパズル" && mf.icons.length >= 2 && mf.start_url === "./"); }
{ const src = html + readFileSync(path.join(root, "rules.js"), "utf8");
  const bad = src.match(/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/g) || [];
  check("並べ替えの比較の中で乱数を引いていない（同じ日に人によって問題が変わらない）", bad.length === 0, bad.join(" | ")); }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const isNoise = (t) => /fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(t);
const errors = [];
async function newPage(w = 390, h = 844) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errors.push(e.stack));
  page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  return page;
}
const curM = (page) => page.evaluate(() => { const c = window.__md.cur(); return { i: c.i, at: Object.assign({}, c.at), sel: c.sel, done: c.done, sol: c.h.sol, lock: c.lock.slice(), rooms: c.h.S.rooms, fixed: c.h.S.fixed || {} }; });
// 答えのとおりに置く：まだ答えのますに無い部屋を選んで、答えのますを押す
async function solveNow(page) {
  const i0 = (await curM(page)).i;
  for (let k = 0; k < 20; k++) {
    const c = await curM(page); if (c.done || c.i !== i0) return; // 別の家に替わったらやめる
    const r = c.rooms.find((x) => c.at[x] !== c.sol[x]); if (!r) return;
    if (c.at[r] == null) await page.click(`.rm[data-r="${r}"]`);
    else if (c.sel !== r) await page.click(`#pl .cell[data-c="${c.at[r]}"]`);
    await page.click(`#pl .cell[data-c="${c.sol[r]}"]`);
  }
}
const KEY = "madori-v1";
try {
  const page = await newPage();
  // 2. 3軒の組み方（日付）
  const sel = await page.evaluate(() => {
    const g = window.__md, out = { bad: [], same: 0, rep: 0 };
    let prev = null; const seen = new Set();
    for (let n = 0; n < 365; n++) {
      const k = new Date(Date.parse("2026-11-04") + n * 864e5).toISOString().slice(0, 10);
      const d = g.dailyList(k).map(g.houseOf), h = g.hardList(k).map(g.houseOf);
      if (d.map((p) => p.size).join() !== "平屋,二世帯,注文住宅" || h.some((p) => p.size !== "上級")) out.bad.push(k);
      const sig = JSON.stringify(g.dailyList(k)); if (sig === prev) out.same++; prev = sig;
      for (const it of [...g.dailyList(k), ...g.hardList(k)]) { const key = it.s + ":" + it.n; if (seen.has(key)) out.rep++; seen.add(key); }
    }
    out.d1201 = JSON.stringify(g.dailyList("2026-12-01").map(g.houseOf).map((h) => h.q));
    return out;
  });
  check("今日の3軒は毎日「平屋・二世帯・注文住宅」、上級は2軒（1年分）", sel.bad.length === 0, sel.bad.slice(0, 3).join(","));
  check("1年のあいだ同じ家は出ない（今日の3軒・上級とも）", sel.same === 0 && sel.rep === 0, `重なり${sel.rep}`);
  { const ctx = await browser.newContext(); const p2 = await ctx.newPage(); await p2.goto(url);
    const d2 = await p2.evaluate(() => { const g = window.__md; return JSON.stringify(g.dailyList("2026-12-01").map(g.houseOf).map((h) => h.q)); });
    await ctx.close();
    check("同じ日は別のブラウザで開いても同じ3軒", sel.d1201 === d2); }

  // 3. 通しで遊ぶ
  check("初めて開くと遊び方が出る", await page.locator("#howto[open]").count() === 1);
  await page.click("#howto-ok");
  await page.click("#go-d");
  let c = await curM(page);
  check("1軒目は平屋（3×2）・希望が出て、はじめから台の先頭の部屋が選ばれている", (await page.locator("#pl .cell").count()) === 6 && (await page.locator("#wish li").count()) >= 3 && c.sel === c.rooms[0]);
  await page.click(`#pl .cell[data-c="0"]`);
  let n1 = await curM(page);
  check("ますを押すと選んだ部屋が置かれ、次の部屋が選ばれる", n1.at[c.rooms[0]] === 0 && n1.sel === c.rooms[1]);
  await page.click(`#pl .cell[data-c="1"]`);
  await page.click(`#pl .cell[data-c="0"]`); await page.click(`#pl .cell[data-c="1"]`);
  n1 = await curM(page);
  check("置いた部屋を押して別の部屋のますを押すと、入れかわる", n1.at[c.rooms[0]] === 1 && n1.at[c.rooms[1]] === 0);
  await page.click(`#pl .cell[data-c="1"]`); await page.click(`#pl .cell[data-c="1"]`);
  n1 = await curM(page);
  check("選んだ部屋をもう一度押すと台に戻る", n1.at[c.rooms[0]] == null);
  { const liv = (await page.locator("#wish li.ok, #wish li.ng").count()); check("両方の部屋を置いた希望には ✓ か ✗ が出る", liv >= 0 && (await page.locator("#wish li i").first().textContent()).length === 1); }
  await page.click("#hint");
  n1 = await curM(page);
  check("ヒントで1部屋が答えのますに置かれ、動かせなくなる", n1.lock.length === 1 && n1.at[n1.lock[0]] === n1.sol[n1.lock[0]] && (await page.locator("#pl .cell.lock").count()) === 1);
  await page.click(`#pl .cell[data-c="${n1.sol[n1.lock[0]]}"]`);
  check("ヒントの部屋を押しても動かない", (await curM(page)).at[n1.lock[0]] === n1.sol[n1.lock[0]]);
  await page.reload(); await page.click("#go-d");
  n1 = await curM(page);
  check("途中で閉じても、置いた部屋とヒントはそのまま（続きから）", n1.lock.length === 1 && Object.keys(n1.at).length >= 2 && (await page.textContent("#left")).includes("ヒント 1"));
  await page.click("#back"); await page.click("#go-p"); await page.locator(".lv button").first().click(); await page.click("#back"); await page.click("#go-d");
  check("練習を始めても、今日の途中経過は消えない", (await curM(page)).lock.length === 1 && (await page.evaluate(() => window.__md.mode())) === "d");
  await page.click("#clear");
  check("「全部もどす」でもヒントの部屋は残る", Object.keys((await curM(page)).at).length === 1);
  await solveNow(page);
  check("希望を全部かなえると完成になり、★2（ヒント1）が出る", (await curM(page)).done && (await page.locator(".verdict .stars .off").textContent()).length === 1 && (await page.locator("#wish li.ok").count()) === (await page.locator("#wish li").count()));
  await page.click("#next");
  c = await curM(page);
  check("2軒目は二世帯（3×3）で、玄関は南の真ん中に決まっていて動かない", (await page.locator("#pl .cell").count()) === 9 && c.at.gen === 7 && (await page.locator("#pl .cell.fix").count()) === 1);
  await page.click(`#pl .cell[data-c="7"]`);
  check("玄関を押しても動かない", (await curM(page)).at.gen === 7);
  // 別のタブで先に進んでいたら、古い画面の答えは足さない
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.push({ h: 0 }); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await solveNow(page);
  check("別のタブで先に進んでいたら、古い画面の答えは足さず今の家を出し直す", (await page.evaluate(() => window.__md.load().runs.d.res.length)) === 2 && (await page.textContent("header")).includes("3/3"));
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.pop(); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.reload(); await page.click("#go-d");
  for (let j = 0; j < 2; j++) { await solveNow(page); await page.click("#next"); }
  const share = await page.textContent(".share");
  check("3軒で結果・シェアの文は番号と色だけ", /間取りパズル #\d+/.test(share) && /🟨🏠🏠/.test(share));
  check("X・LINE は押したときに開くリンクだけ", /^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(await page.getAttribute("#toX", "href")) && /^https:\/\/line\.me\/R\/share\?text=/.test(await page.getAttribute("#toLine", "href")));
  check("結果に3軒の間取りが出る", (await page.locator(".minis .plan").count()) === 3);
  check("ヒントを使った日は Ko-fi のひとことを出さない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  check("ホームで連続1日・今日の結果を見るに変わる・建てた家3", (await page.textContent(".stats")).includes("1連続の日") && (await page.textContent(".stats")).includes("3建てた家") && (await page.textContent("#go-d")).includes("結果"));
  // 上級
  await page.click("#go-h");
  check("上級は3×3でヒントのボタンが無く、希望の ✓✗ が出ない", (await page.locator("#pl .cell").count()) === 9 && (await page.locator("#hint").count()) === 0);
  { const c2 = await curM(page), r = c2.rooms.find((x) => c2.at[x] == null); await page.click(`.rm[data-r="${r}"]`); await page.click(`#pl .cell[data-c="${c2.sol[r]}"]`);
    check("上級は部屋を置いても ✓✗ が出ない", (await page.locator("#wish li.ok, #wish li.ng").count()) === 0); }
  for (let j = 0; j < 2; j++) { await solveNow(page); await page.click("#next"); }
  check("上級をヒントなしで初めて終えると、結果に Ko-fi のひとことが1行", (await page.locator(".kofi").count()) === 1 && (await page.textContent(".big")).includes("ヒントなし"));
  await page.click("#back"); await page.click("#go-h");
  check("2回目に結果を開いても Ko-fi のひとことは出ない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  await page.click("#go-p"); await page.locator(".lv button").nth(1).click();
  await solveNow(page); await page.click("#next");
  const after = await page.evaluate(() => { const s = window.__md.load(); return { days: Object.keys(s.days).length, homes: s.homes }; });
  check("練習は今日の記録を増やさず、建てた家には入る", after.days === 1 && after.homes === 6 && (await page.locator(".share").count()) === 0);
  await page.click("#go-dex");
  check("建てた家に部屋ごとの数が出る", (await page.locator(".dex div").count()) === 9);
  await page.close();

  // 4. スマホ幅：はみ出さない・押せる所は44px以上
  for (const w of [320, 390]) {
    const p3 = await newPage(w, 700); await p3.click("#howto-ok");
    const homeOk = await p3.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await p3.click("#go-d");
    await p3.evaluate(() => { const g = window.__md, s = g.load(); s.runs.d.res = [{ h: 0 }]; localStorage.setItem("madori-v1", JSON.stringify(s)); });
    await p3.click("#back"); await p3.click("#go-d");
    const r = await p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.id || e.textContent.trim().slice(0, 6)), cell: Math.min(...[...document.querySelectorAll("#pl .cell")].map((e) => e.getBoundingClientRect().height)), wrap: Math.max(...[...document.querySelectorAll("#wish li")].map((e) => e.getBoundingClientRect().height)) }));
    check(`幅${w}px（3×3）：横にはみ出さず、押せる所は高さ44px以上・希望は1行に収まる`, homeOk && !r.over && r.small.length === 0 && r.cell >= 44 && r.wrap < 40, `${r.small.join(",")} ます${r.cell.toFixed(0)}px 希望${r.wrap.toFixed(0)}px`);
    await p3.close();
  }
  { // 保存してあった置き方が壊れていたら使わない
    const pv = await newPage(); await pv.click("#howto-ok");
    await pv.evaluate((k) => { const g = window.__md, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, rooms: {}, homes: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [], cur: { i: 0, at: { liv: 0, kit: 0 }, lock: [], hints: 0 }, id: "a" } } })); }, KEY);
    await pv.reload(); await pv.click("#go-d");
    check("壊れた途中経過（同じますに2部屋）は使わず、空の家から始める", Object.keys((await curM(pv)).at).length === 0);
    await pv.close(); }
  { // 保存できないブラウザでも遊べる
    const pb = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pb.on("pageerror", (e) => errors.push(e.message));
    await pb.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
    await pb.goto(url); await pb.click("#howto-ok"); await pb.click("#go-d");
    await pb.click("#pl .cell[data-c=\"0\"]");
    check("保存できないブラウザでも、今日の1軒目に部屋を置ける", (await pb.textContent("header")).includes("1/3") && Object.keys((await curM(pb)).at).length === 1);
    await pb.click("#back");
    check("保存できないブラウザでも、遊び方が何度も開かない", !(await pb.locator("#howto[open]").count()));
    await pb.close(); }
  { // 前の記録が残っていて、書き込みだけ失敗するとき
    const pq = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pq.on("pageerror", (e) => errors.push(e.message));
    await pq.addInitScript(() => { const orig = Storage.prototype.setItem; orig.call(localStorage, "madori-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, rooms: {}, homes: 0, kofi: {}, runs: {} })); Storage.prototype.setItem = () => { throw new Error("full"); }; });
    await pq.goto(url); await pq.click("#go-d");
    check("前の記録があり書き込みだけ失敗しても、今日の1軒目が始まる", (await pq.textContent("header")).includes("1/3"));
    await pq.close(); }
  { const pc = await newPage();
    await pc.evaluate((k) => { const g = window.__md, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, rooms: {}, homes: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2].map(() => ({ h: 0 })), id: "a" } } })); }, KEY);
    await pc.reload();
    check("最後の1軒のあと閉じても、開き直すと結果へ進み今日の記録がつく", await pc.evaluate(() => { const g = window.__md; return !!g.load().days[g.todayKey()] && !g.load().runs.d; }));
    await pc.close(); }
  { const pm = await newPage();
    await pm.evaluate((k) => { const g = window.__md, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, rooms: {}, homes: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2].map(() => ({ h: 0 })), id: "a" } } })); }, KEY);
    await pm.reload();
    const had = await pm.locator("#go-h").count();
    await pm.evaluate(() => { const RD = Date, off = 864e5; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; });
    if (had) await pm.click("#go-h");
    check("結果を開いたまま日付が変わったら、上級のボタンを押しても翌日の上級は始まらない", had > 0 && (await pm.evaluate(() => window.__md.mode())) !== "h");
    await pm.close(); }
  { const pn = await newPage();
    await pn.evaluate((k) => { const g = window.__md, d = new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, rooms: {}, homes: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2].map(() => ({ h: 0 })), id: "a" } } })); }, KEY);
    await pn.reload();
    check("前の日に終えて閉じても、翌日に開くとその日の記録がつく", await pn.evaluate(() => { const g = window.__md; return !!g.load().days[new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10)] && !g.load().runs.d; }));
    check("前の日の結果の画面からは、今日の上級を始められない（今日の分を先に）", !(await pn.locator("#go-h").count()));
    check("保存に失敗したあと別のタブが新しく保存していたら、古いメモリで上書きせずそちらを読む", await pn.evaluate((K) => { const g = window.__md, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 1, tagA: 1 })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 2, tagB: 1 }))); const r = g.load(); mem = null; return !!r.tagB && !r.tagA; }, KEY));
    check("保存に失敗したあと別のタブが保存しても、両方の記録（日ごとの結果）を残し、部屋の数は多いほう", await pn.evaluate((K) => { const g = window.__md, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, days: { "2000-01-01": 1 }, rooms: { liv: 9 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, days: { "2000-01-02": 1 }, rooms: { liv: 2 } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && !!r.days["2000-01-02"] && r.rooms["liv"] === 9; }, KEY));
    check("保存に失敗したタブの時刻が進んでいても、別のタブで先に進んだ途中経過を古いメモリで戻さない", await pn.evaluate((K) => { const g = window.__md, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [{ s: 0, n: 1 }], id: "x", res: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 99, runs: { d: Object.assign({}, base) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 1, runs: { d: Object.assign({}, base, { res: [{ h: 0 }] }) } }))); const r = g.load(); mem = null; return r.runs.d.res.length === 1; }, KEY));
    check("時計が戻っても、保存の時刻 t は前より大きくなる", await pn.evaluate((K) => { const s0 = JSON.parse(localStorage.getItem(K)); const far = Date.now() + 1e9; localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: far }))); save(() => {}); return JSON.parse(localStorage.getItem(K)).t > far; }, KEY));
    await pn.close(); }
} catch (e) {
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

const ng = results.filter((r) => !r.ok);
const md = `# 間取りパズル QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
