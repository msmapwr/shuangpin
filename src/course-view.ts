import { memoryMapHTML } from "./keymap.ts";
import {
  courseUnits,
  coursePool,
  coursePaces,
  getUnit,
  courseAssessment,
  type CourseAttempt,
} from "./course.ts";
import { accuracy, type Progress } from "./progress.ts";
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function tutorialHTML(data: Progress, current: string) {
  const unit = getUnit(current),
    position = courseUnits.indexOf(unit);
  const assessment = courseAssessment(unit.id, data.records);
  const read = data.course.read.includes(unit.id),
    completed = data.course.completed.includes(unit.id);
  return `<div class="page-heading"><div><div class="heading-kicker">给已经会盲打的全拼用户</div><h1>从全拼，学会小鹤双拼。</h1><p>手指位置照旧。先学两键怎样组成一个音节，再用课后练习检查记忆。</p></div><button class="quiet-button" data-page="practice">返回练习台</button></div>
  <div class="course-layout"><details class="course-outline" ${innerWidth >= 1000 ? "open" : ""}><summary><span>课程目录</span><small>${data.course.completed.length} / ${courseUnits.length} 已验收</small></summary><nav aria-label="课程目录"><ol>${courseUnits.map((u, i) => `<li><button data-unit="${u.id}" ${u.id === unit.id ? 'aria-current="step"' : ""}><span class="course-step">${i + 1}</span><span><strong>${esc(u.title)}</strong><small>${data.course.completed.includes(u.id) ? "已验收" : data.course.read.includes(u.id) ? "已读，等待练习" : "未读"}</small></span></button></li>`).join("")}</ol></nav><p>可以直接选课。回看旧课会保留已完成的进度。</p></details>
  <div class="course-reading"><article class="course-lesson" aria-labelledby="course-title"><div class="course-lesson-meta"><span>第 ${position + 1} 课 / 共 ${courseUnits.length} 课</span><span>${completed ? "已验收" : read ? "已读" : "未读"}</span></div><h2 id="course-title" tabindex="-1">${esc(unit.title)}</h2><p class="course-lead">${esc(unit.summary)}</p>${unit.id.startsWith("memory-") ? memoryMapHTML() : ""}${unit.sections.map((section) => `<section><h3>${esc(section.title)}</h3>${section.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</section>`).join("")}${
    unit.lesson === "finals"
      ? `<dl class="course-keymap" aria-label="本课韵母键位">${coursePool(
          unit.id,
        )
          .map(
            (q) =>
              `<div><dt>${esc(q.pinyin === "v" ? "ü" : q.pinyin)}</dt><dd><kbd>${q.answer.toUpperCase()}</kbd></dd></div>`,
          )
          .join("")}</dl>`
      : ""
  }<div class="course-examples" aria-label="拆音与编码示例">${unit.examples.map((e) => `<div class="course-example"><strong>${esc(e.label)}</strong><div><span>${esc(e.pinyin)}</span><div class="course-code">${[...e.code].map((k) => `<kbd>${k.toUpperCase()}</kbd>`).join("")}</div><p>${esc(e.explanation)}</p></div></div>`).join("")}</div><section class="course-trouble"><h3>卡住时怎么练</h3><p>${esc(unit.trouble)}</p></section><button class="secondary-button course-read-button" data-course-read="${unit.id}" aria-pressed="${read}">${read ? "已读过本课（点击可改为未读）" : "我读完了，准备练习"}</button></article>
  <section class="course-homework" aria-labelledby="homework-title"><div class="course-homework-heading"><h2 id="homework-title">课后练习</h2><label for="course-pace">练习量<select id="course-pace">${Object.entries(
    coursePaces,
  )
    .map(
      ([key, p]) =>
        `<option value="${key}" ${key === data.course.pace ? "selected" : ""}>${p.label} · 每轮 ${p.count} 题</option>`,
    )
    .join(
      "",
    )}</select></label></div><p>${esc(unit.homework)}</p><p class="course-small">${unit.fullPool ? `本课每轮 ${coursePool(unit.id).length} 题，覆盖全部韵母，不受练习量设置影响。` : unit.lesson === "article" ? "本课始终练完 59 字，练习量设置用于其他课程。" : "练习量只影响下一轮课后练习，自由练习的设置保持原样。"}</p><div class="course-homework-actions"><button class="secondary-button" data-course-start="${unit.id}" data-course-mode="guided">先跟练（有提示）</button><button class="primary-button" data-course-start="${unit.id}" data-course-mode="check">无提示验收</button></div><div class="course-assessment" role="status"><strong>${completed ? "本课已验收" : "下一步怎么练"}</strong><p>${esc(assessment.reason)}</p>${assessment.latest ? `<span>最近一轮：${accuracy(assessment.latest.correct, assessment.latest.attempts)}%${assessment.latest.course!.assisted ? "，使用过提示" : "，未使用提示"}。</span>` : ""}</div><details class="course-rules"><summary>验收与进度怎样记录？</summary><p>本站建议连续两轮无提示验收达到 95% 按键准确率，再进入下一课。这只是练习建议，没有固定学习天数。跟练、未完成轮次和使用过提示的验收不会算作通过。验收时回看教程、速查、错题本或词库，也会记录为查阅过帮助。</p><p>「已读」由你标记，「已验收」来自练习结果。验收通过后仍可回练；之后出现错键，也会保留已经通过的标记。轻量、常规和加练只是题数不同，验收线相同。</p></details></section>
  <nav class="course-pagination" aria-label="课程前后导航">${position ? `<button class="text-button" data-unit="${courseUnits[position - 1].id}">上一课：${courseUnits[position - 1].title}</button>` : "<span></span>"}${position < courseUnits.length - 1 ? `<button class="text-button" data-unit="${courseUnits[position + 1].id}">下一课：${courseUnits[position + 1].title}</button>` : '<button class="text-button" data-page="articles">去选其他短文</button>'}</nav><p class="course-sources">键位规则可对照 <a href="https://flypy.cc/" target="_blank" rel="noopener noreferrer">小鹤官网</a> 与 <a href="https://github.com/rime/rime-double-pinyin/blob/master/double_pinyin_flypy.schema.yaml" target="_blank" rel="noopener noreferrer">Rime 小鹤方案</a>。课程只练音码。</p></div></div>`;
}
export function courseResultHTML(data: Progress, attempt: CourseAttempt) {
  const unit = getUnit(attempt.unitId),
    assessment = courseAssessment(unit.id, data.records);
  const next = courseUnits[courseUnits.indexOf(unit) + 1];
  const title =
    attempt.mode === "guided"
      ? "跟练已完成"
      : attempt.assisted
        ? "这轮使用过提示或资料"
        : assessment.passed
          ? "本课验收通过"
          : "本轮验收已记录";
  const reason =
    attempt.mode === "guided"
      ? "准备好后可以关闭提示验收，看看哪些键已经记住。"
      : assessment.reason;
  return `<section class="course-result-advice"><span>第 ${courseUnits.indexOf(unit) + 1} 课 · ${esc(unit.title)}</span><h2>${title}</h2><p>${esc(reason)}</p><div class="course-homework-actions">${assessment.passed && next ? `<button class="primary-button" data-unit="${next.id}">继续下一课</button>` : assessment.passed ? '<button class="primary-button" data-page="articles">选择其他短文</button>' : `<button class="primary-button" data-course-start="${unit.id}" data-course-mode="${attempt.mode === "guided" ? "check" : assessment.action === "guided" ? "guided" : "check"}">${attempt.mode === "guided" ? "试一次无提示验收" : assessment.action === "guided" ? "回到有提示跟练" : "再做一轮无提示验收"}</button>`}<button class="secondary-button" data-unit="${unit.id}">回看本课</button></div></section>`;
}
