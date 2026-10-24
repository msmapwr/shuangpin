import { rowFinals } from "./keymap.ts";
import type { CourseUnit } from "./course.ts";

const task = (values: string[]) => [{ source: "finals" as const, values }];
export const memoryUnits: CourseUnit[] = [
  {
    id: "memory-top",
    title: "键位速记：上排 Q 到 P",
    summary: "用联想字记住一排键，再遮住表回想。",
    lesson: "finals",
    sections: [
      {
        title: "先把字音和位置连起来",
        paragraphs: [
          "从左到右看：秋 iu → Q，微 ei → W，鹅 e → E，软 uan → R，雪 ue → T，云 un → Y。先读一遍联想字，再说出韵母和键位。",
          "后半排是 u → U、i → I、o / uo → O、ie → P。R 还放着 er，T 同时表示 ue / üe。遇到共用键，先记在一起。",
        ],
      },
      {
        title: "看过以后，反过来想一次",
        paragraphs: [
          "点键帽可以看示例。看完把视线移开，问自己「iu 放哪？」「ie 放哪？」。想不起来再看一次，不必从 Q 一路背到目标键。",
          "U、I 作第二键时分别是 u、i；作第一键时分别表示 sh、ch。读「树」shu 时，sh + u → uu，两个位置的含义不同。",
        ],
      },
    ],
    examples: [
      {
        label: "秋",
        pinyin: "q + iu",
        code: "qq",
        explanation: "用秋的 iu 联想 Q。",
      },
      {
        label: "雪",
        pinyin: "x + ue",
        code: "xt",
        explanation: "ue 整段用 T。",
      },
      { label: "撇", pinyin: "p + ie", code: "pp", explanation: "ie 放在 P。" },
    ],
    homework:
      "先看表跟练上排韵母，再做无提示验收。每题显示韵母，只按对应的一个键。",
    trouble:
      "如果知道联想字，却要从左往右背很久才能找到键，单独抽问那个韵母，尝试直接想到字母键。",
    task: task(rowFinals(0)),
  },
  {
    id: "memory-home",
    title: "键位速记：中排 A 到 L",
    summary: "把鼻韵母成对记，再记共用键。",
    lesson: "finals",
    sections: [
      {
        title: "先记中排的单键联想",
        paragraphs: [
          "a → A，松的 ong → S，呆的 ai → D，分的 en → F，风的 eng → G，航的 ang → H，an → J。en / eng 是 F / G，an / ang 是 J / H。",
          "这一排比较密，可以先只记 F、G、H、J。看到 en、eng、ang、an 时，分别想清楚有没有 g，再选键。",
        ],
      },
      {
        title: "三个共用键一起记",
        paragraphs: [
          "S 放 ong / iong，K 放 ing / uai，L 放 iang / uang。比如「快」kuai → kk，「凉」liang → ll，「光」guang → gl。",
          "共用一个键不需要加按键。练完整汉字时，第一键的声母与第二键的韵母合在一起确定音节。",
        ],
      },
    ],
    examples: [
      { label: "分", pinyin: "f + en", code: "ff", explanation: "en → F。" },
      { label: "风", pinyin: "f + eng", code: "fg", explanation: "eng → G。" },
      {
        label: "快",
        pinyin: "k + uai",
        code: "kk",
        explanation: "uai 和 ing 都在 K。",
      },
      {
        label: "凉",
        pinyin: "l + iang",
        code: "ll",
        explanation: "iang 和 uang 都在 L。",
      },
    ],
    homework:
      "混合练中排韵母。先读清 en / eng、an / ang，再去找 F / G、J / H。",
    trouble: "若总在两键之间犹豫，把那一对读音并排比较，再回来做本课练习。",
    task: task(rowFinals(1)),
  },
  {
    id: "memory-bottom",
    title: "键位速记：下排 Z 到 M",
    summary: "走、虾、草、宾、鸟、面，逐个连到键位。",
    lesson: "finals",
    sections: [
      {
        title: "用熟悉的字记韵母",
        paragraphs: [
          "走的 ou → Z，虾的 ia → X，草的 ao → C，宾的 in → B，鸟的 iao → N，面的 ian → M。X 还放 ua，可以把「虾」和「花」一起想。",
          "iao 是 N，ian 是 M。看到最后的 o 或 n，先分清韵母，再选相邻的键。",
        ],
      },
      {
        title: "V 要分声母和韵母",
        paragraphs: [
          "V 作第二键时表示 ü（可写 v）或 ui：「女」nü → nv，「水」shui → uv。V 作第一键时表示 zh，例如「中」zhong → vs。",
          "课后题里的 ü 只需要按 V。等练完整汉字时，再按声母键加韵母键。",
        ],
      },
    ],
    examples: [
      { label: "走", pinyin: "z + ou", code: "zz", explanation: "ou → Z。" },
      { label: "鸟", pinyin: "n + iao", code: "nn", explanation: "iao → N。" },
      { label: "面", pinyin: "m + ian", code: "mm", explanation: "ian → M。" },
      {
        label: "水",
        pinyin: "sh + ui",
        code: "uv",
        explanation: "sh → U，ui → V。",
      },
    ],
    homework:
      "跟练下排韵母，再关闭提示验收。留意 ia / ua 共用 X，ü / ui 共用 V。",
    trouble:
      "若把 in、iao、ian 混在一起，先分别记「宾 B、鸟 N、面 M」，再打乱顺序抽问。",
    task: task(rowFinals(2)),
  },
  {
    id: "memory-pairs",
    title: "键位速记：易混键对照",
    summary: "分开读音不同的键，合记使用同一个键的韵母。",
    lesson: "finals",
    sections: [
      {
        title: "先比较容易按错的邻近键",
        paragraphs: [
          "en → F / eng → G；an → J / ang → H；in → B / ing → K；iao → N / ian → M。每次先说出完整韵母，再按键。",
          "别只记两组里有同样的字母。en 和 eng 多了一个 g，键也从 F 换到 G。",
        ],
      },
      {
        title: "共用键放在同一格里看",
        paragraphs: [
          "ia / ua → X，iang / uang → L，ong / iong → S，ing / uai → K，ü / ui → V，o / uo → O，ue / üe → T。同一格里的韵母不需要额外区分键位。",
          "这节课专练对照组。错过的题会进入错题本，可以集中复习。",
        ],
      },
    ],
    examples: [
      { label: "拼", pinyin: "p + in", code: "pb", explanation: "in 用 B。" },
      { label: "明", pinyin: "m + ing", code: "mk", explanation: "ing 用 K。" },
      { label: "鸟", pinyin: "n + iao", code: "nn", explanation: "iao 用 N。" },
      { label: "面", pinyin: "m + ian", code: "mm", explanation: "ian 用 M。" },
    ],
    homework:
      "混合练易混韵母。验收时先确认读音，再按键；还会犹豫就回看本课对照组。",
    trouble:
      "如果某一对连续出错，暂停读两遍对应关系，再跟练。不要用连按两个可能的键来试答案。",
    task: task([
      "en",
      "eng",
      "an",
      "ang",
      "in",
      "ing",
      "iao",
      "ian",
      "ia",
      "ua",
      "iang",
      "uang",
      "ong",
      "iong",
      "uai",
      "v",
      "ui",
      "o",
      "uo",
      "ue",
    ]),
  },
  {
    id: "memory-all",
    title: "键位速记：整表检验",
    summary: "每个韵母出现一次，检查整张表是否有遗漏。",
    lesson: "finals",
    fullPool: true,
    sections: [
      {
        title: "先检查三个声母特例",
        paragraphs: [
          "zh → V，ch → I，sh → U。单字母声母沿用原键。它们决定汉字的第一键。",
          "下面的整表练习只检查韵母键。声母还不熟时，可回到「声母只多记三个键」补练。",
        ],
      },
      {
        title: "整表验收前，遮住键位表",
        paragraphs: [
          "先在心里回想三排键位。遇到忘记的韵母，先尝试用联想字找回；想不起来可以看提示，这轮会记录为查阅过帮助。",
          "整表每轮覆盖全部韵母，随机出题，每个韵母一次。ue / üe 作为同一项练习，不另外重复。练习量设置不缩短整表轮次。",
        ],
      },
    ],
    examples: [
      {
        label: "双",
        pinyin: "sh + uang",
        code: "ul",
        explanation: "第一键 U，第二键 L。",
      },
      { label: "学", pinyin: "x + ue", code: "xt", explanation: "ue 用 T。" },
      { label: "女", pinyin: "n + ü", code: "nv", explanation: "ü 用 V。" },
    ],
    homework:
      "先跟练一轮整表，再无提示验收。完成后按结果决定继续词组练习，或返回不熟悉的一排键。",
    trouble:
      "错题集中在某一排，就回到那一课；只混一两对，则回到「易混键对照」。已有课程进度会保留。",
    task: task([0, 1, 2].flatMap(rowFinals)),
  },
];
