import { articles, buildArticleQuestions } from "./articles.ts";
/** Standard Flypy phonetic layout; no shape codes or word abbreviations. */
export const FINALS: Record<string, string> = {
  a: "a",
  o: "o",
  uo: "o",
  e: "e",
  i: "i",
  u: "u",
  v: "v",
  ai: "d",
  ei: "w",
  ui: "v",
  ao: "c",
  ou: "z",
  iu: "q",
  ie: "p",
  ue: "t",
  ve: "t",
  er: "r",
  an: "j",
  en: "f",
  in: "b",
  un: "y",
  ang: "h",
  eng: "g",
  ing: "k",
  ong: "s",
  ia: "x",
  ua: "x",
  iao: "n",
  uai: "k",
  ian: "m",
  uan: "r",
  iang: "l",
  uang: "l",
  iong: "s",
};
export const INITIALS: Record<string, string> = Object.fromEntries(
  "b p m f d t n l g k h j q x r z c s y w zh ch sh"
    .split(" ")
    .map((s) => [
      s,
      ({ zh: "v", ch: "i", sh: "u" } as Record<string, string>)[s] ?? s,
    ]),
);
export function encodeSyllable(raw: string): string {
  let p = raw.toLowerCase().replace(/u:/g, "v").replace(/ü/g, "v");
  if (!/^[a-z]+$/.test(p)) throw new Error(`不支持的拼音：${raw}`);
  if (/^[aoe]/.test(p)) {
    if (p.length === 1) return p + p;
    if (["ai", "ao", "an", "ei", "en", "er", "ou"].includes(p)) return p;
    if (p === "ang") return "ah";
    if (p === "eng") return "eg";
    throw new Error(`不支持的零声母：${raw}`);
  }
  const initial = /^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/.exec(p)?.[0];
  if (!initial) throw new Error(`缺少声母：${raw}`);
  let final = p.slice(initial.length);
  if (["j", "q", "x", "y"].includes(initial) && final === "u") final = "v";
  if (!FINALS[final]) throw new Error(`不支持的韵母：${raw}`);
  return INITIALS[initial] + FINALS[final];
}
export function encodePhrase(pinyin: string): string {
  return pinyin.trim().split(/\s+/).map(encodeSyllable).join("");
}
export type LessonId =
  | "initials"
  | "finals"
  | "zero"
  | "syllables"
  | "words"
  | "review"
  | "custom"
  | "article";
export interface Question {
  id: string;
  label: string;
  pinyin: string;
  answer: string;
  note: string;
}
export interface Lesson {
  id: LessonId;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}
export const lessons: Lesson[] = [
  {
    id: "initials",
    title: "声母练习",
    subtitle: "从熟悉的字母开始",
    icon: "AudioLines",
    color: "blue",
  },
  {
    id: "finals",
    title: "韵母练习",
    subtitle: "记住每一个韵母的位置",
    icon: "Keyboard",
    color: "purple",
  },
  {
    id: "zero",
    title: "零声母练习",
    subtitle: "掌握特殊音节的规则",
    icon: "CircleDot",
    color: "orange",
  },
  {
    id: "syllables",
    title: "单字练习",
    subtitle: "让声母和韵母连起来",
    icon: "Languages",
    color: "green",
  },
  {
    id: "words",
    title: "词组练习",
    subtitle: "从键位记忆走向自然输入",
    icon: "TextCursorInput",
    color: "blue",
  },
  {
    id: "review",
    title: "错题复习",
    subtitle: "把不熟悉的，变成熟悉的",
    icon: "RotateCcw",
    color: "orange",
  },
  {
    id: "custom",
    title: "自定义词组",
    subtitle: "练习自己常用的词",
    icon: "BookOpen",
    color: "purple",
  },
  {
    id: "article",
    title: "文章跟练",
    subtitle: "把词组连成完整句子",
    icon: "BookOpen",
    color: "blue",
  },
];
const phraseData = [
  ["你好", "ni hao"],
  ["世界", "shi jie"],
  ["双拼", "shuang pin"],
  ["小鹤", "xiao he"],
  ["学习", "xue xi"],
  ["生活", "sheng huo"],
  ["时间", "shi jian"],
  ["朋友", "peng you"],
  ["喜欢", "xi huan"],
  ["今天", "jin tian"],
  ["开始", "kai shi"],
  ["练习", "lian xi"],
  ["键盘", "jian pan"],
  ["输入", "shu ru"],
  ["快乐", "kuai le"],
  ["春天", "chun tian"],
  ["中国", "zhong guo"],
  ["语言", "yu yan"],
  ["每天", "mei tian"],
  ["坚持", "jian chi"],
  ["明天", "ming tian"],
  ["阳光", "yang guang"],
  ["清晨", "qing chen"],
  ["工作", "gong zuo"],
  ["思考", "si kao"],
  ["未来", "wei lai"],
  ["城市", "cheng shi"],
  ["自然", "zi ran"],
  ["花园", "hua yuan"],
  ["音乐", "yin yue"],
  ["安静", "an jing"],
  ["热爱", "re ai"],
  ["偶尔", "ou er"],
  ["女儿", "nv er"],
  ["绿色", "lv se"],
  ["旅行", "lv xing"],
  ["需要", "xu yao"],
  ["决定", "jue ding"],
  ["选择", "xuan ze"],
  ["认真", "ren zhen"],
  ["美好", "mei hao"],
  ["发现", "fa xian"],
  ["窗户", "chuang hu"],
  ["梦想", "meng xiang"],
  ["相信", "xiang xin"],
  ["勇敢", "yong gan"],
  ["成长", "cheng zhang"],
  ["温柔", "wen rou"],
  ["问候", "wen hou"],
  ["森林", "sen lin"],
  ["清风", "qing feng"],
  ["星空", "xing kong"],
  ["白云", "bai yun"],
  ["海洋", "hai yang"],
  ["山川", "shan chuan"],
  ["秋天", "qiu tian"],
  ["冬日", "dong ri"],
  ["温暖", "wen nuan"],
  ["舒服", "shu fu"],
  ["简单", "jian dan"],
  ["重要", "zhong yao"],
  ["记忆", "ji yi"],
  ["习惯", "xi guan"],
  ["速度", "su du"],
  ["准确", "zhun que"],
  ["目标", "mu biao"],
  ["进步", "jin bu"],
  ["完成", "wan cheng"],
  ["欢迎", "huan ying"],
  ["再见", "zai jian"],
  ["阅读", "yue du"],
  ["文字", "wen zi"],
  ["故事", "gu shi"],
  ["光阴", "guang yin"],
  ["努力", "nu li"],
  ["希望", "xi wang"],
  ["谢谢", "xie xie"],
  ["休息", "xiu xi"],
  ["安全", "an quan"],
  ["耳朵", "er duo"],
  ["安排", "an pai"],
  ["偶然", "ou ran"],
  ["平安", "ping an"],
  ["可爱", "ke ai"],
];
export const words: Question[] = phraseData.map(([label, pinyin]) => ({
  id: `word-${pinyin}`,
  label,
  pinyin,
  answer: encodePhrase(pinyin),
  note: "每个字依次输入声母键、韵母键，不需要空格。",
}));
const singleData = [
  ["你", "ni"],
  ["好", "hao"],
  ["双", "shuang"],
  ["拼", "pin"],
  ["学", "xue"],
  ["习", "xi"],
  ["中", "zhong"],
  ["国", "guo"],
  ["春", "chun"],
  ["风", "feng"],
  ["明", "ming"],
  ["月", "yue"],
  ["绿", "lv"],
  ["女", "nv"],
  ["去", "qu"],
  ["雨", "yu"],
  ["雪", "xue"],
  ["决", "jue"],
  ["安", "an"],
  ["爱", "ai"],
  ["哦", "o"],
  ["饿", "e"],
  ["昂", "ang"],
  ["而", "er"],
  ["天", "tian"],
  ["空", "kong"],
  ["窗", "chuang"],
  ["光", "guang"],
  ["水", "shui"],
  ["流", "liu"],
  ["花", "hua"],
  ["鸟", "niao"],
];
export const syllables: Question[] = singleData.map(([label, pinyin]) => ({
  id: `single-${pinyin}`,
  label,
  pinyin,
  answer: encodeSyllable(pinyin),
  note: "一个声母键 + 一个韵母键，组成一个音节。",
}));
export function questionsForArticle(id: string): Question[] {
  return buildArticleQuestions(id, encodeSyllable);
}
export function questionsFor(id: LessonId): Question[] {
  if (id === "article")
    return articles.flatMap((a) => questionsForArticle(a.id));
  if (id === "custom" || id === "review") return [];
  if (id === "initials")
    return Object.entries(INITIALS).map(([pinyin, answer]) => ({
      id: `initial-${pinyin}`,
      label: pinyin,
      pinyin,
      answer,
      note: ["zh", "ch", "sh"].includes(pinyin)
        ? `${pinyin} 是复合声母，对应 ${answer.toUpperCase()} 键。`
        : "单字母声母保持原来的键位。",
    }));
  if (id === "finals")
    return Object.entries(FINALS)
      .filter(([p]) => p !== "ve")
      .map(([pinyin, answer]) => ({
        id: `final-${pinyin}`,
        label: pinyin === "v" ? "ü" : pinyin,
        pinyin,
        answer,
        note: `韵母 ${pinyin === "v" ? "ü" : pinyin} 对应 ${answer.toUpperCase()} 键。${pinyin === "er" ? "独立音节 er 输入 ER。" : ""}`,
      }));
  if (id === "zero")
    return [
      "a",
      "o",
      "e",
      "ai",
      "ao",
      "an",
      "ei",
      "en",
      "er",
      "ou",
      "ang",
      "eng",
    ].map((pinyin) => ({
      id: `zero-${pinyin}`,
      label: pinyin,
      pinyin,
      answer: encodeSyllable(pinyin),
      note:
        pinyin.length === 1
          ? "单字母零声母音节：重复输入该字母。"
          : pinyin.length === 2
            ? "双字母零声母音节：直接输入原拼音。"
            : "三字母零声母音节：首字母 + 韵母映射键。",
    }));
  return id === "words" ? words : syllables;
}
export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function makeQueue(
  items: Question[],
  count: number,
  random: boolean,
): Question[] {
  if (!items.length) return [];
  const result: Question[] = [];
  while (result.length < count)
    result.push(...(random ? shuffled(items) : items));
  return result.slice(0, count);
}
