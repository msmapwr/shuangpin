import {
  lessons,
  questionsFor,
  type LessonId,
  type Question,
} from "./encoding.ts";
import { customQuestion, MAX_CUSTOM_WORDS } from "./training.ts";

export interface Settings {
  count: number;
  hints: boolean;
  random: boolean;
  sound: boolean;
  goal: number;
}
export interface RecordEntry {
  id: string;
  date: string;
  lesson: LessonId;
  total: number;
  attempts: number;
  correct: number;
  seconds: number;
  speed: number;
}
export interface Mistake {
  question: Question;
  count: number;
  lastDate: string;
}
export interface Progress {
  version: 1;
  settings: Settings;
  records: RecordEntry[];
  mistakes: Record<string, Mistake>;
  customWords: Question[];
}
export const STORAGE_KEY = "shuangjian-progress-v1";
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export function emptyProgress(): Progress {
  return {
    version: 1,
    settings: { count: 20, hints: true, random: true, sound: false, goal: 40 },
    records: [],
    mistakes: {},
    customWords: [],
  };
}

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function shortText(value: unknown, max = 200): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}
function date(value: unknown): value is string {
  return shortText(value, 40) && Number.isFinite(Date.parse(value));
}
const builtins = ["initials", "finals", "zero", "syllables", "words"].flatMap(
  (id) => questionsFor(id as LessonId),
);
function readQuestion(value: unknown): Question {
  if (
    !object(value) ||
    !shortText(value.id) ||
    !shortText(value.label, 80) ||
    !shortText(value.pinyin, 80) ||
    !shortText(value.answer, 40)
  )
    throw new Error("题目数据不完整");
  if (value.id.startsWith("custom-")) {
    const q = customQuestion(value.label, value.pinyin);
    if (q.id !== value.id || q.answer !== value.answer)
      throw new Error("自定义词组的编码与拼音不匹配");
    return q;
  }
  const q = builtins.find(
    (q) =>
      q.id === value.id &&
      q.label === value.label &&
      q.pinyin === value.pinyin &&
      q.answer === value.answer,
  );
  if (!q) throw new Error("备份包含未知题目或不正确的双拼编码");
  return { ...q };
}

/** Read v1 backups additively: older exports need no migration or rewriting. */
export function parseProgress(raw: string | null): Progress {
  if (raw === null) return emptyProgress();
  if (raw.length > MAX_IMPORT_BYTES) throw new Error("备份过大，最大支持 2 MB");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("文件不是有效的 JSON 备份");
  }
  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.records) ||
    !object(value.settings) ||
    !object(value.mistakes)
  )
    throw new Error("记录格式不兼容，请选择双键导出的 JSON 文件");
  if (value.records.length > 500 || Object.keys(value.mistakes).length > 1000)
    throw new Error("记录数量超出支持范围");
  const data = emptyProgress();
  const recordIds = new Set<string>();
  for (const r of value.records) {
    if (
      !object(r) ||
      !shortText(r.id, 128) ||
      !date(r.date) ||
      !lessons.some((l) => l.id === r.lesson) ||
      !["total", "attempts", "correct", "seconds", "speed"].every(
        (k) => typeof r[k] === "number" && Number.isFinite(r[k]) && r[k] >= 0,
      ) ||
      ![r.total, r.attempts, r.correct, r.speed].every(Number.isSafeInteger) ||
      Number(r.total) < 1 ||
      Number(r.correct) > Number(r.attempts) ||
      Number(r.total) > Number(r.correct) ||
      recordIds.has(r.id)
    )
      throw new Error("练习记录损坏或包含重复编号");
    recordIds.add(r.id);
    data.records.push({
      id: r.id,
      date: r.date,
      lesson: r.lesson as LessonId,
      total: r.total as number,
      attempts: r.attempts as number,
      correct: r.correct as number,
      seconds: r.seconds as number,
      speed: r.speed as number,
    });
  }
  if (value.customWords !== undefined) {
    if (
      !Array.isArray(value.customWords) ||
      value.customWords.length > MAX_CUSTOM_WORDS
    )
      throw new Error("自定义词库最多支持 200 个词组");
    const ids = new Set<string>();
    for (const q of value.customWords) {
      const parsed = readQuestion(q);
      if (!parsed.id.startsWith("custom-"))
        throw new Error("自定义词库包含非自定义题目");
      if (!ids.has(parsed.id)) {
        ids.add(parsed.id);
        data.customWords.push(parsed);
      }
    }
  }
  for (const [key, m] of Object.entries(value.mistakes)) {
    if (
      !object(m) ||
      !Number.isSafeInteger(m.count) ||
      Number(m.count) < 1 ||
      !date(m.lastDate)
    )
      throw new Error("错题记录损坏");
    const question = readQuestion(m.question);
    if (key !== question.id) throw new Error("错题编号与题目不匹配");
    data.mistakes[key] = {
      question,
      count: m.count as number,
      lastDate: m.lastDate,
    };
  }
  const s = value.settings;
  data.settings = {
    count:
      [10, 20, 50].includes(Number(s.count)) && typeof s.count === "number"
        ? s.count
        : 20,
    hints: typeof s.hints === "boolean" ? s.hints : true,
    random: typeof s.random === "boolean" ? s.random : true,
    sound: typeof s.sound === "boolean" ? s.sound : false,
    goal:
      [20, 40, 100].includes(Number(s.goal)) && typeof s.goal === "number"
        ? s.goal
        : 40,
  };
  return data;
}

/** Idempotent union: importing one snapshot twice never doubles its totals. */
export function mergeProgress(
  local: Progress,
  incoming: Progress,
  restoreSettings = false,
): Progress {
  const result = emptyProgress();
  result.settings = {
    ...(restoreSettings ? incoming.settings : local.settings),
  };
  const records = new Map(local.records.map((r) => [r.id, r]));
  for (const record of incoming.records) {
    const previous = records.get(record.id);
    if (
      previous &&
      (
        [
          "date",
          "lesson",
          "total",
          "attempts",
          "correct",
          "seconds",
          "speed",
        ] as const
      ).some((k) => previous[k] !== record[k])
    )
      throw new Error("备份与本机存在同编号但内容不同的记录，已取消合并");
    records.set(record.id, { ...record });
  }
  result.records = [...records.values()]
    .sort(
      (a, b) =>
        Date.parse(a.date) - Date.parse(b.date) || a.id.localeCompare(b.id),
    )
    .slice(-500);
  const words = new Map(
    [...local.customWords, ...incoming.customWords].map((q) => [q.id, q]),
  );
  if (words.size > MAX_CUSTOM_WORDS)
    throw new Error("合并后自定义词组超过 200 个，请先整理词库");
  result.customWords = [...words.values()].map((q) => ({ ...q }));
  for (const source of [local.mistakes, incoming.mistakes])
    for (const [id, m] of Object.entries(source)) {
      const previous = result.mistakes[id];
      result.mistakes[id] = {
        question: { ...m.question },
        count: Math.max(previous?.count ?? 0, m.count),
        lastDate:
          previous && Date.parse(previous.lastDate) > Date.parse(m.lastDate)
            ? previous.lastDate
            : m.lastDate,
      };
    }
  return result;
}
export function localDay(date: string | Date = new Date()): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function accuracy(correct: number, attempts: number): number {
  return attempts ? Math.round((correct / attempts) * 100) : 100;
}
