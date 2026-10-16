import { test, expect, type Page } from "@playwright/test";
import {
  emptyProgress,
  type Progress,
  type RecordEntry,
} from "../../src/progress.ts";
import { customQuestion } from "../../src/training.ts";
import { questionsFor } from "../../src/encoding.ts";
const key = "shuangjian-progress-v1";
const record = (id: string): RecordEntry => ({
  id,
  date: "2026-10-17T00:00:00.000Z",
  lesson: "initials",
  total: 10,
  correct: 10,
  attempts: 12,
  seconds: 20,
  speed: 30,
});
async function setup(page: Page, data: Progress = emptyProgress()) {
  data.settings.count = 10;
  data.settings.random = false;
  await page.addInitScript(
    ({ key, data }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(key, JSON.stringify(data));
    },
    { key, data },
  );
  await page.goto("/");
}
async function stored(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
}
async function openImport(page: Page, data: unknown) {
  await page.locator('[data-page="stats"]').first().click();
  await page.getByRole("button", { name: "导入备份", exact: true }).click();
  await page.locator("#backup-file").setInputFiles({
    name: "双键备份.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
}
test("focused groups restrict questions and cancelling a switch preserves round progress", async ({
  page,
}) => {
  await setup(page);
  await page.locator("#training-group").selectOption("compound");
  await expect(page.locator(".question-label")).toHaveText("zh");
  await expect(page.locator(".pool-count")).toContainText("3 个不同题目");
  await page.keyboard.press("v");
  await expect(page.locator(".question-label")).toHaveText("ch");
  await page.locator("#training-group").selectOption("all");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "保留当前范围" }).click();
  await expect(page.locator("#training-group")).toHaveValue("compound");
  await expect(page.locator("#round-progress")).toHaveText("1");
  await page.keyboard.press("Escape");
  await page.keyboard.press("i");
  await expect(page.locator(".question-label")).toHaveText("sh");
  await page.locator("#training-group").selectOption("simple");
  await page.getByRole("button", { name: "切换范围", exact: true }).click();
  await expect(page.locator(".question-label")).toHaveText("b");
  await expect(page.locator("#round-progress")).toHaveText("0");
});
test("custom words validate, persist, search, generate practice and require deletion confirmation", async ({
  page,
}) => {
  await setup(page);
  await page.locator('[data-page="library"]').first().click();
  await page.getByRole("button", { name: "添加词组", exact: true }).click();
  await page.locator("#words-text").fill("你好 | ni");
  await page.getByRole("button", { name: "校验并加入词库" }).click();
  await expect(page.locator("#words-error")).toContainText("第 1 行");
  expect((await stored(page)).customWords ?? []).toEqual([]);
  await page
    .locator("#words-text")
    .fill("你好 | ni hao\n绿色 | lü se\n你好 | ni hao");
  await page.getByRole("button", { name: "校验并加入词库" }).click();
  await expect(page.locator("#library-rows tbody tr")).toHaveCount(2);
  await page.reload();
  await expect(page.locator("#library-rows tbody tr")).toHaveCount(2);
  await page.locator("#word-search").fill("lvse");
  await expect(page.locator("#library-rows tbody tr")).toHaveCount(1);
  await expect(page.locator("#library-rows")).toContainText("绿色");
  await page.locator("#word-search").fill("没有的词");
  await expect(page.locator("#library-rows")).toContainText("没有找到");
  await page.locator("#word-search").clear();
  await page
    .getByRole("button", { name: "开始练习", exact: true })
    .last()
    .click();
  await expect(page.locator(".question-label")).toHaveText("你好");
  await page.keyboard.type("nihc");
  await expect(page.locator("#round-progress")).toHaveText("1");
  await page.locator('[data-page="library"]').first().click();
  await page.getByRole("button", { name: "删除词组绿色" }).click();
  await page.getByRole("button", { name: "保留词组" }).click();
  expect((await stored(page)).customWords).toHaveLength(2);
  await page.getByRole("button", { name: "删除词组绿色" }).click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  expect((await stored(page)).customWords).toHaveLength(1);
});
test("backup preview and cancel leave data unchanged; repeated merge is idempotent and settings are optional", async ({
  page,
}) => {
  const local = emptyProgress(),
    incoming = emptyProgress(),
    q = questionsFor("initials")[0];
  local.records = [record("local")];
  incoming.records = [record("remote")];
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
  incoming.customWords = [customQuestion("绿色", "lv se")];
  await setup(page, local);
  const before = await stored(page);
  await openImport(page, incoming);
  await expect(page.locator("#confirm-import")).toBeEnabled();
  expect(await stored(page)).toEqual(before);
  await page.keyboard.press("Escape");
  expect(await stored(page)).toEqual(before);
  await openImport(page, incoming);
  await expect(page.locator("#confirm-import")).toBeEnabled();
  await page.locator("#confirm-import").click();
  const merged = await stored(page);
  expect(merged.records).toHaveLength(2);
  expect(merged.customWords).toHaveLength(1);
  expect(merged.mistakes[q.id].count).toBe(4);
  expect(merged.settings.count).toBe(10);
  await openImport(page, incoming);
  await expect(page.locator("#confirm-import")).toBeEnabled();
  await page.locator("#restore-settings").check();
  await page.locator("#confirm-import").click();
  expect((await stored(page)).records).toEqual(merged.records);
  expect((await stored(page)).settings.count).toBe(50);
});
test("invalid backup answers and oversized files cannot modify local progress", async ({
  page,
}) => {
  await setup(page);
  const before = await stored(page),
    bad = emptyProgress();
  bad.customWords = [{ ...customQuestion("你好", "ni hao"), answer: "abcd" }];
  await openImport(page, bad);
  await expect(page.locator("#import-error")).toContainText("不匹配");
  await expect(page.locator("#confirm-import")).toBeDisabled();
  expect(await stored(page)).toEqual(before);
  await page.locator("#backup-file").setInputFiles({
    name: "too-large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 32),
  });
  await expect(page.locator("#import-error")).toContainText("超过 2 MB");
  expect(await stored(page)).toEqual(before);
});
test("restoring corrupt storage preserves its original bytes in a recovery copy", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    if (localStorage.getItem(key) === null)
      localStorage.setItem(key, "original-damaged-backup");
  }, key);
  await page.goto("/");
  const incoming = emptyProgress();
  incoming.records = [record("recovered")];
  await openImport(page, incoming);
  await expect(page.locator("#confirm-import")).toBeEnabled();
  await expect(page.getByRole("dialog")).toContainText("另存一份原始副本");
  await page.locator("#confirm-import").click();
  expect((await stored(page)).records[0].id).toBe("recovered");
  const originals = await page.evaluate(
    (key) =>
      Object.keys(localStorage)
        .filter((k) => k.startsWith(key + "-recovery-"))
        .map((k) => localStorage.getItem(k)),
    key,
  );
  expect(originals).toEqual(["original-damaged-backup"]);
  await expect(page.locator("#storage-warning")).not.toBeVisible();
});
test("storage failure leaves the original backup and the import dialog available to retry", async ({
  page,
}) => {
  const local = emptyProgress();
  local.records = [record("original")];
  await setup(page, local);
  const before = await stored(page),
    incoming = emptyProgress();
  incoming.records = [record("new")];
  await openImport(page, incoming);
  await expect(page.locator("#confirm-import")).toBeEnabled();
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === key)
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      return original.call(this, k, v);
    };
  }, key);
  await page.locator("#confirm-import").click();
  await expect(page.locator("#import-error")).toContainText("原学习记录已保留");
  expect(await stored(page)).toEqual(before);
  await expect(page.getByRole("dialog")).toBeVisible();
});
test("library and forms remain within the viewport on phones, landscape and desktop", async ({
  page,
}) => {
  const data = emptyProgress();
  data.customWords = [
    customQuestion("小鹤双拼", "xiao he shuang pin"),
    customQuestion("绿色", "lv se"),
  ];
  await setup(page, data);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const size of [
    { width: 375, height: 1000 },
    { width: 667, height: 375 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(size);
    await page.locator('[data-page="library"]').first().click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const deleteButton = page.getByRole("button", { name: "删除词组小鹤双拼" });
    expect(
      await deleteButton.evaluate(
        (e) => e.getBoundingClientRect().right <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/library-${size.width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "添加词组", exact: true }).click();
    await expect(page.locator("#words-text")).toBeVisible();
    expect(
      await page
        .getByRole("dialog")
        .evaluate((e) => e.getBoundingClientRect().width <= innerWidth),
    ).toBe(true);
    await page.keyboard.press("Escape");
  }
});

test("enabling reduced motion during a transition keeps the page visible", async ({
  page,
}) => {
  await setup(page);
  await page.locator('[data-page="library"]').first().click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".page-heading")).toHaveCSS(
    "visibility",
    "visible",
  );
  await expect(page.locator(".records-content")).toHaveCSS("opacity", "1");
  await expect(
    page.getByRole("heading", { name: "你的词，你的节奏。" }),
  ).toBeVisible();
});

test("a slower previously selected backup cannot replace the latest file preview", async ({
  page,
}) => {
  await setup(page);
  await page.evaluate(() => {
    const original = File.prototype.text;
    File.prototype.text = async function () {
      if (this.name === "slow.json")
        await new Promise((resolve) => setTimeout(resolve, 200));
      return original.call(this);
    };
  });
  await page.locator('[data-page="stats"]').first().click();
  await page.getByRole("button", { name: "导入备份", exact: true }).click();
  const first = emptyProgress();
  first.records = [record("slow")];
  const second = emptyProgress();
  second.records = [record("latest")];
  await page.locator("#backup-file").setInputFiles({
    name: "slow.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(first)),
  });
  await page.locator("#backup-file").setInputFiles({
    name: "latest.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(second)),
  });
  await expect(page.locator("#import-preview")).toContainText("latest.json");
  await page.waitForTimeout(250);
  await expect(page.locator("#import-preview")).toContainText("latest.json");
  await page.locator("#confirm-import").click();
  expect((await stored(page)).records[0].id).toBe("latest");
});
