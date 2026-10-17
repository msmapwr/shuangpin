import test from "node:test";
import assert from "node:assert/strict";
import { parseRound, type RoundSnapshot } from "../src/round.ts";
import { questionsFor } from "../src/encoding.ts";
const fixture = (): RoundSnapshot => ({
  version: 1,
  id: "round-1",
  lessonId: "words",
  group: "all",
  queue: questionsFor("words").slice(0, 2),
  index: 1,
  typed: "u",
  attempts: 6,
  correct: 5,
  completedKeys: 4,
  streak: 0,
  bestStreak: 0,
  questionWrong: false,
  revealed: true,
  elapsed: 12.5,
  updatedAt: "2026-10-17T01:00:00.000Z",
});
test("round snapshots retain partial input, timing, hints and the original round ID", () => {
  const parsed = parseRound(JSON.stringify(fixture()))!;
  assert.equal(parsed.id, "round-1");
  assert.equal(parsed.index, 1);
  assert.equal(parsed.typed, "u");
  assert.equal(parsed.elapsed, 12.5);
  assert.equal(parsed.revealed, true);
  assert.equal(parsed.queue[1].answer, "uijp");
  assert.equal(parsed.correct, 5);
});
test("missing and already-completed rounds are never replayed", () => {
  assert.equal(parseRound(null), null);
  assert.equal(
    parseRound(
      JSON.stringify({ ...fixture(), queue: [] }),
      new Set(["round-1"]),
    ),
    null,
  );
});
test("round parser rejects forged answers and lesson or group mismatches", () => {
  const bad = fixture();
  bad.queue[0] = { ...bad.queue[0], answer: "aaaa" };
  assert.throws(() => parseRound(JSON.stringify(bad)));
  for (const change of [
    { version: 2 },
    { lessonId: "unknown" },
    { group: "unknown" },
    { lessonId: "initials" },
    { lessonId: "custom" },
    { group: "daily" },
    { queue: [] },
    { queue: Array(51).fill(fixture().queue[0]) },
  ])
    assert.throws(() =>
      parseRound(JSON.stringify({ ...fixture(), ...change })),
    );
  assert.throws(() => parseRound("null"));
  assert.throws(() => parseRound("x".repeat(100001)));
});
test("inconsistent counters, completed input and invalid timing cannot be restored", () => {
  for (const change of [
    { index: -1 },
    { index: 0.5 },
    { index: 2 },
    { attempts: 0 },
    { correct: 7 },
    { correct: 3 },
    { completedKeys: 3 },
    { typed: "zz" },
    { typed: "uijp" },
    { elapsed: -1 },
    { elapsed: Infinity },
    { bestStreak: 2 },
    { streak: 1 },
    { questionWrong: 1 },
    { revealed: null },
    { updatedAt: "invalid" },
  ])
    assert.throws(
      () => parseRound(JSON.stringify({ ...fixture(), ...change })),
      undefined,
      JSON.stringify(change),
    );
});
test("backspace attempts remain valid while a review queue cannot contain repeated questions", () => {
  const backspaced = {
    ...fixture(),
    index: 0,
    typed: "",
    completedKeys: 0,
    correct: 1,
    attempts: 1,
    elapsed: 0,
  };
  assert.equal(parseRound(JSON.stringify(backspaced))?.correct, 1);
  const q = questionsFor("initials")[0];
  const review = { ...backspaced, lessonId: "review", queue: [q, q] };
  assert.throws(() => parseRound(JSON.stringify(review)), /重复/);
});
