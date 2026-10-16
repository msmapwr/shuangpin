import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function setup(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("shuangjian-progress-v1"))
      localStorage.setItem(
        "shuangjian-progress-v1",
        JSON.stringify({
          version: 1,
          settings: {
            count: 10,
            hints: true,
            random: false,
            sound: false,
            goal: 20,
          },
          records: [],
          mistakes: {},
        }),
      );
  });
  await page.goto("/");
}
test("wrong input stays on question, records mistake, completes round and persists history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await setup(page);
  await expect(page.locator(".question-label")).toHaveText("b");
  await page.keyboard.press("a");
  await expect(page.locator("#round-progress")).toHaveText("0");
  await expect(page.locator("#input-feedback")).toContainText("不匹配");
  await page.keyboard.type("bpmfdtnlgk");
  await expect(page.locator(".result-panel")).toBeVisible();
  await expect(page.locator(".result-stats")).toContainText("91%");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("shuangjian-progress-v1")!),
  );
  expect(state.records).toHaveLength(1);
  expect(state.records[0].total).toBe(10);
  expect(state.mistakes["initial-b"].count).toBe(1);
  await page.getByRole("button", { name: "查看学习记录" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("pause blocks input and timer, resumes and backspace retracts current syllable", async ({
  page,
}) => {
  await setup(page);
  await page.locator('[data-lesson="syllables"]').first().click();
  await page.keyboard.type("n");
  await expect(page.locator(".answer-slot.filled")).toHaveText("N");
  await page.keyboard.press("Backspace");
  await expect(page.locator(".answer-slot.filled")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator("#timer")).toBeVisible();
  const timer = await page.locator("#timer").textContent();
  await page.keyboard.type("ni");
  await expect(page.locator("#round-progress")).toHaveText("0");
  await page.waitForTimeout(1100);
  await expect(page.locator("#timer")).toHaveText(timer);
  await page.keyboard.press("Escape");
  await page.keyboard.type("ni");
  await expect(page.locator("#round-progress")).toHaveText("1");
});
test("blind mode hides hints, manual hint reveals and virtual keyboard works", async ({
  page,
}) => {
  await setup(page);
  await page.locator('[data-action="mode"]').click();
  await expect(page.locator(".answer-slot")).toHaveText("");
  await expect(page.locator(".key.expected")).toHaveCount(0);
  await page.locator('[data-action="hint"]').click();
  await expect(page.locator(".answer-slot")).toHaveText("B");
  await expect(page.locator(".key.expected")).toHaveAttribute("data-key", "b");
  await page.locator('[data-key="b"]').click();
  await expect(page.locator("#round-progress")).toHaveText("1");
  await expect(page.locator(".answer-slot")).toHaveText("");
});
test("review removes mastered mistake and help/settings remain keyboard accessible", async ({
  page,
}) => {
  await setup(page);
  await page.keyboard.press("a");
  await page.locator('[data-page="review"]').click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "开始错题复习" }).click();
  await page.getByRole("button", { name: "切换练习", exact: true }).click();
  await page.keyboard.press("b");
  expect(
    await page.evaluate(() =>
      Object.keys(
        JSON.parse(localStorage.getItem("shuangjian-progress-v1")!).mistakes,
      ),
    ),
  ).toHaveLength(0);
  await page.locator('[data-action="help"]').first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.locator('[data-action="settings"]').first().click();
  await page.locator('select[name="count"]').selectOption("50");
  await page.getByRole("button", { name: "保存设置" }).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("shuangjian-progress-v1")!).settings
          .count,
    ),
  ).toBe(50);
});
for (const width of [375, 768, 1440])
  test(`responsive layout at ${width}px, reference and records have no viewport overflow`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await setup(page);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/practice-${width}.png`,
      fullPage: true,
    });
    await page.locator('[data-page="reference"]').first().click();
    await page.locator('[data-key="v"]').click();
    await expect(page.locator("#key-detail")).toContainText("zh");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator('[data-page="stats"]').first().click();
    await expect(
      page.getByRole("heading", { name: "第一份进步记录，等你开始" }),
    ).toBeVisible();
  });

test("Chinese input provides recovery guidance and export contains the actual learning data", async ({
  page,
}) => {
  await setup(page);
  await page.locator("#typing-input").fill("你");
  await expect(page.locator("#input-feedback")).toContainText("英文输入法");
  await expect(page.locator("#round-progress")).toHaveText("0");
  await page.locator("#typing-input").fill("b");
  await expect(page.locator("#round-progress")).toHaveText("1");
  await page.locator('[data-page="stats"]').first().click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出学习数据" }).click();
  const download = await downloadPromise;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.version).toBe(1);
  expect(exported.settings.count).toBe(10);
  expect(exported.records).toEqual([]);
});

test("corrupt stored data is preserved and the user is told that saving is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("shuangjian-progress-v1", "original-invalid-data"),
  );
  await page.goto("/");
  await expect(page.locator("#storage-warning")).toContainText("原数据已保留");
  await expect(page.locator(".question-label")).toBeVisible();
  await page.keyboard.type("abcdefghijklmnopqrstuvwxyz");
  expect(
    await page.evaluate(() => localStorage.getItem("shuangjian-progress-v1")),
  ).toBe("original-invalid-data");
});
