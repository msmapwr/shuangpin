import { test, expect, type Page } from "@playwright/test";
import { emptyProgress, STORAGE_KEY } from "../../src/progress.ts";
import { ROUND_KEY } from "../../src/round.ts";
import { coursePool } from "../../src/course.ts";
async function setup(page: Page, id = "memory-top") {
  const data = emptyProgress();
  data.course.current = id;
  data.course.pace = "light";
  await page.addInitScript(
    ({ data, key }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data));
    },
    { data, key: STORAGE_KEY },
  );
  await page.goto("/#tutorial");
}
test("memory table exposes all letter keys with mnemonic details and keyboard selection", async ({
  page,
}) => {
  await setup(page);
  await expect(page.locator("#course-title")).toHaveText(
    "键位速记：上排 Q 到 P",
  );
  await expect(page.locator("[data-memory-key]")).toHaveCount(26);
  await page.locator('[data-memory-key="k"]').click();
  await expect(page.locator("#memory-detail")).toContainText("ing / uai");
  await expect(page.locator("#memory-detail")).toContainText("快 kuai → KK");
  await expect(page.locator('[data-memory-key="k"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-memory-key="v"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#memory-detail")).toContainText("复合声母：zh");
  await expect(page.locator("#memory-detail")).toContainText("女 nv → NV");
});
test("row homework is scoped and a full-map check survives refresh then records all thirty-three finals", async ({
  page,
}) => {
  await setup(page, "memory-all");
  await expect(page.locator(".course-small")).toContainText("每轮 33 题");
  await page
    .locator('[data-course-start="memory-all"][data-course-mode="check"]')
    .click();
  await expect(page.locator(".session-stats")).toContainText("/ 33");
  await expect(page.locator(".memory-map")).toHaveCount(0);
  await expect(page.locator(".key-mapping").first()).toBeHidden();
  const label = await page.locator(".question-label").textContent();
  const q = coursePool("memory-all").find((q) => q.label === label);
  await page.keyboard.type(q!.answer);
  const original = await page.evaluate(
    (key) => JSON.parse(sessionStorage.getItem(key)!),
    ROUND_KEY,
  );
  expect(new Set(original.queue.map((q: { id: string }) => q.id)).size).toBe(
    33,
  );
  await page.reload();
  await expect(page.locator("#round-notice")).toContainText("已恢复");
  await page.keyboard.press("Escape");
  await page.keyboard.type(
    original.queue
      .slice(1)
      .map((q: { answer: string }) => q.answer)
      .join(""),
  );
  await expect(page.locator(".result-panel")).toContainText("完成 33 题");
  const data = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    STORAGE_KEY,
  );
  expect(data.records[0]).toMatchObject({
    total: 33,
    course: { unitId: "memory-all", mode: "check", assisted: false },
  });
  expect(data.course.completed).toEqual([]);
  await page
    .locator('.course-result-advice [data-course-start="memory-all"]')
    .click();
  for (let i = 0; i < 33; i++) {
    const current = await page.locator(".question-label").textContent();
    await page.keyboard.type(
      coursePool("memory-all").find((q) => q.label === current)!.answer,
    );
  }
  await expect(page.locator(".course-result-advice")).toContainText(
    "本课验收通过",
  );
});
test("memory map scrolls within the reading surface on phones without page overflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await setup(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.locator('[data-memory-key="p"]').click();
    await expect(page.locator("#memory-detail")).toContainText("撇 pie → PP");
    await page
      .locator('[data-course-start="memory-top"][data-course-mode="guided"]')
      .click();
    const label = await page.locator(".question-label").textContent();
    await page.keyboard.type(
      coursePool("memory-top").find((q) => q.label === label)!.answer,
    );
    const snapshot = await page.evaluate(
      (key) => JSON.parse(sessionStorage.getItem(key)!),
      ROUND_KEY,
    );
    expect(
      snapshot.queue.every((q: { answer: string }) =>
        "qwertyuiop".includes(q.answer),
      ),
    ).toBe(true);
    await page.locator('[data-action="restart"]').click();
    await page
      .getByRole("button", { name: "重新开始", exact: true })
      .last()
      .click();
  }
});
