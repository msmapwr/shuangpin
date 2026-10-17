import { test, expect, type Page } from "@playwright/test";
import {
  emptyProgress,
  type Progress,
  type RecordEntry,
} from "../../src/progress.ts";
import { ROUND_KEY, type RoundSnapshot } from "../../src/round.ts";
import { questionsFor, type LessonId } from "../../src/encoding.ts";
const progressKey = "shuangjian-progress-v1";
async function setup(
  page: Page,
  data: Progress = emptyProgress(),
  snapshot?: unknown,
) {
  data.settings.count = 10;
  data.settings.random = false;
  await page.addInitScript(
    ({ data, key, snapshot, roundKey }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(key, JSON.stringify(data));
      if (snapshot !== undefined && sessionStorage.getItem(roundKey) === null)
        sessionStorage.setItem(roundKey, JSON.stringify(snapshot));
    },
    { data, key: progressKey, snapshot, roundKey: ROUND_KEY },
  );
  await page.goto("/");
}
const record = (
  id: string,
  lesson: LessonId,
  correct = 10,
  attempts = 10,
): RecordEntry => ({
  id,
  lesson,
  total: 10,
  date: new Date().toISOString(),
  attempts,
  correct,
  seconds: 10,
  speed: 60,
});
const snapshot = (): RoundSnapshot => ({
  version: 1,
  id: "restorable-round",
  lessonId: "initials",
  group: "all",
  queue: questionsFor("initials").slice(0, 10),
  index: 1,
  typed: "",
  attempts: 1,
  correct: 1,
  completedKeys: 1,
  streak: 1,
  bestStreak: 1,
  questionWrong: false,
  revealed: false,
  elapsed: 12.3,
  updatedAt: "2026-10-17T01:00:00.000Z",
});

test("refresh restores partial input and pauses timing, then saves the same round only once", async ({
  page,
}) => {
  const data = emptyProgress();
  data.settings.hints = false;
  await setup(page, data);
  await page.locator('[data-lesson="syllables"]').first().click();
  await page.keyboard.type("nz");
  await page.locator('[data-action="hint"]').click();
  await page.waitForTimeout(1100);
  const id = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!).id,
    ROUND_KEY,
  );
  await page.reload();
  await expect(page.locator("#round-notice")).toContainText("本轮进度已恢复");
  await expect(page.locator(".answer-slot.filled")).toHaveText("N");
  await expect(page.locator("#round-progress")).toHaveText("0");
  await expect(page.locator("#pause-button")).toContainText("继续练习");
  const restored = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    ROUND_KEY,
  );
  expect(restored.questionWrong).toBe(true);
  expect(restored.revealed).toBe(true);
  expect(restored.elapsed).toBeGreaterThanOrEqual(1);
  const time = await page.locator("#timer").textContent();
  await page.waitForTimeout(1100);
  await expect(page.locator("#timer")).toHaveText(time!);
  await page.locator('[data-action="resume-round"]').click();
  await page.keyboard.press("i");
  await expect(page.locator("#round-progress")).toHaveText("1");
  await page.keyboard.type(
    questionsFor("syllables")
      .slice(1, 10)
      .map((q) => q.answer)
      .join(""),
  );
  await expect(page.locator(".result-panel")).toBeVisible();
  const records = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).records,
    progressKey,
  );
  expect(records).toHaveLength(1);
  expect(records[0].id).toBe(id);
  expect(records[0].attempts - records[0].correct).toBe(1);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), ROUND_KEY),
  ).toBeNull();
  await page.reload();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).records.length,
      progressKey,
    ),
  ).toBe(1);
  await expect(page.locator("#round-notice")).not.toBeVisible();
});

test("restored focused groups and backspaced input survive a refresh", async ({
  page,
}) => {
  await setup(page);
  await page.locator('[data-lesson="syllables"]').first().click();
  await page.locator("#training-group").selectOption("special");
  await expect(page.locator(".question-label")).toHaveText("双");
  await page.keyboard.press("u");
  await page.keyboard.press("Backspace");
  await page.reload();
  await expect(page.locator("#training-group")).toHaveValue("special");
  await expect(page.locator(".answer-slot.filled")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator(".question-label")).toHaveText("双");
  await page.keyboard.type("ul");
  await expect(page.locator("#round-progress")).toHaveText("1");
});

test("completed or invalid snapshots cannot change recorded history", async ({
  page,
}) => {
  const data = emptyProgress();
  data.records = [record("restorable-round", "initials")];
  await setup(page, data, snapshot());
  await expect(page.locator("#round-progress")).toHaveText("0");
  await expect(page.locator("#round-notice")).not.toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).records.length,
      progressKey,
    ),
  ).toBe(1);
});
test("forged temporary answers are rejected while the original temporary bytes are preserved", async ({
  page,
}) => {
  const bad = snapshot();
  bad.queue[0].answer = "z";
  await setup(page, emptyProgress(), bad);
  await expect(page.locator("#round-notice")).toContainText("无法恢复");
  await expect(page.locator("#round-progress")).toHaveText("0");
  const recovery = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key + "-recovery")!),
    ROUND_KEY,
  );
  expect(recovery.queue[0].answer).toBe("z");
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).records,
      progressKey,
    ),
  ).toEqual([]);
});

test("failed recovery-copy writes preserve damaged temporary data until an explicit restart", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === key + "-recovery")
        throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, k, v);
    };
  }, ROUND_KEY);
  const bad = snapshot();
  bad.queue[0].answer = "z";
  await setup(page, emptyProgress(), bad);
  await expect(page.locator("#round-notice")).toContainText("不会被自动替换");
  await page.keyboard.press("b");
  expect(
    await page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem(key)!).queue[0].answer,
      ROUND_KEY,
    ),
  ).toBe("z");
  await page.keyboard.type("pmfdtnlgk");
  await expect(page.locator(".result-panel")).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem(key)!).queue[0].answer,
      ROUND_KEY,
    ),
  ).toBe("z");
  await page.getByRole("button", { name: "再练一轮", exact: true }).click();
  await page.keyboard.press("b");
  expect(
    await page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem(key)!).queue[0].answer,
      ROUND_KEY,
    ),
  ).toBe("b");
});

test("a short review round visits each existing mistake once and completes without filler questions", async ({
  page,
}) => {
  const data = emptyProgress();
  for (const [i, q] of questionsFor("initials").slice(0, 2).entries())
    data.mistakes[q.id] = {
      question: q,
      count: 2 - i,
      lastDate: new Date().toISOString(),
    };
  await setup(page, data);
  await page.locator('[data-page="review"]').click();
  await page.getByRole("button", { name: "开始错题复习", exact: true }).click();
  await expect(page.locator(".session-stats")).toContainText("/ 2");
  await page.keyboard.type("bp");
  await expect(page.locator(".result-panel")).toBeVisible();
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    progressKey,
  );
  expect(stored.records).toHaveLength(1);
  expect(stored.records[0].total).toBe(2);
  expect(stored.mistakes).toEqual({});
});

test("temporary progress stays isolated to its tab and reports storage failures", async ({
  page,
}) => {
  await setup(page);
  await page.keyboard.press("b");
  const second = await page.context().newPage();
  await second.goto("/");
  await expect(second.locator("#round-progress")).toHaveText("0");
  await second.close();
  await page.reload();
  await expect(page.locator("#round-progress")).toHaveText("1");
  await page.keyboard.press("Escape");
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === key) throw new DOMException("quota", "QuotaExceededError");
      return original.call(this, k, v);
    };
  }, ROUND_KEY);
  await page.keyboard.press("p");
  await expect(page.locator("#round-progress")).toHaveText("2");
  await expect(page.locator("#round-notice")).toContainText("未能暂存");
});

test("study advice and stage summaries use real records and navigate to the suggested lesson", async ({
  page,
}) => {
  const data = emptyProgress();
  data.records = (
    ["initials", "finals", "zero", "syllables", "words"] as LessonId[]
  ).map((l, i) => record(String(i), l, l === "finals" ? 10 : 20, 20));
  await setup(page, data);
  await page.locator('[data-page="stats"]').first().click();
  await expect(page.locator(".study-next")).toContainText("再巩固一下韵母练习");
  await expect(page.locator(".performance-row")).toHaveCount(5);
  await expect(page.locator(".activity-chart")).toBeVisible();
  await expect(
    page.locator('.performance-row[data-lesson="finals"]'),
  ).toContainText("50%");
  await page.locator('.study-next [data-lesson="finals"]').click();
  await expect(page.locator(".lesson-tab.selected")).toHaveText("韵母练习");
});

for (const width of [375, 1440])
  test(`empty insights and restored-round notices fit ${width}px without invented metrics`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setup(page, emptyProgress(), snapshot());
    await expect(page.locator("#round-notice")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator('[data-page="stats"]').first().click();
    await expect(page.locator(".performance-list .no-data")).toHaveCount(5);
    await expect(page.locator(".activity-empty")).toBeVisible();
    await expect(page.locator(".study-next")).toContainText("从声母练习开始");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/insights-${width}.png`,
      fullPage: true,
    });
  });
