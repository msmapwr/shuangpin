import { test, expect, type Page } from "@playwright/test";
import {
  emptyProgress,
  STORAGE_KEY,
  type Progress,
} from "../../src/progress.ts";
import { ROUND_KEY } from "../../src/round.ts";
import { coursePool } from "../../src/course.ts";

async function setup(page: Page, data: Progress = emptyProgress()) {
  data.course.pace = "light";
  await page.addInitScript(
    ({ data, key }) => {
      if (localStorage.getItem(key) === null)
        localStorage.setItem(key, JSON.stringify(data));
    },
    { data, key: STORAGE_KEY },
  );
  await page.goto("/#tutorial");
}
async function stored(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
}
async function selectUnit(page: Page, id: string) {
  if (!(await page.locator(".course-outline").getAttribute("open"))) {
    if (
      !(await page
        .locator(".course-outline")
        .evaluate((el) => (el as HTMLDetailsElement).open))
    )
      await page.locator(".course-outline > summary").click();
  }
  await page.locator(`[data-unit="${id}"]`).first().click();
}
async function completeHomework(page: Page, unitId: string) {
  const pool = coursePool(unitId);
  for (let i = 0; i < 60; i++) {
    if (await page.locator(".result-panel").count()) return;
    const label = await page.locator(".question-label").textContent();
    const question = pool.find((q) => q.label === label);
    expect(question, `current course question ${label}`).toBeTruthy();
    await page.keyboard.type(question!.answer);
  }
  await expect(page.locator(".result-panel")).toBeVisible();
}

test("tutorial separates reading from assessment and saves pace without changing free practice settings", async ({
  page,
}) => {
  await setup(page);
  await expect(page.locator("#course-title")).toHaveText("先打出「你好」");
  await expect(page.locator(".course-outline nav button")).toHaveCount(8);
  await expect(page.locator(".course-lesson")).toContainText(
    "你已经知道每个字母在哪个键上",
  );
  await page.locator('[data-course-read="start"]').click();
  expect((await stored(page)).course.read).toEqual(["start"]);
  expect((await stored(page)).course.completed).toEqual([]);
  await page.locator("#course-pace").selectOption("extra");
  await selectUnit(page, "compound");
  await page.reload();
  await expect(page.locator("#course-title")).toHaveText(
    "把复韵母整段换成一个键",
  );
  await expect(page.locator("#course-pace")).toHaveValue("extra");
  await page
    .locator('[data-course-start="compound"][data-course-mode="guided"]')
    .click();
  await expect(page.locator(".session-stats")).toContainText("/ 30");
  await expect(page.locator(".mode-switch")).toBeDisabled();
  expect((await stored(page)).settings.count).toBe(20);
  expect((await stored(page)).settings.hints).toBe(true);
});

test("two independent blind checks pass a lesson and preserve achievement when returning to old lessons", async ({
  page,
}) => {
  await setup(page);
  await page
    .locator('[data-course-start="start"][data-course-mode="check"]')
    .click();
  await expect(page.locator(".answer-slot")).toHaveText(["", "", "", ""]);
  await expect(page.locator(".key.expected")).toHaveCount(0);
  await page.keyboard.type("nihc".repeat(10));
  await expect(page.locator(".course-result-advice")).toContainText(
    "再做一轮无提示验收",
  );
  expect((await stored(page)).course.completed).toEqual([]);
  await page
    .locator('.course-result-advice [data-course-start="start"]')
    .click();
  await page.keyboard.type("nihc".repeat(10));
  await expect(page.locator(".course-result-advice")).toContainText(
    "本课验收通过",
  );
  expect((await stored(page)).course.completed).toEqual(["start"]);
  const records = (await stored(page)).records;
  expect(records).toHaveLength(2);
  expect(records[0].id).not.toBe(records[1].id);
  expect(records[1].course).toEqual({
    unitId: "start",
    mode: "check",
    assisted: false,
  });
  await page.getByRole("button", { name: "继续下一课", exact: true }).click();
  await expect(page.locator("#course-title")).toHaveText("声母只多记三个键");
  await selectUnit(page, "start");
  await expect(page.locator(".course-lesson-meta")).toContainText("已验收");
  await page
    .locator('[data-course-start="start"][data-course-mode="check"]')
    .click();
  await page.keyboard.type("a".repeat(15) + "nihc".repeat(10));
  await expect(page.locator(".course-result-advice")).toContainText(
    "回到有提示跟练",
  );
  expect((await stored(page)).course.completed).toEqual(["start"]);
});

test("assisted checks resume paused with the same scope and never count as blind passes", async ({
  page,
}) => {
  await setup(page);
  await page
    .locator('[data-course-start="start"][data-course-mode="check"]')
    .click();
  await page.keyboard.type("n");
  await page.locator('[data-action="hint"]').click();
  await expect(page.locator(".course-round-context")).toContainText(
    "本轮查阅过提示或资料",
  );
  await page.reload();
  await expect(page.locator("#typing-input")).toBeDisabled();
  await expect(page.locator("#round-notice")).toContainText("已恢复");
  await expect(page.locator(".answer-slot.filled")).toHaveText("N");
  const round = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    ROUND_KEY,
  );
  expect(round.course).toEqual({
    unitId: "start",
    mode: "check",
    assisted: true,
  });
  await page.keyboard.press("Escape");
  await page.keyboard.type("ihc" + "nihc".repeat(9));
  await expect(page.locator(".course-result-advice")).toContainText(
    "这轮使用过提示",
  );
  expect((await stored(page)).records[0].course.assisted).toBe(true);
  expect((await stored(page)).course.completed).toEqual([]);
  await page
    .locator('.course-result-advice [data-course-start="start"]')
    .click();
  await expect(page.locator(".answer-slot")).toHaveText(["N", "I", "H", "C"]);
  await completeHomework(page, "start");
  await expect(page.locator(".course-result-advice")).toContainText(
    "跟练已完成",
  );
  expect((await stored(page)).course.completed).toEqual([]);
});

test("reading a different lesson and cancelling homework protects the unfinished round", async ({
  page,
}) => {
  await setup(page);
  await page
    .locator('[data-course-start="start"][data-course-mode="check"]')
    .click();
  await page.keyboard.type("ni");
  await page.locator('.course-round-context [data-unit="start"]').click();
  await selectUnit(page, "initials");
  await page
    .locator('[data-course-start="initials"][data-course-mode="check"]')
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "保留当前练习", exact: true }).click();
  await selectUnit(page, "start");
  await page
    .locator('[data-course-start="start"][data-course-mode="check"]')
    .click();
  await expect(page.locator(".answer-slot.filled")).toHaveText(["N", "I"]);
  const resumed = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    ROUND_KEY,
  );
  expect(resumed.course.assisted).toBe(true);
  await expect(page.locator("#typing-input")).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.keyboard.type("hc");
  await expect(page.locator("#round-progress")).toHaveText("1");
});

test("special-rule homework mixes canonical question types and sentence homework keeps the whole article", async ({
  page,
}) => {
  await setup(page);
  await selectUnit(page, "special");
  await page.locator("#course-pace").selectOption("extra");
  await page
    .locator('[data-course-start="special"][data-course-mode="guided"]')
    .click();
  await completeHomework(page, "special");
  expect((await stored(page)).records[0]).toMatchObject({
    lesson: "syllables",
    total: 30,
    course: { unitId: "special", mode: "guided", assisted: true },
  });
  await page.locator('[data-page="tutorial"]').first().click();
  await selectUnit(page, "sentences");
  await page.locator("#course-pace").selectOption("light");
  await expect(page.locator(".course-small")).toContainText("始终练完 59 字");
  await page
    .locator('[data-course-start="sentences"][data-course-mode="check"]')
    .click();
  await expect(page.locator(".session-stats")).toContainText("/ 59");
  await expect(page.locator(".article-context h2")).toHaveText("晨间片刻");
  await completeHomework(page, "sentences");
  expect((await stored(page)).records[1]).toMatchObject({
    lesson: "article",
    articleId: "morning",
    total: 59,
    course: { unitId: "sentences", mode: "check", assisted: false },
  });
});

test("course progress survives backup import and failed storage does not fake a read marker", async ({
  page,
}) => {
  await setup(page);
  await page.locator('[data-course-read="start"]').click();
  await selectUnit(page, "words");
  await page.locator('[data-course-read="words"]').click();
  const backup = await stored(page);
  await page.locator('[data-page="stats"]').first().click();
  await page.getByRole("button", { name: "导入备份", exact: true }).click();
  await page.locator("#backup-file").setInputFiles({
    name: "course.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "确认合并", exact: true }).click();
  expect((await stored(page)).course).toEqual(backup.course);
  await page.locator('[data-page="tutorial"]').first().click();
  await selectUnit(page, "initials");
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await page.locator('[data-course-read="initials"]').click();
  await expect(page.locator("#toast")).toContainText("原学习记录已保留");
  await expect(page.locator(".course-lesson-meta")).toContainText("未读");
  expect((await stored(page)).course.read).toEqual(["start", "words"]);
});

test("tutorial text, six navigation items and homework remain accessible across viewport sizes", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height] of [
    [375, 812],
    [768, 1024],
    [1440, 1100],
    [812, 375],
  ]) {
    await page.setViewportSize({ width, height });
    await setup(page);
    await expect(page.locator("#course-title")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const nav = page.locator('nav[aria-label="主导航"] > button');
    await expect(nav).toHaveCount(6);
    for (const item of await nav.all()) {
      const box = await item.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
    }
    const bodySize = await page
      .locator(".course-lesson section > p")
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(bodySize).toBeGreaterThanOrEqual(16);
    await selectUnit(page, "special");
    await expect(page.locator("#course-title")).toBeFocused();
    await page
      .locator('[data-course-start="special"][data-course-mode="check"]')
      .click();
    await expect(page.locator("#typing-input")).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
