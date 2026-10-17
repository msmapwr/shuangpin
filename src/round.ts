import {
  lessons,
  questionsFor,
  type LessonId,
  type Question,
} from "./encoding.ts";
import { readQuestion } from "./progress.ts";
import { filterQuestions, groupsFor } from "./training.ts";

export const ROUND_KEY = "shuangjian-active-round-v1";
export interface RoundSnapshot {
  version: 1;
  id: string;
  lessonId: LessonId;
  group: string;
  queue: Question[];
  index: number;
  typed: string;
  attempts: number;
  correct: number;
  completedKeys: number;
  streak: number;
  bestStreak: number;
  questionWrong: boolean;
  revealed: boolean;
  elapsed: number;
  updatedAt: string;
}
export function parseRound(
  raw: string | null,
  completedIds: ReadonlySet<string> = new Set(),
): RoundSnapshot | null {
  if (raw === null) return null;
  if (raw.length > 100000) throw new Error("未完成练习数据过大");
  const s = JSON.parse(raw);
  if (
    !s ||
    s.version !== 1 ||
    typeof s.id !== "string" ||
    !s.id.length ||
    s.id.length > 128
  )
    throw new Error("未完成练习格式不兼容");
  if (completedIds.has(s.id)) return null;
  if (
    !lessons.some((l) => l.id === s.lessonId) ||
    !groupsFor(s.lessonId).some((g) => g.id === s.group) ||
    !Array.isArray(s.queue) ||
    s.queue.length < 1 ||
    s.queue.length > 50
  )
    throw new Error("未完成练习内容无效");
  const queue = s.queue.map(readQuestion) as Question[];
  if (
    s.lessonId === "review" &&
    new Set(queue.map((q) => q.id)).size !== queue.length
  )
    throw new Error("错题复习包含重复题目");
  if (s.lessonId === "custom" && queue.some((q) => !q.id.startsWith("custom-")))
    throw new Error("自定义练习内容无效");
  if (s.lessonId !== "custom" && s.lessonId !== "review") {
    const allowed = new Set(questionsFor(s.lessonId).map((q) => q.id));
    if (
      queue.some((q) => !allowed.has(q.id)) ||
      filterQuestions(s.lessonId, s.group, queue).length !== queue.length
    )
      throw new Error("题目不属于当前练习范围");
  }
  const ints = [
    "index",
    "attempts",
    "correct",
    "completedKeys",
    "streak",
    "bestStreak",
  ];
  if (
    ints.some((k) => !Number.isSafeInteger(s[k]) || s[k] < 0) ||
    s.index >= queue.length ||
    s.attempts < 1 ||
    s.correct > s.attempts ||
    typeof s.typed !== "string" ||
    !queue[s.index].answer.startsWith(s.typed) ||
    s.typed.length >= queue[s.index].answer.length
  )
    throw new Error("练习进度计数无效");
  const completedKeys = queue
    .slice(0, s.index)
    .reduce((sum, q) => sum + q.answer.length, 0);
  if (
    s.completedKeys !== completedKeys ||
    s.correct < completedKeys + s.typed.length ||
    s.streak > s.bestStreak ||
    s.bestStreak > s.index ||
    typeof s.questionWrong !== "boolean" ||
    typeof s.revealed !== "boolean" ||
    typeof s.elapsed !== "number" ||
    !Number.isFinite(s.elapsed) ||
    s.elapsed < 0 ||
    typeof s.updatedAt !== "string" ||
    !Number.isFinite(Date.parse(s.updatedAt))
  )
    throw new Error("练习进度状态无效");
  return {
    version: 1,
    id: s.id,
    lessonId: s.lessonId,
    group: s.group,
    queue,
    index: s.index,
    typed: s.typed,
    attempts: s.attempts,
    correct: s.correct,
    completedKeys,
    streak: s.streak,
    bestStreak: s.bestStreak,
    questionWrong: s.questionWrong,
    revealed: s.revealed,
    elapsed: s.elapsed,
    updatedAt: s.updatedAt,
  };
}
