import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyProgress,
  parseProgress,
  mergeProgress,
  MAX_IMPORT_BYTES,
  type RecordEntry,
} from "../src/progress.ts";
import { questionsFor } from "../src/encoding.ts";
import { customQuestion } from "../src/training.ts";

const record = (
  id: string,
  date = "2026-10-17T00:00:00.000Z",
): RecordEntry => ({
  id,
  date,
  lesson: "initials",
  total: 10,
  attempts: 12,
  correct: 10,
  seconds: 20,
  speed: 30,
});
test("v1 backups without customWords retain history, settings and canonical mistakes", () => {
  const legacy = {
    version: 1,
    settings: { count: 10, hints: false, random: false, sound: true, goal: 20 },
    records: [record("legacy")],
    mistakes: {
      "initial-b": {
        question: questionsFor("initials")[0],
        count: 2,
        lastDate: "2026-10-17T00:00:00.000Z",
      },
    },
  };
  const data = parseProgress(JSON.stringify(legacy));
  assert.equal(data.records[0].id, "legacy");
  assert.deepEqual(data.settings, legacy.settings);
  assert.equal(data.mistakes["initial-b"].count, 2);
  assert.deepEqual(data.customWords, []);
});
test("parser rejects invalid roots, sizes, non-finite metrics and duplicate record IDs", () => {
  for (const raw of [
    "",
    "null",
    "[]",
    "{}",
    "{",
    " ".repeat(MAX_IMPORT_BYTES + 1),
  ])
    assert.throws(() => parseProgress(raw));
  for (const change of [
    { seconds: -1 },
    { seconds: Infinity },
    { total: 0 },
    { total: 11 },
    { correct: 13 },
    { attempts: 1.5 },
    { lesson: "unknown" },
    { date: "invalid" },
  ]) {
    const data = emptyProgress();
    data.records = [{ ...record("r"), ...change } as RecordEntry];
    assert.throws(() => parseProgress(JSON.stringify(data)));
  }
  const duplicate = emptyProgress();
  duplicate.records = [record("r"), record("r")];
  assert.throws(() => parseProgress(JSON.stringify(duplicate)), /重复/);
});
test("forged question answers, unsafe keys and malformed mistake dates never enter practice", () => {
  for (const mutate of [
    (q: Record<string, unknown>) => {
      q.answer = "z";
    },
    (q: Record<string, unknown>) => {
      q.label = "<script>";
    },
    (q: Record<string, unknown>) => {
      q.id = "__proto__";
    },
  ]) {
    const q = { ...questionsFor("initials")[0] };
    mutate(q);
    const raw = JSON.stringify({
      ...emptyProgress(),
      mistakes: {
        [q.id]: { question: q, count: 1, lastDate: "2026-10-17T00:00:00.000Z" },
      },
    });
    assert.throws(() => parseProgress(raw));
  }
  const data = emptyProgress();
  data.mistakes["initial-b"] = {
    question: questionsFor("initials")[0],
    count: 1,
    lastDate: "bad-date",
  };
  assert.throws(() => parseProgress(JSON.stringify(data)));
});
test("custom words round-trip with regenerated answers, including deleted words still in mistakes", () => {
  const data = emptyProgress(),
    q = customQuestion("绿色", "lv se");
  data.customWords = [q];
  data.mistakes[q.id] = {
    question: q,
    count: 2,
    lastDate: "2026-10-17T00:00:00.000Z",
  };
  const result = parseProgress(JSON.stringify(data));
  assert.equal(result.customWords[0].answer, "lvse");
  data.customWords = [];
  assert.equal(
    parseProgress(JSON.stringify(data)).mistakes[q.id].question.answer,
    "lvse",
  );
  data.customWords = [{ ...q, answer: "abcd" }];
  assert.throws(() => parseProgress(JSON.stringify(data)), /不匹配/);
});
test("merge is idempotent, preserves local data, and takes maximum mistake count and latest date", () => {
  const local = emptyProgress(),
    incoming = emptyProgress(),
    q = questionsFor("initials")[0];
  local.records = [record("local")];
  incoming.records = [record("remote")];
  local.settings.count = 10;
  incoming.settings.count = 50;
  local.mistakes[q.id] = {
    question: q,
    count: 4,
    lastDate: "2026-10-17T00:00:00.000Z",
  };
  incoming.mistakes[q.id] = {
    question: q,
    count: 2,
    lastDate: "2026-10-18T00:00:00.000Z",
  };
  local.customWords = [customQuestion("你好", "ni hao")];
  incoming.customWords = [
    local.customWords[0],
    customQuestion("绿色", "lv se"),
  ];
  const before = JSON.stringify(local),
    combined = mergeProgress(local, incoming),
    again = mergeProgress(combined, incoming);
  assert.deepEqual(again, combined);
  assert.equal(combined.records.length, 2);
  assert.equal(combined.mistakes[q.id].count, 4);
  assert.equal(combined.mistakes[q.id].lastDate, "2026-10-18T00:00:00.000Z");
  assert.equal(combined.customWords.length, 2);
  assert.equal(combined.settings.count, 10);
  assert.equal(mergeProgress(local, incoming, true).settings.count, 50);
  assert.equal(JSON.stringify(local), before);
});
test("record conflicts stop a merge while newest 500 records are retained chronologically", () => {
  const local = emptyProgress(),
    incoming = emptyProgress();
  local.records = [record("same")];
  incoming.records = [{ ...record("same"), attempts: 13 }];
  assert.throws(() => mergeProgress(local, incoming), /同编号/);
  local.records = Array.from({ length: 500 }, (_, i) =>
    record(`r${i}`, new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString()),
  );
  incoming.records = [record("newest", "2026-10-17T00:00:00.000Z")];
  const merged = mergeProgress(local, incoming);
  assert.equal(merged.records.length, 500);
  assert.equal(merged.records[0].id, "r1");
  assert.equal(merged.records.at(-1)?.id, "newest");
});
test("combined custom word capacity rejects overflow rather than silently dropping words", () => {
  const local = emptyProgress(),
    incoming = emptyProgress();
  // Distinct valid Chinese labels with the same supplied pronunciation.
  local.customWords = Array.from({ length: 200 }, (_, i) =>
    customQuestion(`你${String.fromCodePoint(0x4e00 + i)}`, "ni hao"),
  );
  incoming.customWords = [customQuestion("未来", "wei lai")];
  assert.equal(mergeProgress(local, emptyProgress()).customWords.length, 200);
  assert.throws(() => mergeProgress(local, incoming), /超过 200/);
  assert.equal(local.customWords.length, 200);
});
