// 間取りパズルの決まり：部屋・希望（条件）の種類・判定。tools/gen-levels.cjs と index.html の両方で使う。
(function (root) {
  "use strict";
  // 部屋：[名前, 絵, 色]
  const ROOMS = {
    gen: ["玄関", "🚪", "#d9c7a7"], liv: ["リビング", "🛋️", "#f2c48d"], kit: ["キッチン", "🍳", "#f5dd8a"], bed: ["寝室", "🛏️", "#b9cde8"],
    bath: ["浴室", "🛁", "#a9dbe0"], wc: ["トイレ", "🚽", "#cfe3c6"], wa: ["和室", "🍵", "#c9d99a"], kid: ["子ども部屋", "🧸", "#f2b8c0"], study: ["書斎", "📚", "#d6c3e6"],
  };
  // 大きさ：w×h の部屋。fixed：はじめから決まっている部屋（玄関は南の真ん中）
  const SIZES = [
    { name: "平屋", w: 3, h: 2, rooms: ["gen", "liv", "kit", "bed", "bath", "wc"], types: ["side", "adj", "nadj"] },
    { name: "二世帯", w: 3, h: 3, rooms: ["gen", "liv", "kit", "bed", "bath", "wc", "wa", "kid", "study"], types: ["side", "adj", "nadj", "corner"], fixed: { gen: 7 } },
    { name: "注文住宅", w: 3, h: 3, rooms: ["gen", "liv", "kit", "bed", "bath", "wc", "wa", "kid", "study"], types: ["side", "adj", "nadj", "corner", "dir"], fixed: { gen: 7 } },
  ];
  const HARD = { name: "上級", w: 3, h: 3, rooms: ["gen", "liv", "kit", "bed", "bath", "wc", "wa", "kid", "study"], types: ["side", "adj", "nadj", "corner", "dir"] };
  const SIDE = { s: "南側", n: "北側", e: "東側", w: "西側" };
  const DIR = { n: "北どなり", s: "南どなり", e: "東どなり", w: "西どなり" };
  const xy = (c, S) => [c % S.w, Math.floor(c / S.w)];
  const touch = (a, b, S) => { const [ax, ay] = xy(a, S), [bx, by] = xy(b, S); return Math.abs(ax - bx) + Math.abs(ay - by) === 1; };
  // 条件 q が置き方 at（部屋 → ます）で守られているか。部屋がまだ置かれていなければ null
  function holds(q, at, S) {
    const a = at[q.a], b = q.b != null ? at[q.b] : 0;
    if (a == null || (q.b != null && b == null)) return null;
    const [ax, ay] = xy(a, S), [bx, by] = xy(b, S);
    switch (q.t) {
      case "side": return q.d === "s" ? ay === S.h - 1 : q.d === "n" ? ay === 0 : q.d === "e" ? ax === S.w - 1 : ax === 0;
      case "corner": return (ax === 0 || ax === S.w - 1) && (ay === 0 || ay === S.h - 1);
      case "adj": return touch(a, b, S);
      case "nadj": return !touch(a, b, S);
      case "dir": return q.d === "n" ? ax === bx && ay === by - 1 : q.d === "s" ? ax === bx && ay === by + 1 : q.d === "e" ? ay === by && ax === bx + 1 : ay === by && ax === bx - 1;
    }
    return false;
  }
  // 条件の文（18字以内）
  function text(q) {
    const A = ROOMS[q.a][0], B = q.b ? ROOMS[q.b][0] : "";
    switch (q.t) {
      case "side": return `${A}は${SIDE[q.d]}がいい`;
      case "corner": return `${A}は角の部屋がいい`;
      case "adj": return `${A}は${B}のとなり`;
      case "nadj": return `${A}は${B}と離して`;
      case "dir": return `${A}は${B}の${DIR[q.d]}`;
    }
  }
  // 条件を全部守る置き方の数（cap で打ち切り）
  function count(S, qs, cap = 2) {
    const rooms = S.rooms, N = S.w * S.h, at = {}, used = new Array(N).fill(false); let n = 0;
    if (S.fixed) for (const r in S.fixed) { at[r] = S.fixed[r]; used[S.fixed[r]] = true; }
    const order = rooms.filter((r) => at[r] == null);
    const go = (k) => {
      if (n >= cap) return;
      if (k === order.length) { n++; return; }
      const r = order[k];
      for (let c = 0; c < N; c++) { if (used[c]) continue; at[r] = c; used[c] = true; if (qs.every((q) => holds(q, at, S) !== false)) go(k + 1); used[c] = false; delete at[r]; }
    };
    go(0);
    return n;
  }
  const R = { ROOMS, SIZES, HARD, SIDE, DIR, holds, text, count, touch, xy };
  if (typeof module !== "undefined") module.exports = R; else root.MADORI = R;
})(this);
