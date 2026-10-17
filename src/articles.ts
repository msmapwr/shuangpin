import type { Question } from "./encoding.ts";

export interface Article {
  id: string;
  title: string;
  description: string;
  paragraphs: { text: string; pinyin: string }[];
}
/** Original passages with explicit readings; punctuation is context, not input. */
export const articles: Article[] = [
  {
    id: "morning",
    title: "晨间片刻",
    description: "从清晨的书桌，开始一天的练习。",
    paragraphs: [
      {
        text: "清晨，阳光穿过窗户，落在安静的书桌上。",
        pinyin:
          "qing chen yang guang chuan guo chuang hu luo zai an jing de shu zhuo shang",
      },
      {
        text: "我打开电脑，先练习声母和韵母，再把熟悉的词组连成句子。",
        pinyin:
          "wo da kai dian nao xian lian xi sheng mu he yun mu zai ba shu xi de ci zu lian cheng ju zi",
      },
      {
        text: "每天留一点时间，让双手慢慢记住键盘的位置。",
        pinyin:
          "mei tian liu yi dian shi jian rang shuang shou man man ji zhu jian pan de wei zhi",
      },
    ],
  },
  {
    id: "forest",
    title: "林间散步",
    description: "跟着清风和鸟鸣，把输入节奏放慢。",
    paragraphs: [
      {
        text: "午后，我们沿着小路走进森林。",
        pinyin: "wu hou wo men yan zhe xiao lu zou jin sen lin",
      },
      {
        text: "清风吹过树叶，远处传来鸟鸣。",
        pinyin: "qing feng chui guo shu ye yuan chu chuan lai niao ming",
      },
      {
        text: "放慢脚步，看看蓝天和白云，也让心里的声音安静下来。",
        pinyin:
          "fang man jiao bu kan kan lan tian he bai yun ye rang xin li de sheng yin an jing xia lai",
      },
    ],
  },
  {
    id: "workday",
    title: "工作日记",
    description: "在熟悉的日常表达中，连接完整句子。",
    paragraphs: [
      {
        text: "今天，我把需要完成的事情写下来。",
        pinyin: "jin tian wo ba xu yao wan cheng de shi qing xie xia lai",
      },
      {
        text: "先解决一个小问题，再认真检查结果。",
        pinyin: "xian jie jue yi ge xiao wen ti zai ren zhen jian cha jie guo",
      },
      {
        text: "遇到不熟悉的词，就停一下，想清楚以后再输入。",
        pinyin:
          "yu dao bu shu xi de ci jiu ting yi xia xiang qing chu yi hou zai shu ru",
      },
    ],
  },
  {
    id: "steady",
    title: "学习与坚持",
    description: "先把音节打准确，再一点点连贯起来。",
    paragraphs: [
      {
        text: "学习新的输入方式，不必一开始就追求速度。",
        pinyin:
          "xue xi xin de shu ru fang shi bu bi yi kai shi jiu zhui qiu su du",
      },
      {
        text: "先把每个音节打准确，再慢慢连起来。",
        pinyin: "xian ba mei ge yin jie da zhun que zai man man lian qi lai",
      },
      {
        text: "今天比昨天熟悉一点，就是看得见的进步。",
        pinyin:
          "jin tian bi zuo tian shu xi yi dian jiu shi kan de jian de jin bu",
      },
    ],
  },
];
export function getArticle(id: string): Article {
  const article = articles.find((a) => a.id === id);
  if (!article) throw new Error("短文不存在");
  return article;
}
export function articleTokens(
  id: string,
): { text: string; index: number | null; pinyin: string }[] {
  let index = 0;
  return getArticle(id).paragraphs.flatMap((paragraph, paragraphIndex) => {
    const syllables = paragraph.pinyin.split(/\s+/);
    let syllableIndex = 0;
    const tokens = [...paragraph.text].map((text) => {
      if (!/\p{Script=Han}/u.test(text))
        return { text, index: null, pinyin: "" };
      return { text, index: index++, pinyin: syllables[syllableIndex++] };
    });
    if (syllableIndex !== syllables.length)
      throw new Error("短文与拼音数量不一致");
    return paragraphIndex
      ? [{ text: "\n", index: null, pinyin: "" }, ...tokens]
      : tokens;
  });
}
export function buildArticleQuestions(
  id: string,
  encode: (pinyin: string) => string,
): Question[] {
  const article = getArticle(id);
  return articleTokens(id)
    .filter((t) => t.index !== null)
    .map((t) => ({
      id: `article-${id}-${t.index}`,
      label: t.text,
      pinyin: t.pinyin,
      answer: encode(t.pinyin),
      note: `《${article.title}》第 ${t.index! + 1} 字：输入当前字的完整双拼编码。`,
    }));
}
