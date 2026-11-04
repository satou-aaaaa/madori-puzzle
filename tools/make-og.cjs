// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の家は入れず、見本の間取りと希望だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const R = require(path.join(__dirname, "..", "rules.js"));
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const lay = ["bed", "bath", "wc", "study", "liv", "kit", "kid", "gen", "wa"];
  const cells = lay.map((r) => `<div style="background:${R.ROOMS[r][2]};border:3px solid #3b4650;margin:-1.5px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:22px;font-weight:800"><span style="font-size:44px">${R.ROOMS[r][1]}</span>${R.ROOMS[r][0]}</div>`).join("");
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:70px 80px;background:#eef0ea;color:#28313a;position:relative;overflow:hidden">
    <div style="font-size:34px;color:#9b3220;letter-spacing:.1em">だれでも同じ 1日3軒・答えは1つ</div>
    <div style="font-size:104px;font-weight:900;margin-top:16px;letter-spacing:.04em">間取りパズル</div>
    <div style="font-size:40px;margin-top:18px;line-height:1.5">住む人の希望を、<br>全部かなえられる？</div>
    <div style="position:absolute;left:96px;top:470px;display:flex;gap:12px">${["キッチンはリビングのとなり", "寝室は北側がいい"].map((t) => `<div style="background:#fff8c9;border-radius:10px;padding:10px 16px;font-size:24px;box-shadow:0 3px 0 #28313a22">${t}</div>`).join("")}</div>
    <div style="position:absolute;left:730px;top:110px;width:400px;height:400px;background:#fffffb;border-radius:20px;padding:24px;box-sizing:border-box;box-shadow:0 8px 0 #28313a18">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);border:6px solid #3b4650;width:100%;height:100%;box-sizing:border-box">${cells}</div>
    </div>
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
