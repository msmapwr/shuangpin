import { FINALS, INITIALS, encodeSyllable } from "./encoding.ts";

export const keyRows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const cues: Record<string, [string, string, string]> = {
  q: ["秋天的秋，韵母 iu 放在 Q。", "秋", "qiu"],
  w: ["微风的微，韵母 ei 放在 W。", "微", "wei"],
  e: ["鹅的 e，保持 E。", "鹅", "e"],
  r: ["软的 uan 用 R；er 也在 R。", "软", "ruan"],
  t: ["雪的 ue 用 T；üe 也用 T。", "雪", "xue"],
  y: ["云的 un，放在 Y。", "云", "yun"],
  u: ["树的韵母 u 保持 U；U 作第一键时表示 sh。", "树", "shu"],
  i: ["衣的韵母 i 保持 I；I 作第一键时表示 ch。", "衣", "yi"],
  o: ["窝的 uo 和哦的 o，都用 O。", "窝", "wo"],
  p: ["撇的韵母 ie，放在 P。", "撇", "pie"],
  a: ["啊的 a，保持 A。", "啊", "a"],
  s: ["松的 ong、穷的 iong，共用 S。", "松", "song"],
  d: ["呆的韵母 ai，放在 D。", "呆", "dai"],
  f: ["分的 en 用 F；和风的 eng → G 对照。", "分", "fen"],
  g: ["风的 eng 用 G；别和 en → F 混。", "风", "feng"],
  h: ["航的 ang 用 H；和 an → J 对照。", "航", "hang"],
  j: ["把 an 放在 J，与 ang → H 分开记。", "看", "kan"],
  k: ["英的 ing、快的 uai，共用 K。", "快", "kuai"],
  l: ["凉的 iang、光的 uang，共用 L。", "凉", "liang"],
  z: ["走的韵母 ou，放在 Z。", "走", "zou"],
  x: ["虾的 ia、花的 ua，共用 X。", "虾", "xia"],
  c: ["草的韵母 ao，放在 C。", "草", "cao"],
  v: ["ü（写作 v）和 ui 共用 V；V 作第一键时表示 zh。", "女", "nv"],
  b: ["宾的 in 用 B；和 ing → K 对照。", "宾", "bin"],
  n: ["鸟的韵母 iao，放在 N。", "鸟", "niao"],
  m: ["面的韵母 ian，放在 M。", "面", "mian"],
};
export function keyMemory(key: string) {
  if (!Object.hasOwn(cues, key)) throw new Error("键位不存在");
  const [cue, label, pinyin] = cues[key];
  return {
    key,
    cue,
    label,
    pinyin,
    answer: encodeSyllable(pinyin),
    finals: Object.entries(FINALS)
      .filter(([p, k]) => k === key && p !== "ve")
      .map(([p]) => p),
    initials: Object.entries(INITIALS)
      .filter(([p, k]) => k === key && p.length > 1)
      .map(([p]) => p),
  };
}
export function rowFinals(row: number): string[] {
  if (!Number.isInteger(row) || !keyRows[row]) throw new Error("键盘行不存在");
  return [...keyRows[row]].flatMap((key) => keyMemory(key).finals);
}
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const display = (p: string) => (p === "v" ? "ü" : p);
export function memoryDetailHTML(key: string): string {
  const k = keyMemory(key);
  return `<div><strong>${key.toUpperCase()} 键</strong><span>韵母：${k.finals.map(display).join(" / ")}${k.initials.length ? `；复合声母：${k.initials.join(" / ")}` : ""}</span></div><p>${esc(k.cue)}</p><p class="memory-example">${esc(k.label)} <span>${k.pinyin}</span> → <kbd>${k.answer.toUpperCase()}</kbd></p>`;
}
export function memoryMapHTML(): string {
  return `<section class="memory-map" aria-label="小鹤双拼键位速记表"><h3>点一个键，看看怎么记</h3><p>键帽上写韵母；紫色小字标出 zh、ch、sh。联想字帮助记位置，输入时仍按拼音拆音节。小屏可左右滑动键位表。</p><div class="memory-keyboard" role="group" aria-label="26 个字母键">${keyRows
    .map(
      (row) =>
        `<div class="memory-key-row">${[...row]
          .map((key) => {
            const k = keyMemory(key);
            return `<button class="memory-keycap" data-memory-key="${key}" aria-pressed="${key === "q"}" aria-label="${key.toUpperCase()} 键，韵母 ${k.finals.map(display).join("、")}${k.initials.length ? `，声母 ${k.initials.join("、")}` : ""}"><strong>${key.toUpperCase()}</strong><span>${k.finals.map(display).join(" / ")}</span>${k.initials.length ? `<small>${k.initials.join(" / ")}</small>` : ""}</button>`;
          })
          .join("")}</div>`,
    )
    .join(
      "",
    )}</div><div class="memory-detail" id="memory-detail" role="status">${memoryDetailHTML("q")}</div></section>`;
}
