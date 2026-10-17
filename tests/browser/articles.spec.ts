import { test, expect, type Page } from "@playwright/test";
import { questionsForArticle } from "../../src/encoding.ts";
import {
  emptyProgress,
  parseProgress,
  STORAGE_KEY,
} from "../../src/progress.ts";
import { ROUND_KEY } from "../../src/round.ts";

async function setup(page: Page) {
  const data = emptyProgress();
  data.settings.count = 10;
  data.settings.random = true;
  await page.addInitScript(
    ({ data, key }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(key, JSON.stringify(data));
    },
    { data, key: STORAGE_KEY },
  );
  await page.goto("/");
}
async function startArticle(page: Page, id = "morning") {
  await page.locator('.lesson-tabs [data-page="articles"]').click();
  await page.locator(`[data-article="${id}"]`).click();
}
async function stored(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
}

test("catalog starts complete sequential text and automatically skips punctuation", async ({
  page,
}) => {
  await setup(page);
  await expect(page.locator('nav[aria-label="主导航"] > button')).toHaveCount(
    5,
  );
  await page.locator('.lesson-tabs [data-page="articles"]').click();
  await expect(page.locator(".article-card")).toHaveCount(4);
  await expect(page.locator(".nav-item.active")).toHaveText("开始练习");
  await page.locator('[data-article="morning"]').click();
  await expect(page.locator(".pool-count")).toHaveText("59 字 · 顺序跟练");
  await expect(page.locator(".question-label")).toHaveText("清");
  await expect(page.locator(".question-pinyin")).toHaveText("qing");
  await expect(
    page.locator('.article-passage [aria-current="true"]'),
  ).toHaveText("清");
  await page.keyboard.type("qkif");
  await expect(page.locator(".question-label")).toHaveText("阳");
  await expect(page.locator("#round-progress")).toHaveText("2");
  await expect(page.locator(".article-passage .done")).toHaveCount(2);
  await expect(page.locator(".article-passage")).toContainText(
    "清晨，阳光穿过窗户",
  );
  await page.keyboard.press("Escape");
  const previous = await page.locator("#round-progress").textContent();
  await page.keyboard.type("yh");
  await expect(page.locator("#round-progress")).toHaveText(previous!);
});

test("refresh and catalog continuation preserve partial article input and reject cancelled switches", async ({
  page,
}) => {
  await setup(page);
  await startArticle(page);
  await page.keyboard.type("qki");
  const original = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    ROUND_KEY,
  );
  await page.reload();
  await expect(page.locator("#round-notice")).toContainText("已恢复");
  await expect(page.locator("#training-group")).toHaveValue("morning");
  await expect(page.locator(".answer-slot.filled")).toHaveText("I");
  await expect(page.locator("#typing-input")).toBeDisabled();
  await page.locator('.lesson-tabs [data-page="articles"]').click();
  await expect(page.locator('[data-article="morning"]')).toContainText(
    "继续当前练习",
  );
  await page.locator('[data-article="forest"]').click();
  await page.getByRole("button", { name: "保留当前练习", exact: true }).click();
  await page.locator('[data-article="morning"]').click();
  await expect(page.locator("#round-progress")).toHaveText("1");
  await expect(page.locator(".answer-slot.filled")).toHaveText("I");
  await page.keyboard.press("Escape");
  await page.keyboard.type("f");
  await expect(page.locator(".question-label")).toHaveText("阳");
  const resumed = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    ROUND_KEY,
  );
  expect(resumed.id).toBe(original.id);
  expect(resumed.queue).toEqual(original.queue);
  await page.locator("#training-group").selectOption("forest");
  await page.getByRole("button", { name: "保留当前范围" }).click();
  await expect(page.locator("#training-group")).toHaveValue("morning");
  await page.locator("#training-group").selectOption("forest");
  await page.getByRole("button", { name: "切换范围", exact: true }).click();
  await expect(page.locator(".question-label")).toHaveText("午");
  await expect(page.locator(".pool-count")).toHaveText("46 字 · 顺序跟练");
});

test("full article completion records its title and exports an importable backup exactly once", async ({
  page,
}) => {
  await setup(page);
  await startArticle(page);
  await page.keyboard.type(
    questionsForArticle("morning")
      .map((q) => q.answer)
      .join(""),
  );
  await expect(page.locator(".result-panel")).toBeVisible();
  await expect(page.locator(".result-tag")).toHaveText("文章跟练 · 晨间片刻");
  await expect(page.locator(".result-panel")).toContainText("完成 59 题");
  let data = await stored(page);
  expect(data.records).toHaveLength(1);
  expect(data.records[0]).toMatchObject({
    lesson: "article",
    articleId: "morning",
    total: 59,
    correct: 118,
    attempts: 118,
  });
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), ROUND_KEY),
  ).toBeNull();
  await page.getByRole("button", { name: "返回文章列表" }).click();
  await expect(page.locator(".article-card").first()).toContainText(
    "已完成 1 轮 · 最近准确率 100%",
  );
  await page.locator('[data-page="stats"]').first().click();
  await expect(page.locator("tbody")).toContainText("文章 · 晨间片刻");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出学习数据", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  expect(parseProgress(backup.toString()).records).toEqual(data.records);
  await page.getByRole("button", { name: "导入备份", exact: true }).click();
  await page.locator("#backup-file").setInputFiles({
    name: "article.json",
    mimeType: "application/json",
    buffer: backup,
  });
  await page.getByRole("button", { name: "确认合并", exact: true }).click();
  await page.reload();
  data = await stored(page);
  expect(data.records).toHaveLength(1);
  await expect(page.locator("tbody")).toContainText("文章 · 晨间片刻");
});

test("article mistakes keep their original character and can be cleared through review", async ({
  page,
}) => {
  await setup(page);
  await startArticle(page, "forest");
  await page.keyboard.type("awu");
  await expect(page.locator(".question-label")).toHaveText("后");
  expect(
    (await stored(page)).mistakes["article-forest-0"].question,
  ).toMatchObject({ label: "午", pinyin: "wu", answer: "wu" });
  await page.locator('[data-page="review"]').first().click();
  await expect(page.locator("tbody")).toContainText("午");
  await expect(page.locator(".mistake-source")).toHaveText(
    "《林间散步》第 1 字",
  );
  await page.getByRole("button", { name: "开始错题复习" }).click();
  await page.getByRole("button", { name: "切换练习", exact: true }).click();
  await expect(page.locator(".pool-count")).toContainText("1 个不同题目");
  await page.keyboard.type("wu");
  await expect(page.locator(".result-panel")).toBeVisible();
  expect((await stored(page)).mistakes).toEqual({});
  expect((await stored(page)).records[0]).toMatchObject({
    lesson: "review",
    total: 1,
  });
});

test("catalog confirmation starts a different article without counting an abandoned round", async ({
  page,
}) => {
  await setup(page);
  await startArticle(page);
  await page.keyboard.type("qk");
  await page.locator('.lesson-tabs [data-page="articles"]').click();
  await page.locator('[data-article="workday"]').click();
  await page.getByRole("button", { name: "开始新练习", exact: true }).click();
  await expect(page.locator(".question-label")).toHaveText("今");
  await expect(page.locator("#round-progress")).toHaveText("0");
  expect((await stored(page)).records).toEqual([]);
});

test("article reader stays usable without horizontal overflow on mobile tablet and desktop", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await setup(page);
  for (const [width, height] of [
    [375, 812],
    [768, 1024],
    [1440, 1000],
    [812, 375],
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator('[data-page="practice"]').first().click();
    await startArticle(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".article-passage")).toBeVisible();
    await expect(page.locator(".lesson-tabs")).toBeVisible();
    await page.locator('[data-action="restart"]').click();
    await page.keyboard.type(
      questionsForArticle("morning")
        .slice(0, 52)
        .map((q) => q.answer)
        .join(""),
    );
    await expect(page.locator("#article-position")).toHaveText("第 53 / 59 字");
    const visibility = await page.locator(".article-passage").evaluate((el) => {
      const active = el.querySelector<HTMLElement>('[aria-current="true"]')!;
      return {
        top: active.offsetTop,
        bottom: active.offsetTop + active.offsetHeight,
        scroll: el.scrollTop,
        height: el.clientHeight,
      };
    });
    expect(visibility.top).toBeGreaterThanOrEqual(visibility.scroll);
    expect(visibility.bottom).toBeLessThanOrEqual(
      visibility.scroll + visibility.height,
    );
    await page.locator('[data-action="restart"]').click();
    await page
      .getByRole("button", { name: "重新开始", exact: true })
      .last()
      .click();
    await page.locator('.lesson-tabs [data-page="articles"]').click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".article-card")).toHaveCount(4);
  }
});
