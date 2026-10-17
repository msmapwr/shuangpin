import test from "node:test";
import assert from "node:assert/strict";
import { articles, articleTokens, getArticle } from "../src/articles.ts";
import { questionsForArticle, encodeSyllable } from "../src/encoding.ts";
import { defaultGroup, filterQuestions, groupsFor } from "../src/training.ts";
import {
  emptyProgress,
  parseProgress,
  mergeProgress,
} from "../src/progress.ts";
import { parseRound, type RoundSnapshot } from "../src/round.ts";

test("original passages retain punctuation and align each Han character with a two-key reading", () => {
  const expected = [59, 46, 48, 50];
  for (const [i, article] of articles.entries()) {
    const tokens = articleTokens(article.id);
    assert.equal(
      tokens.map((t) => t.text).join(""),
      article.paragraphs.map((p) => p.text).join("\n"),
    );
    const questions = questionsForArticle(article.id);
    assert.equal(questions.length, expected[i]);
    assert.equal(
      questions.map((q) => q.label).join(""),
      article.paragraphs
        .map((p) => p.text)
        .join("")
        .replace(/[^\p{Script=Han}]/gu, ""),
    );
    assert.equal(new Set(questions.map((q) => q.id)).size, questions.length);
    for (const q of questions) {
      assert.match(q.answer, /^[a-z]{2}$/);
      assert.equal(q.answer, encodeSyllable(q.pinyin));
      assert.match(q.note, new RegExp(article.title));
    }
  }
  assert.deepEqual(
    questionsForArticle("morning")
      .slice(0, 4)
      .map((q) => q.answer),
    ["qk", "if", "yh", "gl"],
  );
  assert.equal(
    questionsForArticle("forest").find((q) => q.label === "着")!.pinyin,
    "zhe",
  );
  assert.equal(
    questionsForArticle("steady").find((q) => q.label === "得")!.pinyin,
    "de",
  );
  assert.throws(() => getArticle("unknown"));
});

test("article groups select one complete passage without crossing its boundary", () => {
  assert.equal(defaultGroup("article"), "morning");
  assert.equal(defaultGroup("initials"), "all");
  assert.deepEqual(
    groupsFor("article").map((g) => g.id),
    articles.map((a) => a.id),
  );
  for (const a of articles)
    assert.deepEqual(
      filterQuestions("article", a.id),
      questionsForArticle(a.id),
    );
  assert.throws(() => filterQuestions("article", "all"));
});

const snapshot = (): RoundSnapshot => ({
  version: 1,
  id: "article-round",
  lessonId: "article",
  group: "morning",
  queue: questionsForArticle("morning"),
  index: 1,
  typed: "i",
  attempts: 3,
  correct: 3,
  completedKeys: 2,
  streak: 1,
  bestStreak: 1,
  questionWrong: false,
  revealed: false,
  elapsed: 3.2,
  updatedAt: "2026-10-17T02:00:00Z",
});
test("article snapshots restore more than fifty questions in exact full-text order", () => {
  const s = snapshot();
  assert.deepEqual(parseRound(JSON.stringify(s)), s);
  assert.equal(parseRound(JSON.stringify(s), new Set([s.id])), null);
  for (const change of [
    { group: "forest" },
    { queue: s.queue.slice(0, 50) },
    { queue: [...s.queue].reverse() },
    { queue: [...s.queue, s.queue[0]] },
    { queue: s.queue.map((q, i) => (i === 3 ? s.queue[2] : q)) },
  ])
    assert.throws(() => parseRound(JSON.stringify({ ...s, ...change })));
});
test("article backup metadata and contextual mistakes survive a canonical round-trip", () => {
  const data = emptyProgress();
  data.records = [
    {
      id: "complete-article",
      date: "2026-10-17T02:00:00Z",
      lesson: "article",
      articleId: "morning",
      total: 59,
      attempts: 120,
      correct: 118,
      seconds: 80,
      speed: 89,
    },
  ];
  const q = questionsForArticle("morning")[1];
  data.mistakes[q.id] = {
    question: q,
    count: 2,
    lastDate: "2026-10-17T02:00:00Z",
  };
  const parsed = parseProgress(JSON.stringify(data));
  assert.deepEqual(parsed, data);
  assert.deepEqual(mergeProgress(parsed, parsed), data);
  for (const articleId of [undefined, "unknown"])
    assert.throws(() =>
      parseProgress(
        JSON.stringify({
          ...data,
          records: [{ ...data.records[0], articleId }],
        }),
      ),
    );
  assert.throws(() =>
    parseProgress(
      JSON.stringify({
        ...data,
        records: [{ ...data.records[0], lesson: "words" }],
      }),
    ),
  );
  for (const change of [{ total: 58 }, { correct: 117 }])
    assert.throws(
      () =>
        parseProgress(
          JSON.stringify({
            ...data,
            records: [{ ...data.records[0], ...change }],
          }),
        ),
      /完整原文/,
    );
  const incoming = structuredClone(data);
  incoming.records[0].articleId = "forest";
  assert.throws(() => mergeProgress(data, incoming), /同编号/);
  incoming.records[0].articleId = "morning";
  incoming.mistakes[q.id].question.answer = "aa";
  assert.throws(() => parseProgress(JSON.stringify(incoming)), /不正确/);
});
