import { lessons, type LessonId } from "./encoding.ts";
import {
  accuracy,
  localDay,
  type Progress,
  type RecordEntry,
} from "./progress.ts";

export const coreLessons = lessons.slice(0, 5);
export interface LessonSummary {
  id: LessonId;
  title: string;
  rounds: number;
  total: number;
  recentAccuracy: number | null;
}
export function lessonSummaries(records: RecordEntry[]): LessonSummary[] {
  return coreLessons.map((lesson) => {
    const rows = records
      .filter((r) => r.lesson === lesson.id)
      .reverse()
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const recent = rows.slice(0, 3),
      attempts = recent.reduce((s, r) => s + r.attempts, 0);
    return {
      id: lesson.id,
      title: lesson.title,
      rounds: rows.length,
      total: rows.reduce((s, r) => s + r.total, 0),
      recentAccuracy: attempts
        ? accuracy(
            recent.reduce((s, r) => s + r.correct, 0),
            attempts,
          )
        : null,
    };
  });
}
export interface Recommendation {
  lesson: LessonId;
  title: string;
  reason: string;
}
export function recommendation(data: Progress): Recommendation {
  const mistakeCount = Object.keys(data.mistakes).length;
  if (mistakeCount)
    return {
      lesson: "review",
      title: "先把不熟悉的，再练一遍",
      reason: `错题本有 ${mistakeCount} 个待巩固内容，一轮内每题只出现一次。`,
    };
  const summaries = lessonSummaries(data.records);
  const unstarted = summaries.find((s) => !s.rounds);
  if (unstarted)
    return {
      lesson: unstarted.id,
      title: `从${unstarted.title}开始`,
      reason:
        unstarted.id === "initials"
          ? "先建立声母与键位的对应关系，再逐步练习韵母和词组。"
          : `你还没有完成${unstarted.title}，可以沿学习路线向前一步。`,
    };
  const weakest = [...summaries]
    .filter((s) => s.recentAccuracy !== null)
    .sort((a, b) => a.recentAccuracy! - b.recentAccuracy!)[0];
  if (weakest && weakest.recentAccuracy! < 95)
    return {
      lesson: weakest.id,
      title: `再巩固一下${weakest.title}`,
      reason: `这一类最近最多三轮的按键准确率为 ${weakest.recentAccuracy}%，可以放慢速度再练一轮。`,
    };
  return {
    lesson: "words",
    title: "把键位连成自然的词组",
    reason:
      "基础课程已有练习记录。继续词组练习，或者切换盲打检验记忆；准确率不等同于掌握程度。",
  };
}
/** Calendar days, rather than fixed 24-hour intervals, survive daylight-saving changes. */
export function currentStreak(
  records: RecordEntry[],
  now = new Date(),
): number {
  const days = new Set(records.map((r) => localDay(r.date)));
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  if (!days.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(localDay(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
