import {
  questionsFor,
  questionsForArticle,
  makeQueue,
  type LessonId,
  type Question,
} from "./encoding.ts";
import type { RecordEntry } from "./progress.ts";

export type CourseMode = "guided" | "check";
export type CoursePace = "light" | "steady" | "extra";
export interface CourseAttempt {
  unitId: string;
  mode: CourseMode;
  assisted: boolean;
}
export interface CourseState {
  current: string;
  pace: CoursePace;
  read: string[];
  completed: string[];
}
export interface CourseUnit {
  id: string;
  title: string;
  summary: string;
  lesson: LessonId;
  sections: { title: string; paragraphs: string[] }[];
  examples: {
    label: string;
    pinyin: string;
    code: string;
    explanation: string;
  }[];
  homework: string;
  trouble: string;
  task: { source: LessonId; values: string[] }[];
}
export const courseUnits: CourseUnit[] = [
  {
    id: "start",
    title: "先打出「你好」",
    summary: "理解一个汉字为什么只用两个键。",
    lesson: "words",
    sections: [
      {
        title: "手指照常用，音节换一种写法",
        paragraphs: [
          "你已经知道每个字母在哪个键上。接下来要记的是：一段韵母，用哪个键代替。",
          "把「好」的 hao 拆成 h 和 ao。h 仍按 H，ao 在小鹤方案里用 C 表示，所以「好」输入 hc。「你」的 ni 拆成 n 和 i，两部分都保持原键，输入 ni。",
        ],
      },
      {
        title: "现在试一次",
        paragraphs: [
          "先在心里念一遍 ni、hao，再输入 ni hc。本站输入时不用空格，连起来就是 nihc。大小写都可以，键帽上的大写字母只是方便看。",
          "这个练习框检查英文字母，请切到英文输入状态。你暂时不需要安装或修改输入法；等规则熟悉后，再去自己的输入法里选择小鹤双拼。",
        ],
      },
    ],
    examples: [
      {
        label: "你",
        pinyin: "n + i",
        code: "ni",
        explanation: "两个字母都保留原键。",
      },
      {
        label: "好",
        pinyin: "h + ao",
        code: "hc",
        explanation: "ao 整段用 C 代替。",
      },
      {
        label: "你好",
        pinyin: "ni hao",
        code: "nihc",
        explanation: "每个字两键，按顺序连起来。",
      },
    ],
    homework:
      "先跟练「你好」。每次输入前都想清楚 ni 和 hc 的来历，再做一轮无提示验收。这里重复同一个词，是为了熟悉两键一字的节奏。",
    trouble:
      "如果总输入 hao，先停一下，把它念成 h + ao → h + c，再动手。正确后会自动进入下一题，不用按空格或回车。",
    task: [{ source: "words", values: ["你好"] }],
  },
  {
    id: "initials",
    title: "声母只多记三个键",
    summary: "zh → V，ch → I，sh → U。",
    lesson: "initials",
    sections: [
      {
        title: "先确定第一键",
        paragraphs: [
          "b、p、m、f 等单字母声母都沿用原来的字母。拼音开头写 y、w 时，本站也直接用 Y、W 作为第一键，例如 yi → yi。",
          "需要另记的是 zh、ch、sh：分别放在 V、I、U 上。看到「中」zhong，先确定第一键 V；第二键怎样选，后面学到 ong 时再练。",
        ],
      },
      {
        title: "按声母认键，不按字母猜声音",
        paragraphs: [
          "V 作为第一键时表示 zh；U 作为第一键时表示 sh。同一个键在第二个位置还会表示韵母，读法要看它在音节里的位置。",
          "这节课只练声母，所以每题按一个键。后面的汉字练习才需要两键。",
        ],
      },
    ],
    examples: [
      {
        label: "zh",
        pinyin: "zh",
        code: "v",
        explanation: "复合声母整体按 V。",
      },
      {
        label: "ch",
        pinyin: "ch",
        code: "i",
        explanation: "复合声母整体按 I。",
      },
      {
        label: "sh",
        pinyin: "sh",
        code: "u",
        explanation: "复合声母整体按 U。",
      },
    ],
    homework:
      "混合练习普通声母与 zh、ch、sh。做验收前，遮住三个对应键，确认自己能从声母想到键位。",
    trouble:
      "如果 zh 和 sh 混了，先回到有提示跟练，分别读出「zh，V」和「sh，U」，再混合练。不要把 zh 拆成两个字母键。",
    task: [
      {
        source: "initials",
        values: [
          "b",
          "p",
          "m",
          "f",
          "d",
          "t",
          "n",
          "l",
          "y",
          "w",
          "zh",
          "ch",
          "sh",
        ],
      },
    ],
  },
  {
    id: "simple",
    title: "从熟悉的单韵母开始",
    summary: "a、o、e、i、u 沿用原键，ü 用 V。",
    lesson: "finals",
    sections: [
      {
        title: "第二键表示整个韵母",
        paragraphs: [
          "a、o、e、i、u 仍按 A、O、E、I、U。比如「大」da 是 d + a，输入 da；「你」ni 是 n + i，输入 ni。",
          "ü 在本教程里可以写成 v，对应 V 键。「女」nü 输入 nv，「绿」lü 输入 lv。键盘上不用找带两点的字母。",
        ],
      },
      {
        title: "第一键和第二键分开看",
        paragraphs: [
          "刚才学过 V 作声母键表示 zh；现在 V 作韵母键还可以表示 ü。「女」的 nv 中，n 是第一键，v 是第二键，不会读成 nzh。",
          "本站遇到「单韵母」题时，只考第二键，因此每题仍只按一个键。",
        ],
      },
    ],
    examples: [
      { label: "大", pinyin: "d + a", code: "da", explanation: "a 保持 A。" },
      { label: "女", pinyin: "n + ü", code: "nv", explanation: "ü 使用 V。" },
      { label: "绿", pinyin: "l + ü", code: "lv", explanation: "先 L，后 V。" },
    ],
    homework: "把六个单韵母混合练一轮。验收时尤其留意 u 和 ü，看到 ü 才选 V。",
    trouble:
      "如果把 ü 打成 U，先比较「路」lu → lu 和「绿」lü → lv。先分清读音，再选键位。",
    task: [{ source: "finals", values: ["a", "o", "e", "i", "u", "v"] }],
  },
  {
    id: "compound",
    title: "把复韵母整段换成一个键",
    summary: "分小组记，不用一次背完整张表。",
    lesson: "finals",
    sections: [
      {
        title: "先记常见的几组",
        paragraphs: [
          "先看 ai → D、ei → W、ao → C、ou → Z，再看 iu → Q、ui → V、ie → P、ue → T。它们都只占第二键，不能把每个字母逐个打出来。",
          "例如「好」h + ao → hc，「水」sh + ui → uv。遇到不熟的韵母可以查表，查完后再试着不看答案输入一次。",
        ],
      },
      {
        title: "有些韵母共用一个键",
        paragraphs: [
          "ia 和 ua 都用 X；o 和 uo 都用 O。声母会帮助区分读音：「花」h + ua → hx，「国」g + uo → go。",
          "这一课还会练到 iao → N、uai → K，以及 er → R。er 的独立音节写法放到第六课解释，这里先认识韵母对应的键。",
        ],
      },
    ],
    examples: [
      { label: "好", pinyin: "h + ao", code: "hc", explanation: "ao → C。" },
      {
        label: "水",
        pinyin: "sh + ui",
        code: "uv",
        explanation: "sh → U，ui → V。",
      },
      { label: "花", pinyin: "h + ua", code: "hx", explanation: "ua → X。" },
      { label: "国", pinyin: "g + uo", code: "go", explanation: "uo → O。" },
    ],
    homework:
      "先跟练这一组韵母，再关提示验收。容易混的韵母先记在心里；错题本会保存你实际按错的题。",
    trouble:
      "如果韵母一长就想打全拼，先把声母留在一边，只在本课练韵母键。熟悉后再到单字练习里组合。",
    task: [
      {
        source: "finals",
        values: [
          "ai",
          "ei",
          "ao",
          "ou",
          "iu",
          "ui",
          "ie",
          "ue",
          "er",
          "ia",
          "ua",
          "uo",
          "iao",
          "uai",
        ],
      },
    ],
  },
  {
    id: "nasals",
    title: "分清前鼻音和后鼻音",
    summary: "成对比较 an / ang、en / eng、in / ing。",
    lesson: "finals",
    sections: [
      {
        title: "先确认读音里有没有 g",
        paragraphs: [
          "an → J，ang → H；en → F，eng → G；in → B，ing → K。先读清楚韵母，再选第二键。比如「拼」pin 输入 pb，「明」ming 输入 mk。",
          "如果你在全拼时就容易混淆前后鼻音，可以先看题目的拼音。双拼键位练习不会自动纠正字音判断。",
        ],
      },
      {
        title: "再加上带介音的韵母",
        paragraphs: [
          "ian → M、uan → R、un → Y。iang 和 uang 共用 L，ong 和 iong 共用 S。",
          "「双」shuang 拆成 sh + uang，得到 u + l，输入 ul。「窗」chuang 拆成 ch + uang，输入 il。拆开后，长音节也只需要两键。",
        ],
      },
    ],
    examples: [
      { label: "拼", pinyin: "p + in", code: "pb", explanation: "in → B。" },
      { label: "明", pinyin: "m + ing", code: "mk", explanation: "ing → K。" },
      {
        label: "双",
        pinyin: "sh + uang",
        code: "ul",
        explanation: "sh → U，uang → L。",
      },
      {
        label: "窗",
        pinyin: "ch + uang",
        code: "il",
        explanation: "ch → I，uang → L。",
      },
    ],
    homework:
      "按 an / ang、en / eng、in / ing 对照看一遍，再混合练全部鼻韵母。验收时慢一点，把准确率留住。",
    trouble:
      "如果只错一对鼻音，可以先到自由练习的「前鼻韵母」或「后鼻韵母」范围补练，再回来验收。",
    task: [
      {
        source: "finals",
        values: [
          "an",
          "ang",
          "en",
          "eng",
          "in",
          "ing",
          "ian",
          "uan",
          "un",
          "iang",
          "uang",
          "ong",
          "iong",
        ],
      },
    ],
  },
  {
    id: "special",
    title: "补上零声母和 ü 的写法",
    summary: "没有普通声母的字，也保留两键。",
    lesson: "syllables",
    sections: [
      {
        title: "a、o、e 开头的独立音节",
        paragraphs: [
          "只有一个字母时重复一次：a → aa，o → oo，e → ee。两个字母的独立音节 ai、ao、an、ei、en、er、ou 照原样输入，例如「爱」ai → ai。",
          "三个字母的 ang、eng 用首字母加韵母键：ang → ah，eng → eg。注意「安」an 输入 an；带声母的「天」tian 才把 ian 换成 M，输入 tm。",
        ],
      },
      {
        title: "ju、qu、xu、yu 中的 u",
        paragraphs: [
          "这些音节里的 u 按 ü 处理，第二键用 V：ju → jv，qu → qv，xu → xv，yu → yv。",
          "ue 和 üe 用 T，例如「学」xue → xt、「决」jue → jt。不要看到字母 u 就一律换成 V；「国」guo 的韵母是 uo，用 O。",
        ],
      },
    ],
    examples: [
      {
        label: "爱",
        pinyin: "ai",
        code: "ai",
        explanation: "两字母零声母，照原样输入。",
      },
      { label: "昂", pinyin: "ang", code: "ah", explanation: "a + ang 键 H。" },
      {
        label: "去",
        pinyin: "q + ü",
        code: "qv",
        explanation: "qu 中的 u 按 ü 处理。",
      },
      {
        label: "学",
        pinyin: "x + ue",
        code: "xt",
        explanation: "ue 整段用 T。",
      },
    ],
    homework:
      "混合练零声母单字与 ü 相关音节。验收时先判断有没有 a、o、e 开头的独立音节，再决定是否拆声母。",
    trouble:
      "如果独立的 an 总打成 aj，先比较「安」an → an 和「看」kan → kj。独立音节和带声母的韵母写法不同。",
    task: [
      {
        source: "zero",
        values: [
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
        ],
      },
      { source: "syllables", values: ["lv", "nv", "qu", "yu", "xue", "jue"] },
    ],
  },
  {
    id: "words",
    title: "把两键连成词组",
    summary: "每字两键，词与词之间不用插空格。",
    lesson: "words",
    sections: [
      {
        title: "从逐字想，过渡到连续输入",
        paragraphs: [
          "先在心里拆成一个个音节，再依次输入。「双拼」shuang pin → ul pb，连起来是 ulpb；「学习」xue xi → xt xi，连起来是 xtxi。",
          "刚开始可以在两个字之间稍停一下。每个字的两键选对后，再逐渐缩短停顿。本站显示的是完整编码，不练词组简码。",
        ],
      },
      {
        title: "用无提示练习检查记忆",
        paragraphs: [
          "跟练时可以看答案；验收会关掉答案和键位高亮。遇到忘记的键仍能点「显示提示」，也可以回看课程或键位表。这一轮会标为查阅过帮助，保留成绩但不算无提示验收通过。",
          "先读清楚词组，输入中按错会停留在原处。修正之后再继续，不需要从整个词头重打。退格可以撤回当前题已输入的字母。",
        ],
      },
    ],
    examples: [
      {
        label: "双拼",
        pinyin: "shuang pin",
        code: "ulpb",
        explanation: "ul + pb。",
      },
      {
        label: "学习",
        pinyin: "xue xi",
        code: "xtxi",
        explanation: "xt + xi。",
      },
      {
        label: "你好",
        pinyin: "ni hao",
        code: "nihc",
        explanation: "ni + hc。",
      },
    ],
    homework:
      "练习常用词组。验收时连续两轮达到本站建议线后，再进入短文；仍有错题时，可以先去错题本集中复习。",
    trouble:
      "如果单个字会打，连起来就乱，先按两个键为一小组输入。不要为了追上速度而跳过脑中的音节判断。",
    task: [
      {
        source: "words",
        values: [
          "你好",
          "双拼",
          "学习",
          "今天",
          "开始",
          "练习",
          "键盘",
          "输入",
          "朋友",
          "喜欢",
          "清晨",
          "女儿",
          "绿色",
          "安全",
          "平安",
          "可爱",
        ],
      },
    ],
  },
  {
    id: "sentences",
    title: "用短文接近日常输入",
    summary: "在上下文里练习，再逐步用到自己的文字里。",
    lesson: "article",
    sections: [
      {
        title: "按句子理解，按汉字输入",
        paragraphs: [
          "这节课练《晨间片刻》。先读懂一句话，再按高亮的字逐个输入。标点和换行会自动跳过，你只需要输入当前汉字的两键编码。",
          "短文会完整练一篇，不受每轮题数设置影响。需要休息就暂停；刷新后可以恢复原来的位置。",
        ],
      },
      {
        title: "把练习搬到自己的输入法",
        paragraphs: [
          "准备在日常文字中使用时，打开你当前输入法的设置，找「双拼方案」，选择「小鹤双拼」。不同输入法的入口不同，先确认名称，再用「你好」测试。安装教程和方案说明可从小鹤官网查看。",
          "先在草稿或个人笔记里写几句熟悉的话，需要赶时间时仍可以用原来的输入方式。日常输入法会处理候选字和标点；本站只检查音节编码，练习速度按有效按键计算。",
        ],
      },
    ],
    examples: [
      {
        label: "清晨",
        pinyin: "qing chen",
        code: "qkif",
        explanation: "q + ing → qk，ch + en → if。",
      },
      {
        label: "阳光",
        pinyin: "yang guang",
        code: "yhgl",
        explanation: "y + ang → yh，g + uang → gl。",
      },
    ],
    homework:
      "先有提示练完一篇，再做无提示验收。两轮达到建议线后，可以换其他短文，也可以把日常常用词加入「我的词库」。",
    trouble:
      "如果长文后半段错得多，先停下来休息，下一次从暂停的位置继续。课程进度不会因为休息而清零。",
    task: [],
  },
];

export const coursePaces = {
  light: { label: "轻量", count: 10 },
  steady: { label: "常规", count: 20 },
  extra: { label: "加练", count: 30 },
} as const;
export function getUnit(id: string): CourseUnit {
  const unit = courseUnits.find((u) => u.id === id);
  if (!unit) throw new Error("课程不存在");
  return unit;
}
export function emptyCourse(): CourseState {
  return { current: "start", pace: "steady", read: [], completed: [] };
}
export function coursePool(id: string): Question[] {
  const unit = getUnit(id);
  if (unit.lesson === "article") return questionsForArticle("morning");
  return unit.task.flatMap((task) => {
    const pool = questionsFor(task.source);
    return task.values.map((value) => {
      const q = pool.find(
        (q) => (task.source === "words" ? q.label : q.pinyin) === value,
      );
      if (!q) throw new Error("课程题目不存在");
      return q;
    });
  });
}
export function courseQueue(
  id: string,
  pace: CoursePace,
  random = true,
): Question[] {
  const unit = getUnit(id),
    pool = coursePool(id);
  return unit.lesson === "article"
    ? pool
    : makeQueue(pool, coursePaces[pace].count, random);
}
export function readCourse(value: unknown): CourseState {
  if (value === undefined) return emptyCourse();
  const v = value as CourseState;
  if (
    !v ||
    !courseUnits.some((u) => u.id === v.current) ||
    !Object.hasOwn(coursePaces, v.pace)
  )
    throw new Error("课程进度格式无效");
  for (const list of [v.read, v.completed])
    if (
      !Array.isArray(list) ||
      list.length > courseUnits.length ||
      list.some((id) => !courseUnits.some((u) => u.id === id)) ||
      new Set(list).size !== list.length
    )
      throw new Error("课程进度包含未知或重复课次");
  return {
    current: v.current,
    pace: v.pace,
    read: [...v.read],
    completed: [...v.completed],
  };
}
export function readCourseAttempt(value: unknown): CourseAttempt {
  const v = value as CourseAttempt;
  if (
    !v ||
    !courseUnits.some((u) => u.id === v.unitId) ||
    !["guided", "check"].includes(v.mode) ||
    typeof v.assisted !== "boolean" ||
    (v.mode === "guided" && !v.assisted)
  )
    throw new Error("课程练习标记无效");
  return { unitId: v.unitId, mode: v.mode, assisted: v.assisted };
}
export function validCourseQueue(
  attempt: CourseAttempt,
  lesson: LessonId,
  group: string,
  queue: Question[],
): boolean {
  const unit = getUnit(attempt.unitId),
    pool = coursePool(unit.id);
  if (
    unit.lesson !== lesson ||
    group !== (lesson === "article" ? "morning" : "all")
  )
    return false;
  if (lesson === "article")
    return (
      queue.length === pool.length && queue.every((q, i) => q.id === pool[i].id)
    );
  return (
    [10, 20, 30].includes(queue.length) &&
    queue.every((q) => pool.some((allowed) => allowed.id === q.id))
  );
}
export function courseAssessment(id: string, records: RecordEntry[]) {
  getUnit(id);
  const checks = records
    .filter((r) => r.course?.unitId === id && r.course.mode === "check")
    .reverse()
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, 2)
    .reverse();
  const qualifies = (r: RecordEntry) =>
    !r.course!.assisted && r.correct / r.attempts >= 0.95;
  const latest = checks.at(-1);
  const passed = checks.length === 2 && checks.every(qualifies);
  const action = passed
    ? "next"
    : latest &&
        (latest.course!.assisted || latest.correct / latest.attempts < 0.9)
      ? "guided"
      : "check";
  const reason = passed
    ? "连续两轮无提示验收达到 95%，可以继续下一课。"
    : !latest
      ? "读完后先跟练，准备好再做无提示验收。"
      : latest.course!.assisted
        ? "这轮查看过提示或学习资料。先跟练一轮，再试一次无提示验收。"
        : latest.correct / latest.attempts < 0.9
          ? "这轮准确率低于 90%，先回到跟练，把常错的键找准。"
          : qualifies(latest)
            ? "这轮已达到 95%，再做一轮无提示验收，确认记得住。"
            : "这轮还没到 95%。放慢一点，再练一轮；也可以先回看本课例子。";
  return { passed, action, reason, checks, latest };
}
