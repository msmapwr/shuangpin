import {
  encodePhrase,
  questionsFor,
  type LessonId,
  type Question,
} from "./encoding.ts";

export interface TrainingGroup {
  id: string;
  name: string;
  values?: string[];
}
const group = (id: string, name: string, values: string): TrainingGroup => ({
  id,
  name,
  values: values.split(" "),
});
export function groupsFor(id: LessonId): TrainingGroup[] {
  const all = { id: "all", name: "全部内容" };
  if (id === "initials")
    return [
      all,
      group("compound", "复合声母 · zh / ch / sh", "zh ch sh"),
      group("simple", "单字母声母", "b p m f d t n l g k h j q x r z c s y w"),
    ];
  if (id === "finals")
    return [
      all,
      group("simple", "单韵母", "a o e i u v"),
      group(
        "compound",
        "复韵母与特殊韵母",
        "ai ei ui ao ou iu ie ue er ia ua uo iao uai",
      ),
      group("front", "前鼻韵母", "an en in un ian uan"),
      group("back", "后鼻韵母", "ang eng ing ong iang uang iong"),
    ];
  if (id === "zero")
    return [
      all,
      group("single", "单字母 · 重复输入", "a o e"),
      group("double", "双字母 · 原样输入", "ai ao an ei en er ou"),
      group("triple", "三字母 · 首字母 + 韵母键", "ang eng"),
    ];
  if (id === "syllables")
    return [
      all,
      group(
        "special",
        "复合声母与 ü 专项",
        "shuang zhong chun chuang shui lv nv qu yu xue jue",
      ),
      group("zero", "零声母单字", "an ai o e ang er"),
    ];
  if (id === "words")
    return [
      all,
      group(
        "daily",
        "日常表达",
        "你好 朋友 喜欢 今天 开始 快乐 每天 谢谢 休息 再见 欢迎",
      ),
      group(
        "nature",
        "四季与自然",
        "春天 阳光 清晨 自然 花园 森林 清风 星空 白云 海洋 山川 秋天 冬日",
      ),
      group(
        "learning",
        "学习与工作",
        "双拼 小鹤 学习 练习 键盘 输入 工作 思考 记忆 习惯 速度 准确 目标 进步 完成",
      ),
    ];
  return [all];
}
export function filterQuestions(
  id: LessonId,
  groupId: string,
  items = questionsFor(id),
): Question[] {
  const selected = groupsFor(id).find((g) => g.id === groupId);
  if (!selected) throw new Error("练习分组不存在");
  return selected.values
    ? items.filter((q) =>
        selected.values!.includes(id === "words" ? q.label : q.pinyin),
      )
    : items;
}

// Standard spellings supported by this phonetic trainer. Standalone syllabic
// consonants and dialect readings are intentionally outside its two-key lessons.
const supportedSyllables = new Set(
  `
a ai an ang ao o ou e ei en eng er
ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu
pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu
ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu
fa fan fang fei fen feng fo fou fu
da dai dan dang dao de dei den deng di dia dian diao die ding diu dong dou du duan dui dun duo
ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo
na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nuo nv nve
la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu lo long lou lu luan lun luo lv lve
ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo
ka kai kan kang kao ke kei ken keng kong kou ku kua kuai kuan kuang kui kun kuo
ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo
ji jia jian jiang jiao jie jin jing jiong jiu ju juan jue jun
qi qia qian qiang qiao qie qin qing qiong qiu qu quan que qun
xi xia xian xiang xiao xie xin xing xiong xiu xu xuan xue xun
zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo
cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo
sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo
ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo
za zai zan zang zao ze zei zen zeng zi zong zou zu zuan zui zun zuo
ca cai can cang cao ce cen ceng ci cong cou cu cuan cui cun cuo
sa sai san sang sao se sen seng si song sou su suan sui sun suo
ya yan yang yao ye yi yin ying yo yong you yu yuan yue yun
wa wai wan wang wei wen weng wo wu
`
    .trim()
    .split(/\s+/),
);

export function customQuestion(label: string, pinyin: string): Question {
  label = label.trim();
  pinyin = pinyin
    .trim()
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/ü/g, "v")
    .split(/\s+/)
    .join(" ");
  if (!/^\p{Script=Han}{2,8}$/u.test(label))
    throw new Error("词组需为 2～8 个汉字，不含标点");
  const parts = pinyin
    .split(" ")
    .map((part) => part.replace(/^([jqxy])v(?=$|an$|e$|n$)/, "$1u"));
  pinyin = parts.join(" ");
  if (parts.length !== [...label].length)
    throw new Error("每个汉字需要一个拼音，音节之间用空格分隔");
  for (const part of parts) {
    // Accept v for the omitted umlaut in j/q/x/y spellings, too.
    if (!supportedSyllables.has(part))
      throw new Error(
        `不支持的拼音「${part}」，请使用无声调标准拼音（ü 可写 v）`,
      );
  }
  return {
    id: `custom-${label}-${pinyin}`,
    label,
    pinyin,
    answer: encodePhrase(pinyin),
    note: "自定义词组：每个字依次输入声母键、韵母键。",
  };
}
export const MAX_CUSTOM_WORDS = 200;
export function parseCustomWords(text: string): Question[] {
  if (text.length > 32000) throw new Error("内容过长，每次最多添加 200 个词组");
  const lines = text
    .split(/\r?\n/)
    .map((text, index) => ({ text: text.trim(), line: index + 1 }))
    .filter((l) => l.text);
  if (!lines.length) throw new Error("请至少填写一行词组和拼音");
  if (lines.length > MAX_CUSTOM_WORDS)
    throw new Error("每次最多添加 200 个词组");
  const result = new Map<string, Question>();
  for (const { text, line } of lines) {
    try {
      const parts = text.split(/[|｜]/);
      if (parts.length !== 2) throw new Error("请使用“词组 | pin yin”格式");
      const q = customQuestion(parts[0], parts[1]);
      result.set(q.id, q);
    } catch (e) {
      throw new Error(`第 ${line} 行：${(e as Error).message}`);
    }
  }
  return [...result.values()];
}
