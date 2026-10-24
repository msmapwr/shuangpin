import test from "node:test";
import assert from "node:assert/strict";
import { FINALS, encodeSyllable } from "../src/encoding.ts";
import { keyRows, keyMemory, rowFinals } from "../src/keymap.ts";
import { courseQueue, coursePool, validCourseQueue } from "../src/course.ts";
import { emptyProgress, parseProgress } from "../src/progress.ts";
import { parseRound } from "../src/round.ts";

test("memory keyboard covers every canonical final once and all mnemonic words encode correctly", () => {
  assert.equal(keyRows.join("").length, 26);
  const finals = [0, 1, 2].flatMap(rowFinals);
  assert.equal(new Set(finals).size, finals.length);
  assert.deepEqual(
    [...finals].sort(),
    Object.keys(FINALS)
      .filter((p) => p !== "ve")
      .sort(),
  );
  for (const key of keyRows.join("")) {
    const memory = keyMemory(key);
    assert.equal(memory.answer, encodeSyllable(memory.pinyin));
    for (const final of memory.finals) assert.equal(FINALS[final], key);
  }
  assert.deepEqual(keyMemory("k").finals.sort(), ["ing", "uai"]);
  assert.deepEqual(keyMemory("v").initials, ["zh"]);
  assert.deepEqual(keyMemory("i").initials, ["ch"]);
  assert.deepEqual(keyMemory("u").initials, ["sh"]);
  assert.throws(() => keyMemory("constructor"));
  assert.throws(() => rowFinals(3));
  assert.throws(() => rowFinals(-1));
});
test("row homework stays within its keyboard row while the full test visits every final exactly once", () => {
  for (const [row, id] of [
    "memory-top",
    "memory-home",
    "memory-bottom",
  ].entries()) {
    assert.deepEqual(
      coursePool(id).map((q) => q.pinyin),
      rowFinals(row),
    );
    assert.ok(
      courseQueue(id, "extra").every((q) => keyRows[row].includes(q.answer)),
    );
  }
  const pool = coursePool("memory-all");
  assert.equal(pool.length, 33);
  for (const pace of ["light", "steady", "extra"] as const) {
    const queue = courseQueue("memory-all", pace);
    assert.equal(queue.length, 33);
    assert.equal(new Set(queue.map((q) => q.id)).size, 33);
    assert.deepEqual(
      queue.map((q) => q.id).sort(),
      pool.map((q) => q.id).sort(),
    );
  }
});
test("full-map snapshots and backups preserve achievements but reject truncated or repeated finals", () => {
  const course = {
    unitId: "memory-all",
    mode: "check" as const,
    assisted: false,
  };
  const queue = courseQueue(course.unitId, "light", false);
  const s = {
    version: 1,
    id: "memory-full",
    lessonId: "finals",
    group: "all",
    course,
    queue,
    index: 1,
    typed: "",
    attempts: 1,
    correct: 1,
    completedKeys: 1,
    streak: 1,
    bestStreak: 1,
    questionWrong: false,
    revealed: false,
    elapsed: 2,
    updatedAt: "2026-10-24T03:00:00Z",
  };
  assert.deepEqual(parseRound(JSON.stringify(s)), s);
  assert.equal(
    validCourseQueue(course, "finals", "all", queue.slice(0, 30)),
    false,
  );
  assert.equal(
    validCourseQueue(course, "finals", "all", [queue[1], ...queue.slice(1)]),
    false,
  );
  assert.throws(() =>
    parseRound(JSON.stringify({ ...s, queue: queue.slice(0, 30) })),
  );
  const data = emptyProgress();
  data.course.read = ["start", "memory-all"];
  data.course.completed = ["start"];
  data.records = [
    {
      id: s.id,
      date: s.updatedAt,
      lesson: "finals",
      course,
      total: 33,
      correct: 33,
      attempts: 34,
      seconds: 20,
      speed: 99,
    },
  ];
  assert.deepEqual(parseProgress(JSON.stringify(data)), data);
  assert.throws(() =>
    parseProgress(
      JSON.stringify({ ...data, records: [{ ...data.records[0], total: 30 }] }),
    ),
  );
});
