import test from "node:test";
import assert from "node:assert/strict";
import {
  courseUnits,
  coursePool,
  courseQueue,
  courseAssessment,
  emptyCourse,
  readCourse,
  readCourseAttempt,
  validCourseQueue,
} from "../src/course.ts";
import {
  INITIALS,
  encodePhrase,
  encodeSyllable,
  type LessonId,
} from "../src/encoding.ts";
import {
  emptyProgress,
  parseProgress,
  mergeProgress,
  readQuestion,
  type RecordEntry,
} from "../src/progress.ts";
import { parseRound, type RoundSnapshot } from "../src/round.ts";
const record = (
  id: string,
  unitId = "initials",
  correct = 19,
  attempts = 20,
  mode: "guided" | "check" = "check",
  assisted = false,
): RecordEntry => ({
  id,
  date: "2026-10-18T02:00:00Z",
  lesson: unitId === "initials" ? "initials" : "words",
  total: 10,
  attempts,
  correct,
  seconds: 10,
  speed: 60,
  course: { unitId, mode, assisted },
});

test("course examples teach verified Flypy codes and every task is a canonical nonempty question", () => {
  assert.equal(courseUnits.length, 8);
  for (const unit of courseUnits) {
    for (const example of unit.examples) {
      const expected =
        unit.id === "initials"
          ? INITIALS[example.pinyin]
          : example.pinyin.includes("+")
            ? encodeSyllable(example.pinyin.replace(/\s*\+\s*/g, ""))
            : encodePhrase(example.pinyin);
      assert.equal(example.code, expected, `${unit.title}: ${example.label}`);
    }
    const pool = coursePool(unit.id);
    assert.ok(pool.length > 0);
    for (const q of pool) assert.deepEqual(readQuestion(q), q);
    for (const pace of ["light", "steady", "extra"] as const) {
      const queue = courseQueue(unit.id, pace, false);
      assert.equal(
        queue.length,
        unit.id === "sentences"
          ? 59
          : { light: 10, steady: 20, extra: 30 }[pace],
      );
      assert.equal(
        validCourseQueue(
          { unitId: unit.id, mode: "check", assisted: false },
          unit.lesson,
          unit.lesson === "article" ? "morning" : "all",
          queue,
        ),
        true,
      );
    }
  }
  assert.equal(coursePool("start")[0].answer, "nihc");
  assert.ok(coursePool("special").some((q) => q.answer === "ah"));
  assert.ok(coursePool("special").some((q) => q.answer === "qv"));
  assert.throws(() => coursePool("unknown"));
});
test("assessment requires the latest two unassisted checks at the raw ninety-five percent boundary", () => {
  assert.equal(courseAssessment("initials", []).action, "check");
  assert.equal(courseAssessment("initials", [record("1")]).passed, false);
  assert.equal(
    courseAssessment("initials", [record("1"), record("2")]).passed,
    true,
  );
  assert.equal(
    courseAssessment("initials", [
      record("1"),
      record("2", "initials", 189, 200),
    ]).passed,
    false,
  );
  assert.equal(
    courseAssessment("initials", [
      record("1"),
      record("2", "initials", 190, 200),
    ]).passed,
    true,
  );
  assert.equal(
    courseAssessment("initials", [record("1"), record("2", "initials", 10, 20)])
      .action,
    "guided",
  );
  assert.equal(
    courseAssessment("initials", [record("1"), record("2", "initials", 18, 20)])
      .action,
    "check",
  );
  const newest = {
    ...record("recent-low", "initials", 10, 20),
    date: "2026-10-19T02:00:00Z",
  };
  assert.equal(
    courseAssessment("initials", [newest, record("old-1"), record("old-2")])
      .passed,
    false,
  );
});
test("guided, assisted, unrelated and interrupted qualifying streaks cannot pass a course", () => {
  const first = record("1");
  assert.equal(
    courseAssessment("initials", [
      first,
      record("2", "initials", 20, 20, "check", true),
    ]).action,
    "guided",
  );
  assert.equal(
    courseAssessment("initials", [
      first,
      record("2", "initials", 20, 20, "guided", true),
    ]).passed,
    false,
  );
  assert.equal(
    courseAssessment("initials", [first, record("2", "words", 40, 40)]).passed,
    false,
  );
  const interrupted = [first, record("2", "initials", 15, 20), record("3")];
  assert.equal(courseAssessment("initials", interrupted).passed, false);
  assert.equal(
    courseAssessment("initials", [...interrupted, record("4")]).passed,
    true,
  );
});
test("course state validates known IDs, unique progress lists, pace and assistance", () => {
  assert.deepEqual(readCourse(undefined), emptyCourse());
  for (const change of [
    { current: "bad" },
    { pace: "fast" },
    { pace: "constructor" },
    { read: ["start", "start"] },
    { completed: ["bad"] },
    { read: "start" },
  ])
    assert.throws(() => readCourse({ ...emptyCourse(), ...change }));
  for (const value of [
    null,
    { unitId: "bad", mode: "check", assisted: false },
    { unitId: "start", mode: "guided", assisted: false },
    { unitId: "start", mode: "check", assisted: "false" },
    { unitId: "start", mode: "random", assisted: false },
  ])
    assert.throws(() => readCourseAttempt(value));
});
test("legacy backups gain empty course progress and merges preserve achievements and settings choices", () => {
  const local = emptyProgress(),
    incoming = emptyProgress();
  const legacy = { ...local } as { course?: unknown };
  delete legacy.course;
  assert.deepEqual(parseProgress(JSON.stringify(legacy)).course, emptyCourse());
  local.course = {
    current: "nasals",
    pace: "light",
    read: ["start"],
    completed: ["start"],
  };
  incoming.course = {
    current: "words",
    pace: "extra",
    read: ["words", "start"],
    completed: ["initials"],
  };
  const merged = mergeProgress(local, incoming);
  assert.equal(merged.course.current, "nasals");
  assert.equal(merged.course.pace, "light");
  assert.deepEqual(merged.course.completed, ["start", "initials"]);
  assert.deepEqual(merged.course.read, ["start", "words"]);
  assert.deepEqual(mergeProgress(merged, incoming), merged);
  assert.equal(mergeProgress(local, incoming, true).course.current, "words");
  assert.deepEqual(parseProgress(JSON.stringify(merged)), merged);
});
test("course records round-trip and reject metadata conflicts or impossible homework totals", () => {
  const data = emptyProgress();
  data.records = [record("1")];
  assert.deepEqual(parseProgress(JSON.stringify(data)), data);
  for (const change of [
    { total: 11 },
    { lesson: "finals" },
    { course: { unitId: "initials", mode: "guided", assisted: false } },
  ])
    assert.throws(() =>
      parseProgress(
        JSON.stringify({
          ...data,
          records: [{ ...data.records[0], ...change }],
        }),
      ),
    );
  const incoming = structuredClone(data);
  incoming.records[0].course!.assisted = true;
  assert.throws(() => mergeProgress(data, incoming), /同编号/);
  const impossible = record("2", "start", 10, 10);
  assert.throws(
    () => parseProgress(JSON.stringify({ ...data, records: [impossible] })),
    /课后/,
  );
});
const snapshot = (unitId = "special"): RoundSnapshot => {
  const queue = courseQueue(unitId, "light", false),
    first = queue[0];
  return {
    version: 1,
    id: "course-round",
    lessonId: unitId === "sentences" ? "article" : "syllables",
    group: unitId === "sentences" ? "morning" : "all",
    queue,
    index: 0,
    typed: first.answer[0],
    attempts: 1,
    correct: 1,
    completedKeys: 0,
    streak: 0,
    bestStreak: 0,
    questionWrong: false,
    revealed: false,
    elapsed: 2,
    updatedAt: "2026-10-18T02:00:00Z",
    course: { unitId, mode: "check", assisted: false },
  };
};
test("mixed special-rule homework resumes while forged scope, mode and assistance are rejected", () => {
  const s = snapshot();
  assert.deepEqual(parseRound(JSON.stringify(s)), s);
  for (const change of [
    { lessonId: "finals" },
    { group: "special" },
    { queue: courseQueue("initials", "light", false) },
    { course: { ...s.course, unitId: "words" } },
    { revealed: true },
  ])
    assert.throws(() => parseRound(JSON.stringify({ ...s, ...change })));
  assert.ok(
    parseRound(
      JSON.stringify({
        ...s,
        revealed: true,
        course: { ...s.course, assisted: true },
      }),
    ),
  );
  assert.equal(
    validCourseQueue(s.course!, "syllables", "all", s.queue.slice(0, 9)),
    false,
  );
  const article = snapshot("sentences");
  assert.deepEqual(parseRound(JSON.stringify(article)), article);
  assert.equal(
    validCourseQueue(
      article.course!,
      "article",
      "morning",
      [...article.queue].reverse(),
    ),
    false,
  );
  assert.equal(
    validCourseQueue(article.course!, "article", "forest", article.queue),
    false,
  );
});
