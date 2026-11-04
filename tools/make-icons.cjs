// アプリのアイコン（icon-192.png・icon-512.png）を作る。方眼の紙に、色をぬった3×3の間取り。
// 使い方: node tools/make-icons.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const col = ["#b9cde8", "#a9dbe0", "#cfe3c6", "#f2c48d", "#f2c48d", "#f5dd8a", "#c9d99a", "#d9c7a7", "#f2b8c0"];
  for (const s of [192, 512]) {
    const p = await b.newPage({ viewport: { width: s, height: s } });
    const cells = col.map((c, i) => `<rect x="${20 + (i % 3) * 20}" y="${22 + Math.floor(i / 3) * 18}" width="20" height="18" fill="${c}" stroke="#3b4650" stroke-width="1.6"/>`).join("");
    await p.setContent(`<body style="margin:0"><svg width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#eef0ea"/><rect x="12" y="14" width="76" height="72" rx="6" fill="#fffffb"/>${cells}
      <rect x="20" y="22" width="60" height="54" fill="none" stroke="#3b4650" stroke-width="3.5"/><rect x="44" y="74.5" width="12" height="3" fill="#fffffb"/></svg></body>`);
    await p.screenshot({ path: path.join(__dirname, "..", `icon-${s}.png`), clip: { x: 0, y: 0, width: s, height: s } });
  }
  await b.close();
})();
