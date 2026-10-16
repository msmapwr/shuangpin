import type { LessonId, Question } from "./encoding.ts";

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
}
export const STORAGE_KEY = "shuangjian-progress-v1";
export function emptyProgress(): Progress {
  return {
    version: 1,
    settings: { count: 20, hints: true, random: true, sound: false, goal: 40 },
    records: [],
    mistakes: {},
  };
}
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  const value = JSON.parse(raw);
  if (
    value?.version !== 1 ||
    !Array.isArray(value.records) ||
    !value.settings ||
    !value.mistakes ||
    typeof value.mistakes !== "object" ||
    Array.isArray(value.mistakes)
  )
    throw new Error("记录格式不兼容");
  const data = emptyProgress();
  for (const r of value.records) {
    if (
      typeof r.id !== "string" ||
      typeof r.date !== "string" ||
      !Number.isFinite(Date.parse(r.date)) ||
      !["initials", "finals", "zero", "syllables", "words", "review"].includes(
        r.lesson,
      ) ||
      !["total", "attempts", "correct", "seconds", "speed"].every(
        (k) => typeof r[k] === "number" && Number.isFinite(r[k]) && r[k] >= 0,
      ) ||
      r.correct > r.attempts
    )
      throw new Error("练习记录损坏");
  }
  data.records = value.records.slice(-500);
  for (const [key, m] of Object.entries(value.mistakes) as [
    string,
    Mistake,
  ][]) {
    if (
      !m?.question ||
      !["id", "label", "pinyin", "answer", "note"].every(
        (k) =>
          typeof (m.question as unknown as Record<string, unknown>)[k] ===
          "string",
      ) ||
      !/^[a-z]+$/.test(m.question.answer) ||
      !Number.isFinite(m.count) ||
      m.count < 1 ||
      typeof m.lastDate !== "string"
    )
      throw new Error("错题记录损坏");
    data.mistakes[key] = m;
  }
  data.settings = {
    count: [10, 20, 50].includes(value.settings.count)
      ? value.settings.count
      : 20,
    hints:
      typeof value.settings.hints === "boolean" ? value.settings.hints : true,
    random:
      typeof value.settings.random === "boolean" ? value.settings.random : true,
    sound:
      typeof value.settings.sound === "boolean" ? value.settings.sound : false,
    goal: [20, 40, 100].includes(value.settings.goal)
      ? value.settings.goal
      : 40,
  };
  return data;
}
export function localDay(date: string | Date = new Date()): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function accuracy(correct: number, attempts: number): number {
  return attempts ? Math.round((correct / attempts) * 100) : 100;
}
