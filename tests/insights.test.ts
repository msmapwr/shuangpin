import test from "node:test";
import assert from "node:assert/strict";
import {
  lessonSummaries,
  recommendation,
  currentStreak,
} from "../src/insights.ts";
import { emptyProgress, type RecordEntry } from "../src/progress.ts";
import { questionsFor, type LessonId } from "../src/encoding.ts";
const row = (
  id: string,
  lesson: LessonId,
  correct = 10,
  attempts = 10,
  date = "2026-10-17T01:00:00.000Z",
): RecordEntry => ({
  id,
  lesson,
  correct,
  attempts,
  date,
  total: 1,
  seconds: 20,
  speed: 30,
});
test("lesson summaries weight the latest three rounds and leave missing metrics empty", () => {
  const records = [
    row("a", "initials", 1, 1, "2026-10-13T01:00:00Z"),
    row("b", "initials", 1, 10, "2026-10-14T01:00:00Z"),
    row("c", "initials", 9, 10, "2026-10-15T01:00:00Z"),
    row("d", "initials", 90, 100, "2026-10-16T01:00:00Z"),
  ];
  const before = JSON.stringify(records),
    summaries = lessonSummaries(records);
  assert.equal(summaries[0].recentAccuracy, 83);
  assert.equal(summaries[0].rounds, 4);
  assert.equal(summaries[0].total, 4);
  assert.equal(summaries[1].recentAccuracy, null);
  assert.equal(summaries[1].rounds, 0);
  assert.equal(JSON.stringify(records), before);
});
test("same-timestamp summaries still prefer the last appended rounds", () => {
  const records = [
    row("a", "initials", 1, 100),
    row("b", "initials"),
    row("c", "initials"),
    row("d", "initials"),
  ];
  assert.equal(lessonSummaries(records)[0].recentAccuracy, 100);
});
test("recommendations prioritize active mistakes, then an unstarted stage", () => {
  const data = emptyProgress();
  assert.equal(recommendation(data).lesson, "initials");
  data.records = [row("one", "initials", 5, 10)];
  assert.equal(recommendation(data).lesson, "finals");
  const q = questionsFor("initials")[0];
  data.mistakes[q.id] = {
    question: q,
    count: 2,
    lastDate: "2026-10-17T01:00:00Z",
  };
  assert.equal(recommendation(data).lesson, "review");
  assert.match(recommendation(data).reason, /1 个/);
});
test("after all stages recommendations use the weakest recent accuracy or continue words", () => {
  const data = emptyProgress();
  data.records = (
    ["initials", "finals", "zero", "syllables", "words"] as LessonId[]
  ).map((l, i) => row(String(i), l, l === "finals" ? 8 : 10, 10));
  assert.equal(recommendation(data).lesson, "finals");
  assert.match(recommendation(data).reason, /80%/);
  data.records[1].correct = 10;
  assert.equal(recommendation(data).lesson, "words");
  assert.match(recommendation(data).reason, /不等同于掌握/);
});
test("practice streaks use distinct calendar days ending today or yesterday and stop at gaps", () => {
  const now = new Date(2026, 9, 17, 12);
  const day = (d: number) =>
    row(String(d), "initials", 10, 10, new Date(2026, 9, d, 12).toISOString());
  assert.equal(currentStreak([], now), 0);
  assert.equal(currentStreak([day(14), day(15), day(16), day(16)], now), 3);
  assert.equal(currentStreak([day(14), day(15), day(16), day(17)], now), 4);
  assert.equal(currentStreak([day(14), day(16)], now), 1);
  assert.equal(currentStreak([day(14)], now), 0);
  assert.equal(currentStreak([day(18)], now), 0);
});
