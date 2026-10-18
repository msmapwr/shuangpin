import {
  courseUnits,
  getUnit,
  coursePool,
  courseQueue,
  courseAssessment,
  type CourseAttempt,
  type CoursePace,
  type CourseMode,
} from "./course.ts";
import { tutorialHTML, courseResultHTML } from "./course-view.ts";
import { gsap } from "gsap";
import { articles, articleTokens, getArticle } from "./articles.ts";
import {
  createIcons,
  AudioLines,
  Keyboard,
  CircleDot,
  Languages,
  TextCursorInput,
  RotateCcw,
  ChartNoAxesCombined,
  BookOpen,
  Bookmark,
  Sprout,
  CircleHelp,
  ArrowUpRight,
  Settings2,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Lightbulb,
  Pause,
  Play,
  CornerDownLeft,
  Delete,
  Info,
  Expand,
  Route,
  Check,
  Sparkles,
  Flag,
  ArrowRight,
  Github,
  PartyPopper,
  CircleCheck,
  ExternalLink,
  BookmarkCheck,
  Download,
  X,
} from "lucide";
import "./style.css";
import {
  FINALS,
  INITIALS,
  lessons,
  makeQueue,
  type LessonId,
  type Question,
} from "./encoding.ts";
import {
  STORAGE_KEY,
  emptyProgress,
  parseProgress,
  localDay,
  accuracy,
  mergeProgress,
  MAX_IMPORT_BYTES,
  type Progress,
} from "./progress.ts";
import {
  groupsFor,
  defaultGroup,
  filterQuestions,
  parseCustomWords,
  MAX_CUSTOM_WORDS,
} from "./training.ts";
import { ROUND_KEY, parseRound, type RoundSnapshot } from "./round.ts";
import { lessonSummaries, recommendation, currentStreak } from "./insights.ts";

const $ = <T extends HTMLElement = HTMLElement>(s: string) =>
  document.querySelector<T>(s)!;
const icons = {
  AudioLines,
  Keyboard,
  CircleDot,
  Languages,
  TextCursorInput,
  RotateCcw,
  ChartNoAxesCombined,
  BookOpen,
  Bookmark,
  Sprout,
  CircleHelp,
  ArrowUpRight,
  Settings2,
  ChevronRight,
  ChevronDown,
  SlidersHorizontal,
  Eye,
  EyeOff,
  Lightbulb,
  Pause,
  Play,
  CornerDownLeft,
  Delete,
  Info,
  Expand,
  Route,
  Check,
  Sparkles,
  Flag,
  ArrowRight,
  Github,
  PartyPopper,
  CircleCheck,
  ExternalLink,
  BookmarkCheck,
  Download,
  X,
};
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const icon = (name: string, cls = "") =>
  `<i data-lucide="${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase()}" class="${cls}" aria-hidden="true"></i>`;
let progress: Progress = emptyProgress(),
  storageError = "";
const selectedGroups: Partial<Record<LessonId, string>> = {};
let pendingImport: Progress | null = null;
let dialogEpoch = 0;
let importReadSerial = 0;
let roundId: string = crypto.randomUUID(),
  restoredRound = false,
  roundWarning = "",
  roundRecoveryBlocked = false;
try {
  progress = parseProgress(localStorage.getItem(STORAGE_KEY));
} catch {
  storageError = "无法读取学习记录。原数据已保留，本次可以继续练习。";
}
let activeCourse: CourseAttempt | undefined;
let currentUnit = progress.course.current;
let page = "practice",
  lessonId: LessonId = "initials",
  queue: Question[] = [],
  index = 0,
  typed = "",
  attempts = 0,
  correct = 0,
  completedKeys = 0,
  streak = 0,
  bestStreak = 0,
  questionWrong = false,
  phase: "ready" | "running" | "paused" | "done" = "ready";
let elapsed = 0,
  startedAt = 0,
  message = "",
  revealed = false,
  lastKey = "",
  lastWrong = false,
  roundSaved = false;
let animation: gsap.Context | undefined;
const motion = gsap.matchMedia();
let canAnimate = false;
motion.add("(prefers-reduced-motion: no-preference)", () => {
  canAnimate = true;
  return () => {
    canAnimate = false;
    animation?.revert();
    animation = undefined;
    gsap.killTweensOf(".question-content,.answer-slots");
    gsap.set(".question-content,.answer-slots", {
      clearProps: "transform,opacity,visibility",
    });
  };
});
let audio: AudioContext | undefined;
function beep(ok: boolean) {
  if (!progress.settings.sound) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.connect(g);
    g.connect(audio.destination);
    o.frequency.value = ok ? 660 : 220;
    g.gain.setValueAtTime(0.035, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.065);
    o.start();
    o.stop(audio.currentTime + 0.07);
  } catch {
    /* sound is optional */
  }
}
function save() {
  if (storageError.startsWith("无法读取")) return false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    storageError = "";
  } catch {
    storageError = "浏览器未能保存记录。请允许本地存储，并及时导出学习数据。";
  }
  const banner = $("#storage-warning");
  if (banner) {
    banner.hidden = !storageError;
    banner.textContent = storageError;
  }
  return !storageError;
}
function seconds() {
  return (
    elapsed + (phase === "running" ? (performance.now() - startedAt) / 1000 : 0)
  );
}
function timeLabel(n: number) {
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
}
function current() {
  return queue[index];
}
function lesson() {
  return lessons.find((l) => l.id === lessonId)!;
}
function hintsEnabled() {
  return activeCourse
    ? activeCourse.mode === "guided"
    : progress.settings.hints;
}
function pool() {
  if (activeCourse) return coursePool(activeCourse.unitId);
  if (lessonId === "custom") return progress.customWords;
  return lessonId === "review"
    ? Object.values(progress.mistakes)
        .sort((a, b) => b.count - a.count)
        .map((m) => m.question)
    : filterQuestions(
        lessonId,
        selectedGroups[lessonId] ?? defaultGroup(lessonId),
      );
}
function startRound(clearTemporary = true) {
  if (activeCourse)
    activeCourse = {
      ...activeCourse,
      assisted: activeCourse.mode === "guided",
    };
  const items = pool();
  queue = activeCourse
    ? courseQueue(activeCourse.unitId, progress.course.pace)
    : lessonId === "article"
      ? [...items]
      : makeQueue(
          items,
          lessonId === "review"
            ? Math.min(items.length, progress.settings.count)
            : progress.settings.count,
          progress.settings.random,
        );
  roundId = crypto.randomUUID();
  restoredRound = false;
  index = 0;
  typed = "";
  attempts = 0;
  correct = 0;
  completedKeys = 0;
  streak = 0;
  bestStreak = 0;
  elapsed = 0;
  phase = "ready";
  questionWrong = false;
  revealed = false;
  message = "";
  roundSaved = false;
  lastKey = "";
  lastWrong = false;
  if (clearTemporary) {
    roundRecoveryBlocked = false;
    roundWarning = "";
    clearRoundSnapshot();
  }
}
function roundNoticeHTML() {
  if (roundWarning) return `<span>${esc(roundWarning)}</span>`;
  if (restoredRound)
    return `<span>${icon("RotateCcw")} 本轮进度已恢复，计时保持暂停。</span><button class="text-button" data-action="resume-round">${icon("Play")} 继续练习</button>`;
  return "";
}
function updateRoundNotice() {
  const e = $("#round-notice");
  if (e) {
    e.innerHTML = page === "practice" ? roundNoticeHTML() : "";
    e.hidden = !e.innerHTML;
    createIcons({ icons });
  }
}
function clearRoundSnapshot() {
  try {
    sessionStorage.removeItem(ROUND_KEY);
  } catch {
    /* Completion IDs also prevent replay if cleanup is unavailable. */
  }
}
function persistRound(): boolean {
  if (!attempts || phase === "done") return true;
  if (roundRecoveryBlocked) {
    updateRoundNotice();
    return false;
  }
  const snapshot: RoundSnapshot = {
    version: 1,
    id: roundId,
    lessonId,
    group: selectedGroups[lessonId] ?? defaultGroup(lessonId),
    ...(activeCourse ? { course: { ...activeCourse } } : {}),
    queue,
    index,
    typed,
    attempts,
    correct,
    completedKeys,
    streak,
    bestStreak,
    questionWrong,
    revealed,
    elapsed: seconds(),
    updatedAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(ROUND_KEY, JSON.stringify(snapshot));
    if (roundWarning) {
      roundWarning = "";
      updateRoundNotice();
    }
    return true;
  } catch {
    roundWarning =
      "浏览器未能暂存本轮进度，刷新可能丢失未完成内容。学习历史的保存状态请查看上方提示。";
    updateRoundNotice();
    return false;
  }
}
function restoreRound() {
  try {
    const snapshot = parseRound(
      sessionStorage.getItem(ROUND_KEY),
      new Set(progress.records.map((r) => r.id)),
    );
    if (!snapshot) {
      startRound();
      return;
    }
    activeCourse = snapshot.course;
    roundId = snapshot.id;
    lessonId = snapshot.lessonId;
    selectedGroups[lessonId] = snapshot.group;
    queue = snapshot.queue;
    index = snapshot.index;
    typed = snapshot.typed;
    attempts = snapshot.attempts;
    correct = snapshot.correct;
    completedKeys = snapshot.completedKeys;
    streak = snapshot.streak;
    bestStreak = snapshot.bestStreak;
    questionWrong = snapshot.questionWrong;
    revealed = snapshot.revealed;
    elapsed = snapshot.elapsed;
    phase = "paused";
    restoredRound = true;
  } catch {
    // Keep invalid temporary data available for inspection without touching history.
    let backupFailed = false;
    try {
      const raw = sessionStorage.getItem(ROUND_KEY);
      if (raw !== null) sessionStorage.setItem(`${ROUND_KEY}-recovery`, raw);
    } catch {
      backupFailed = true;
    }
    startRound(false);
    roundRecoveryBlocked = backupFailed;
    roundWarning = backupFailed
      ? "浏览器未能读取或备份临时进度，原内容不会被自动替换。点击「重新开始」可放弃旧进度并启用本轮暂存。"
      : "上次未完成的练习无法恢复，已保留临时副本并准备新的一轮。学习历史没有改变。";
  }
}
function pause() {
  if (phase === "running" || phase === "ready") {
    elapsed = seconds();
    phase = "paused";
  } else if (phase === "paused") {
    phase = "running";
    startedAt = performance.now();
    restoredRound = false;
  }
  persistRound();
  updateRoundNotice();
  renderPracticeState();
}
function nav(pageId: string) {
  if (
    activeCourse?.mode === "check" &&
    phase !== "done" &&
    ["tutorial", "reference", "review", "library"].includes(pageId)
  )
    activeCourse.assisted = true;
  if (phase === "running") {
    elapsed = seconds();
    phase = "paused";
  }
  page = pageId;
  persistRound();
  render();
}
function choose(id: LessonId) {
  if (activeCourse || lessonId !== id || page !== "practice") {
    activeCourse = undefined;
    lessonId = id;
    startRound();
  }
  page = "practice";
  render();
}
function finish() {
  elapsed = seconds();
  phase = "done";
  if (!roundSaved) {
    progress.records.push({
      id: roundId,
      date: new Date().toISOString(),
      lesson: lessonId,
      ...(activeCourse ? { course: { ...activeCourse } } : {}),
      ...(lessonId === "article"
        ? { articleId: selectedGroups.article ?? defaultGroup("article") }
        : {}),
      total: queue.length,
      attempts,
      correct,
      seconds: elapsed,
      speed: Math.round((completedKeys / Math.max(elapsed, 1)) * 60),
    });
    progress.records = progress.records.slice(-500);
    if (
      activeCourse &&
      courseAssessment(activeCourse.unitId, progress.records).passed &&
      !progress.course.completed.includes(activeCourse.unitId)
    )
      progress.course.completed.push(activeCourse.unitId);
    roundSaved = true;
    if (save() && !roundRecoveryBlocked) clearRoundSnapshot();
  }
  render();
}
function enterKey(key: string) {
  if (
    page !== "practice" ||
    !current() ||
    phase === "done" ||
    phase === "paused" ||
    !/^[a-z]$/.test(key)
  )
    return;
  if (phase === "ready") {
    phase = "running";
    startedAt = performance.now();
  }
  attempts++;
  lastKey = key;
  lastWrong = key !== current().answer[typed.length];
  if (lastWrong) {
    questionWrong = true;
    streak = 0;
    message = `按键 ${key.toUpperCase()} 不匹配，再试一次。${hintsEnabled() || revealed ? `当前需要 ${current().answer[typed.length].toUpperCase()} 键。` : "可以点击「显示提示」查看键位。"}`;
    const q = current();
    const previous = progress.mistakes[q.id];
    progress.mistakes[q.id] = {
      question: q,
      count: (previous?.count ?? 0) + 1,
      lastDate: new Date().toISOString(),
    };
    save();
    beep(false);
    if (canAnimate)
      gsap.fromTo(
        ".answer-slots",
        { x: -5 },
        { x: 0, duration: 0.3, ease: "elastic.out(1,.3)", overwrite: true },
      );
  } else {
    correct++;
    typed += key;
    message = "";
    beep(true);
    if (typed === current().answer) {
      completedKeys += typed.length;
      streak = questionWrong ? 0 : streak + 1;
      bestStreak = Math.max(bestStreak, streak);
      if (lessonId === "review" && !questionWrong) {
        delete progress.mistakes[current().id];
        save();
      }
      index++;
      typed = "";
      questionWrong = false;
      revealed = false;
      if (index === queue.length) {
        finish();
        return;
      }
      if (canAnimate)
        gsap.fromTo(
          ".question-content",
          { autoAlpha: 0.35, y: 5 },
          { autoAlpha: 1, y: 0, duration: 0.2, overwrite: true },
        );
    }
  }
  persistRound();
  renderPracticeState();
}
function backspace() {
  if (page === "practice" && (phase === "running" || phase === "ready")) {
    typed = typed.slice(0, -1);
    message = "";
    persistRound();
    renderPracticeState();
  }
}
function keyboardHTML(reference = false) {
  return `<div class="keyboard ${reference ? "reference-keyboard" : ""}" aria-label="小鹤双拼屏幕键盘">${[
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm",
  ]
    .map(
      (row, i) =>
        `<div class="key-row row-${i}">${[...row]
          .map((k) => {
            const finals = Object.entries(FINALS)
              .filter(([p, v]) => v === k && p !== "ve")
              .map(([p]) => (p === "v" ? "ü" : p));
            const initial = Object.entries(INITIALS).find(
              ([p, v]) => v === k && p.length > 1,
            )?.[0];
            return `<button class="key" type="button" data-key="${k}" aria-label="${k.toUpperCase()}${initial ? `，声母 ${initial}` : ""}，韵母 ${finals.join("、") || "无"}"><span class="key-letter">${k.toUpperCase()}</span><span class="key-mapping">${finals.join(" / ")}</span>${initial ? `<span class="key-initial">${initial}</span>` : ""}</button>`;
          })
          .join("")}</div>`,
    )
    .join(
      "",
    )}<div class="key-row bottom-row"><span class="keyboard-label">小鹤双拼</span><button class="space-key" type="button" data-action="focus">${icon("CornerDownLeft")} 点击练习区，开始输入</button><button class="backspace-key" data-action="backspace" aria-label="退格">${icon("Delete")}</button></div></div>`;
}
function navItem(id: string, label: string, name: string, count = "") {
  return `<button class="nav-item ${page === id || (id === "practice" && page === "articles") ? "active" : ""}" data-page="${id}">${icon(name)}<span>${label}</span>${count ? `<span class="nav-count">${count}</span>` : ""}</button>`;
}
function trainingContextHTML() {
  if (activeCourse)
    return `<div class="course-round-context"><div><strong>${activeCourse.mode === "guided" ? "有提示跟练" : "无提示验收"}</strong><span>${esc(getUnit(activeCourse.unitId).title)}</span></div><button class="text-button" data-unit="${activeCourse.unitId}">回看本课</button><p>${activeCourse.mode === "guided" ? "可以看答案和高亮键。准备好后再做无提示验收。" : activeCourse.assisted ? "本轮查阅过提示或资料，成绩会记录，但不计为无提示验收。" : "答案和高亮键已关闭。需要时可以显示提示，本轮会标记为用过提示。"}</p></div>`;

  const groups = groupsFor(lessonId);
  return `<div class="training-context ${lessonId === "article" ? "article-training" : ""}">${groups.length > 1 ? `<label for="training-group">${lessonId === "article" ? "选择短文" : "练习范围"}<select id="training-group">${groups.map((g) => `<option value="${g.id}" ${(selectedGroups[lessonId] ?? defaultGroup(lessonId)) === g.id ? "selected" : ""}>${g.name}</option>`).join("")}</select></label>` : `<span>${lessonId === "custom" ? "我的词库" : "错题专项"}</span>`}<span class="pool-count">${pool().length} ${lessonId === "article" ? "字 · 顺序跟练" : "个不同题目"}${lessonId === "custom" ? '<button class="inline-link" data-page="library">管理词库</button>' : ""}</span></div>`;
}
function applyGroup(groupId: string) {
  selectedGroups[lessonId] = groupId;
  startRound();
  render();
}
function libraryRows(query = "") {
  const rows = progress.customWords.filter((q) =>
    `${q.label} ${q.pinyin} ${q.answer}`.includes(query.trim().toLowerCase()),
  );
  return rows.length
    ? `<div class="table-scroll"><table><thead><tr><th>词组</th><th>拼音</th><th>双拼编码</th><th>操作</th></tr></thead><tbody>${rows.map((q) => `<tr><td><strong>${esc(q.label)}</strong></td><td>${esc(q.pinyin)}</td><td><kbd>${esc(q.answer.toUpperCase())}</kbd></td><td><button class="word-delete" data-action="delete-word" data-word-id="${esc(q.id)}" aria-label="删除词组${esc(q.label)}">${icon("X")} 删除</button></td></tr>`).join("")}</tbody></table></div>`
    : `<div class="empty-state compact">${icon("BookOpen")}<h2>${progress.customWords.length ? "没有找到这个词组" : "把常用的词，练成习惯。"}</h2><p>${progress.customWords.length ? "试试其他汉字、拼音或双拼编码。" : "添加词组和拼音，双键会自动生成小鹤双拼编码。"}</p>${progress.customWords.length ? "" : '<button class="primary-button" data-action="add-words">添加第一组词</button>'}</div>`;
}
function libraryHTML() {
  return `<div class="page-heading"><div><div class="heading-kicker">练习你真正会用到的词</div><h1>你的词，你的节奏。</h1><p>常用名字、工作用语、喜欢的词句，都可以成为练习内容。</p></div><div class="page-actions"><button class="secondary-button" data-action="add-words">${icon("BookOpen")} 添加词组</button><button class="primary-button" data-lesson="custom" ${progress.customWords.length ? "" : "disabled"}>${icon("Keyboard")} 开始练习</button></div></div><div class="records-content library-content"><section class="library-intro"><div><h2>我的词库 <span class="word-count">${progress.customWords.length} / ${MAX_CUSTOM_WORDS}</span></h2><p>拼音由你指定，避免多音字读音不合预期。词库会随学习数据一起导出。</p></div><label class="library-search" for="word-search"><span>搜索词组</span><input type="search" id="word-search" placeholder="汉字、拼音或双拼编码" autocomplete="off"></label></section><section class="info-panel" id="library-rows">${libraryRows()}</section><p class="library-note">删除词组前会先确认；已经产生的学习记录与错题会保留。</p></div>`;
}
function showFormError(id: string, text: string) {
  const error = $(id);
  if (!error) return;
  error.textContent = text;
  error.hidden = false;
  error.focus();
}
function addWords() {
  dialogHTML(
    "把常用的词，加进练习",
    `<form id="words-form"><p class="dialog-copy">每行填写一个词组，用竖线分隔汉字与拼音。每个词组 2～8 字，每字一个无声调拼音。</p><label class="words-label" for="words-text">词组与拼音</label><textarea id="words-text" name="words" rows="7" maxlength="32000" aria-describedby="words-help words-error" placeholder="你好 | ni hao&#10;绿色 | lv se&#10;小鹤双拼 | xiao he shuang pin" required></textarea><p class="field-help" id="words-help">音节用空格分隔，ü 可以写 v。一次最多 200 行，相同词组与拼音会自动去重。</p><p id="words-error" class="form-error" role="alert" tabindex="-1" hidden></p><button class="primary-button full-width" type="submit">校验并加入词库</button></form>`,
  );
}
/** Commit only after a successful write; a failed quota check cannot erase memory. */
function commitCandidate(next: Progress, recovery = false) {
  if (storageError.startsWith("无法读取") && !recovery)
    throw new Error(
      "现有学习数据无法读取，请先通过「导入备份」恢复。原数据不会被覆盖。",
    );
  try {
    if (recovery && storageError.startsWith("无法读取")) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null)
        localStorage.setItem(`${STORAGE_KEY}-recovery-${Date.now()}`, raw);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    throw new Error(
      "浏览器未能保存数据，原学习记录已保留。请检查存储权限或剩余空间后重试。",
    );
  }
  progress = next;
  storageError = "";
}
function showImport() {
  pendingImport = null;
  dialogHTML(
    "恢复你的学习积累",
    `<p class="dialog-copy">选择双键导出的 JSON 文件。先核对摘要，再合并到本机；重复导入不会重复累计历史。</p><label class="backup-file-label" for="backup-file">选择备份文件<input id="backup-file" type="file" accept=".json,application/json" aria-describedby="import-help import-error"></label><p class="field-help" id="import-help">文件最大 2 MB，仅在你的浏览器内读取。</p><p class="form-error" id="import-error" role="alert" tabindex="-1" hidden></p><div id="import-preview" aria-live="polite"></div><label class="setting-toggle"><span><strong>同时恢复备份中的练习设置</strong><small>不勾选时保留本机的题数、目标、模式与课程位置</small></span><input id="restore-settings" type="checkbox"></label><p class="dialog-note">历史合并后保留最近 500 轮。错题次数取较大值，旧备份可能带回已掌握的错题。${storageError.startsWith("无法读取") ? "当前原数据无法读取，恢复前会在本机另存一份原始副本。" : ""}</p><button class="primary-button full-width" id="confirm-import" data-action="confirm-import" disabled>确认合并</button>`,
  );
}
async function readImport(file: File) {
  const epoch = dialogEpoch;
  const request = ++importReadSerial;
  pendingImport = null;
  $("#import-error").hidden = true;
  $<HTMLButtonElement>("#confirm-import").disabled = true;
  $("#import-preview").textContent = "正在检查备份…";
  try {
    if (file.size > MAX_IMPORT_BYTES)
      throw new Error("备份文件超过 2 MB，请选择双键导出的 JSON 文件");
    const data = parseProgress(await file.text());
    if (
      epoch !== dialogEpoch ||
      request !== importReadSerial ||
      !$<HTMLDialogElement>("#dialog").open
    )
      return;
    const combined = mergeProgress(progress, data);
    pendingImport = data;
    $("#import-preview").innerHTML =
      `<div class="import-summary"><strong>${esc(file.name)}</strong><dl><div><dt>备份中的历史</dt><dd>${data.records.length} 轮</dd></div><div><dt>新增历史</dt><dd>${combined.records.filter((r) => !progress.records.some((p) => p.id === r.id)).length} 轮</dd></div><div><dt>备份中的错题</dt><dd>${Object.keys(data.mistakes).length} 题</dd></div><div><dt>备份中的自定义词</dt><dd>${data.customWords.length} 个</dd></div></dl><p>确认前，本机学习数据不会改变。</p></div>`;
    $<HTMLButtonElement>("#confirm-import").disabled = false;
  } catch (e) {
    if (
      epoch !== dialogEpoch ||
      request !== importReadSerial ||
      !$<HTMLDialogElement>("#dialog").open
    )
      return;
    $("#import-preview").textContent = "";
    showFormError("#import-error", (e as Error).message);
  }
}
function importData() {
  if (!pendingImport) return;
  try {
    // Reconcile another tab's completed work rather than overwriting it.
    let latest = progress;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null && !storageError.startsWith("无法读取"))
      latest = mergeProgress(progress, parseProgress(raw));
    const next = mergeProgress(
      latest,
      pendingImport,
      $<HTMLInputElement>("#restore-settings").checked,
    );
    commitCandidate(next, true);
    pendingImport = null;
    $<HTMLDialogElement>("#dialog").close();
    page = "stats";
    render();
    toast("备份已合并，学习记录已保存");
  } catch (e) {
    showFormError("#import-error", (e as Error).message);
  }
}
function recommendationHTML() {
  const next = recommendation(progress),
    streakDays = currentStreak(progress.records);
  return `<section class="study-next" aria-label="下一步练习建议"><div class="study-next-copy"><span class="study-next-label">${icon("Route")} 下一步练什么</span><h2>${esc(next.title)}</h2><p>${esc(next.reason)}</p></div><div class="study-next-action"><span class="study-streak">${streakDays ? `连续练习 ${streakDays} 天` : "从今天的一轮开始"}</span><button class="primary-button" data-lesson="${next.lesson}">开始${lessons.find((l) => l.id === next.lesson)!.title} ${icon("ArrowRight")}</button></div></section>`;
}
function performanceHTML() {
  const summaries = lessonSummaries(progress.records);
  return `<section class="info-panel performance-panel"><div class="rail-title"><h2>各阶段练习表现</h2><span class="muted">最近最多三轮</span></div><p class="performance-note">按实际尝试次数加权统计。引导练习的准确率不等同于盲打掌握程度。</p><div class="performance-list">${summaries.map((s) => `<button class="performance-row" data-lesson="${s.id}"><span class="lesson-icon ${lessons.find((l) => l.id === s.id)!.color}">${icon(lessons.find((l) => l.id === s.id)!.icon)}</span><span class="performance-name"><strong>${s.title}</strong><small>${s.rounds ? `${s.rounds} 轮 · ${s.total} 题` : "还没有完成这一阶段的练习"}</small></span><span class="performance-value">${s.recentAccuracy === null ? '<span class="no-data">未开始</span>' : `<strong>${s.recentAccuracy}%</strong><small>按键准确率</small>`}</span>${icon("ChevronRight")}</button>`).join("")}</div></section>`;
}
function activityHTML(days: { label: string; count: number }[]) {
  if (!days.some((d) => d.count))
    return `<div class="activity-empty">${icon("Sprout")}<p>最近七天还没有完成的练习。</p><span>完成一轮后，就能看见每天的积累。</span></div>`;
  const max = Math.max(...days.map((d) => d.count), 1);
  return `<div class="activity-chart" role="img" aria-label="${days.map((d) => d.label + "：" + d.count + "题").join("；")}">${days.map((d) => `<div class="chart-column"><span>${d.count}</span><div class="chart-bar-space"><div class="chart-bar" style="height:${(d.count / max) * 100}%"></div></div><span>${d.label}</span></div>`).join("")}</div>`;
}
function render() {
  animation?.revert();
  const allDone = progress.records.reduce((sum, r) => sum + r.total, 0);
  $("#app").innerHTML =
    `<a class="skip-link" href="#main">跳到主内容</a><aside class="sidebar"><a class="brand" href="#practice" aria-label="双键首页"><span class="brand-mark"><span></span><span></span></span><span>双键<span class="brand-sub">让双拼，成为习惯</span></span></a><div class="nav-group-label">学习空间</div><nav aria-label="主导航">${navItem("tutorial", "入门教程", "Route")}${navItem("practice", "开始练习", "Keyboard")}${navItem("reference", "键位速查", "BookOpen")}${navItem("review", "错题本", "Bookmark", String(Object.keys(progress.mistakes).length))}${navItem("stats", "学习记录", "ChartNoAxesCombined")}${navItem("library", "我的词库", "BookOpen")}</nav><div class="sidebar-course"><div class="sidebar-course-title">循序渐进，一步一步来</div><div class="course-line"><span style="width:${Math.min((allDone / 200) * 100, 100)}%"></span></div><p>已完成 ${allDone} 题练习</p></div><div class="sidebar-bottom"><div class="small-tip">${icon("Sprout")}<p>每天一点点，<br>让手指记住每个键位。</p></div><button class="nav-item" data-action="help">${icon("CircleHelp")}<span>入门指南</span>${icon("ArrowUpRight", "small")}</button><button class="nav-item" data-action="settings">${icon("Settings2")}<span>练习设置</span></button><div class="local-status"><span></span> 学习数据仅保存在本机</div></div></aside>
  <div class="workspace"><header class="topbar"><div class="breadcrumb">我的学习空间 ${icon("ChevronRight")}<span>${({ practice: "开始练习", reference: "键位速查", review: "错题本", stats: "学习记录", library: "我的词库", articles: "文章跟练", tutorial: "入门教程" } as Record<string, string>)[page]}</span></div><div class="topbar-right"><span class="scheme-indicator"><span></span>小鹤双拼</span><button class="avatar" data-action="settings" aria-label="打开个人练习设置">双</button></div></header><main id="main" tabindex="-1"><div id="storage-warning" role="status" class="storage-warning" ${storageError ? "" : "hidden"}>${esc(storageError)}</div><div class="round-notice" id="round-notice" role="status" ${page !== "practice" || !roundNoticeHTML() ? "hidden" : ""}>${page === "practice" ? roundNoticeHTML() : ""}</div>${page === "practice" ? practiceHTML() : page === "reference" ? referenceHTML() : page === "review" ? reviewHTML() : page === "library" ? libraryHTML() : page === "articles" ? articlesHTML() : page === "tutorial" ? tutorialHTML(progress, currentUnit) : statsHTML()}</main><footer class="footer"><span>双键<span class="footer-dot">·</span>每一次敲击，都离熟练更近一点。</span><a href="https://github.com/msmapwr/shuangpin" target="_blank" rel="noopener noreferrer">${icon("Github")} 开源项目</a></footer></div><div id="toast" role="status" class="toast" hidden></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog>`;
  createIcons({ icons });
  if (page === "practice") renderPracticeState();
  if (canAnimate) {
    animation = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power2.out", duration: 0.38 } })
        .from(".page-heading", { autoAlpha: 0, y: 8 })
        .from(
          ".content-grid, .reference-content, .records-content",
          { autoAlpha: 0, y: 10 },
          "<0.08",
        );
    });
  }
  // Maintain a useful URL for back/forward navigation without reloading the app.
  if (location.hash.slice(1) !== page) history.pushState(null, "", `#${page}`);
}
function visitUnit(id: string) {
  getUnit(id);
  currentUnit = id;
  let warning = "";
  try {
    commitCandidate({
      ...progress,
      course: { ...progress.course, current: id },
    });
  } catch (e) {
    warning = (e as Error).message;
  }
  nav("tutorial");
  $("#course-title").scrollIntoView({ block: "start" });
  $("#course-title").focus({ preventScroll: true });
  if (warning) toast(warning);
}
function beginCourse(id: string, mode: CourseMode) {
  const unit = getUnit(id);
  activeCourse = { unitId: id, mode, assisted: mode === "guided" };
  lessonId = unit.lesson;
  selectedGroups[lessonId] = unit.lesson === "article" ? "morning" : "all";
  currentUnit = id;
  progress.course.current = id;
  save();
  startRound();
  page = "practice";
  render();
  $(".question-content").scrollIntoView({ block: "center" });
  $("#typing-input").focus({ preventScroll: true });
}
function requestCourse(id: string, mode: CourseMode) {
  getUnit(id);
  if (
    activeCourse?.unitId === id &&
    activeCourse.mode === mode &&
    phase !== "done"
  ) {
    nav("practice");
    $(".question-content").scrollIntoView({ block: "center" });
    $(phase === "paused" ? "#pause-button" : "#typing-input").focus({
      preventScroll: true,
    });
    return;
  }
  if (attempts && phase !== "done") {
    dialogHTML(
      "开始课后练习？",
      `<p class="dialog-copy">当前轮次尚未完成。开始后会从本课重新出题，未完成进度不计入历史，错题会保留。</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">保留当前练习</button><button class="primary-button" data-action="confirm-course" data-next="${id}" data-course-mode="${mode}">开始课后练习</button></div>`,
    );
  } else beginCourse(id, mode);
}
function lessonTabsHTML() {
  if (activeCourse)
    return `<button class="lesson-tab selected" data-unit="${activeCourse.unitId}">第 ${courseUnits.findIndex((u) => u.id === activeCourse!.unitId) + 1} 课 · 课后练习</button><button class="lesson-tab" data-lesson="${lessonId}">切回自由练习</button>`;

  const other = !["initials", "finals", "article"].includes(lessonId);
  return (
    lessons
      .slice(0, 2)
      .map(
        (l) =>
          `<button class="lesson-tab ${lessonId === l.id ? "selected" : ""}" data-lesson="${l.id}" aria-pressed="${lessonId === l.id}">${l.title}</button>`,
      )
      .join("") +
    `<button class="lesson-tab ${other ? "selected" : ""}" data-lesson="${other ? lessonId : "words"}" aria-pressed="${other}">${other ? lesson().title : "词组练习"}</button><button class="lesson-tab ${lessonId === "article" ? "selected" : ""}" data-page="articles" aria-pressed="${lessonId === "article"}">文章跟练</button>`
  );
}
function beginArticle(id: string) {
  getArticle(id);
  activeCourse = undefined;
  lessonId = "article";
  selectedGroups.article = id;
  startRound();
  page = "practice";
  render();
}
function requestArticle(id: string) {
  getArticle(id);
  if (
    !activeCourse &&
    lessonId === "article" &&
    selectedGroups.article === id &&
    phase !== "done"
  ) {
    nav("practice");
    return;
  }
  if (attempts && phase !== "done") {
    dialogHTML(
      "开始新的短文练习？",
      `<p class="dialog-copy">切换后会从短文开头开始。本轮尚未完成的进度不会计入历史，错题会保留。</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">保留当前练习</button><button class="primary-button" data-action="confirm-article" data-next="${id}">开始新练习</button></div>`,
    );
  } else beginArticle(id);
}
function articlesHTML() {
  return `<div class="page-heading"><div><div class="heading-kicker">从词组，走向完整表达</div><h1>跟着文字，找到节奏。</h1><p>每字输入完整双拼，标点自动跳过。先求准确，再让输入自然连贯。</p></div><button class="quiet-button" data-page="practice">${icon("Keyboard")} 返回练习台</button></div><div class="records-content article-catalog"><div class="article-catalog-note">${icon("Info")} 四篇原创短文 · 按全文顺序练习 · 支持暂停与刷新续练</div><div class="article-grid">${articles
    .map((a, i) => {
      const length = articleTokens(a.id).filter((t) => t.index !== null).length;
      const records = progress.records.filter(
        (r) => r.articleId === a.id && r.lesson === "article",
      );
      const latest = records.at(-1);
      const active =
        lessonId === "article" &&
        selectedGroups.article === a.id &&
        attempts > 0 &&
        phase !== "done";
      return `<article class="article-card"><div class="article-card-top"><span class="article-number">0${i + 1}</span><span>${length} 字 · ${length * 2} 键</span></div><h2>${a.title}</h2><p class="article-description">${a.description}</p><p class="article-preview">${a.paragraphs[0].text}</p><div class="article-history">${active ? `已练 ${index} / ${length} 字，等待继续` : latest ? `已完成 ${records.length} 轮 · 最近准确率 ${accuracy(latest.correct, latest.attempts)}%` : "尚未完成 · 按自己的节奏开始"}</div><button class="${active ? "primary-button" : "secondary-button"}" data-article="${a.id}">${active ? "继续当前练习" : "开始跟练"} ${icon("ArrowRight")}</button></article>`;
    })
    .join(
      "",
    )}</div><p class="library-note">每个汉字计为一道题，使用完整音节编码；不是输入法候选或词组简码练习。读音按文中语境标注。</p></div>`;
}
function articleContextHTML() {
  const id = selectedGroups.article ?? defaultGroup("article");
  return `<section class="article-context" aria-label="跟练原文"><div class="article-context-heading"><h2>${esc(getArticle(id).title)}</h2><span id="article-position"></span></div><div class="article-passage" tabindex="0" aria-label="短文全文，可滚动阅读">${articleTokens(
    id,
  )
    .map((t) =>
      t.index === null
        ? esc(t.text)
        : `<span data-article-index="${t.index}">${esc(t.text)}</span>`,
    )
    .join(
      "",
    )}</div><p>每字两个键，标点自动跳过；高亮处是当前字。</p></section>`;
}
function updateArticlePosition() {
  if (lessonId !== "article") return;
  const passage = $(".article-passage");
  if (!passage) return;
  $("#article-position").textContent = `第 ${index + 1} / ${queue.length} 字`;
  passage
    .querySelectorAll<HTMLElement>("[data-article-index]")
    .forEach((el) => {
      const position = Number(el.dataset.articleIndex);
      el.classList.toggle("done", position < index);
      el.classList.toggle("current", position === index);
      if (position === index) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    });
  const active = passage.querySelector<HTMLElement>('[aria-current="true"]');
  if (!active) return;
  // Scroll only the original-text reader; do not move the typing input or page.
  const top = active.offsetTop,
    bottom = top + active.offsetHeight;
  if (
    top < passage.scrollTop ||
    bottom > passage.scrollTop + passage.clientHeight
  )
    passage.scrollTop = Math.max(0, top - passage.clientHeight / 3);
}
function courseInviteHTML() {
  return `<section class="course-invite"><div><strong>已经会盲打？从这里学双拼。</strong><p>按课理解键位，跟练后再关闭提示验收。${progress.course.completed.length ? `已验收 ${progress.course.completed.length} / ${courseUnits.length} 课。` : "不需要重学指法。"}</p></div><button class="primary-button" data-page="tutorial">${progress.course.read.length || progress.course.completed.length ? "继续入门课程" : "开始入门课程"}</button></section>`;
}
function practiceHTML() {
  const completedToday = progress.records
    .filter((r) => localDay(r.date) === localDay())
    .reduce((sum, r) => sum + r.total, 0);
  if (phase === "done") return resultHTML();
  return `<div class="page-heading"><div><div class="heading-kicker">把全拼，变成两次敲击</div><h1>${activeCourse ? "课后练习：" + esc(getUnit(activeCourse.unitId).title) : "今天，也进步一点。"}</h1><p>从认识键位到自然输入，找到属于你的打字节奏。</p></div><button class="quiet-button" data-action="help">${icon("BookOpen")} 新手指南</button></div>
  ${!activeCourse ? courseInviteHTML() : ""}<div class="content-grid"><div class="practice-column"><section class="practice-panel" aria-label="练习台"><div class="panel-toolbar"><div class="lesson-tabs" role="group" aria-label="基础练习类型">${lessonTabsHTML()}</div><button class="icon-button" data-action="settings" aria-label="练习设置">${icon("SlidersHorizontal")}</button></div>
  ${trainingContextHTML()}<div class="session-stats"><div><span class="stat-label">本轮进度</span><strong><span id="round-progress">0</span><small> / ${queue.length}</small></strong></div><div><span class="stat-label">准确率</span><strong id="accuracy">—</strong></div><div><span class="stat-label">练习用时</span><strong id="timer">00:00</strong></div><div><span class="stat-label">连续答对</span><strong><span id="streak">0</span><small> 题</small></strong></div></div><div class="round-track"><div id="round-fill"></div></div>
  ${queue.length ? `<div class="exercise"><div class="exercise-topline"><span class="lesson-caption">${icon(lesson().icon)} ${lesson().title}</span><button class="mode-switch" data-action="mode" ${activeCourse ? "disabled" : ""} aria-pressed="${!hintsEnabled()}">${icon(hintsEnabled() ? "Eye" : "EyeOff")} ${hintsEnabled() ? "引导模式" : "盲打模式"} ${icon("ChevronDown")}</button></div>${lessonId === "article" ? articleContextHTML() : ""}<div class="question-content"></div><div class="answer-entry"><label class="sr-only" for="typing-input">输入当前题目的小鹤双拼编码</label><input id="typing-input" class="typing-input" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="input-help input-feedback" aria-label="输入当前题目的小鹤双拼编码"><div class="answer-slots" aria-hidden="true"></div></div><p id="input-help" class="input-help">切换到英文输入法，按下对应字母键</p><p id="input-feedback" class="input-feedback" role="status" aria-live="polite"></p><div class="exercise-controls"><button class="text-button" data-action="hint">${icon("Lightbulb")} 显示提示</button><span class="control-divider"></span><button class="text-button" data-action="pause" id="pause-button">${icon("Pause")} 暂停</button><span class="control-divider"></span><button class="text-button" data-action="restart">${icon("RotateCcw")} 重新开始</button></div></div>` : `<div class="empty-state">${icon("CircleCheck")}<h2>${lessonId === "custom" ? "先添加你想练习的词组" : "暂时没有需要复习的题目"}</h2><p>${lessonId === "custom" ? "在我的词库填写词组与拼音，就能生成专属练习。" : "练习中出现的错题会自动收集到这里。"}</p><button class="primary-button" ${lessonId === "custom" ? 'data-page="library"' : 'data-lesson="initials"'}>${lessonId === "custom" ? "前往我的词库" : "开始声母练习"}</button></div>`}
  <div class="keyboard-area"><div class="keyboard-heading"><span>键位就在手边</span><div class="keyboard-legend"><span><b class="legend-initial"></b>声母</span><span><b class="legend-final"></b>韵母</span><button data-page="reference" aria-label="查看完整键位图">${icon("Expand")}</button></div></div>${keyboardHTML()}<div class="keyboard-foot"><span>${icon("Info")} 也可以点击屏幕键盘练习</span><span><kbd>Esc</kbd> 暂停 / 继续</span></div></div></section>
  <section class="next-section"><div class="section-title"><h2>打好基础，再向前一步</h2><span>按自己的节奏学习</span></div><div class="next-lessons">${lessons
    .slice(2, 5)
    .map(
      (l) =>
        `<button class="next-lesson" data-lesson="${l.id}"><span class="lesson-icon ${l.color}">${icon(l.icon)}</span><span><strong>${l.title}</strong><small>${l.subtitle}</small></span>${icon("ArrowUpRight", "next-arrow")}</button>`,
    )
    .join(
      "",
    )}</div></section><section class="article-invite"><span class="lesson-icon blue">${icon("BookOpen")}</span><div><h2>让词组，连成一句话。</h2><p>在完整语境中逐字跟练，找到连贯的输入节奏。</p></div><button class="secondary-button" data-page="articles">文章跟练 ${icon("ArrowRight")}</button></section></div>
  <aside class="learning-rail"><section class="path-panel"><div class="rail-title"><h2>你的学习路线</h2>${icon("Route")}</div><p class="rail-description">从一键开始，慢慢熟练</p><ol class="learning-path">${lessons
    .slice(0, 5)
    .map((l, i) => {
      const done = progress.records.some((r) => r.lesson === l.id);
      return `<li class="${lessonId === l.id ? "current" : ""} ${done ? "completed" : ""}"><button data-lesson="${l.id}" ${lessonId === l.id ? 'aria-current="step"' : ""}><span class="path-number">${done ? icon("Check") : i + 1}</span><span><strong>${l.title}</strong><small>${lessonId === l.id ? "正在练习" : done ? "已完成练习" : l.subtitle}</small></span>${lessonId === l.id ? '<span class="path-active-dot"></span>' : ""}</button></li>`;
    })
    .join(
      "",
    )}</ol><div class="path-note">${icon("Sparkles")} 不用着急，熟练比速度更重要。</div></section>
  <section class="goal-panel"><div class="rail-title"><h2>今日小目标</h2><span class="goal-icon">${icon("Flag")}</span></div><div class="goal-progress"><strong>${completedToday}<small> / ${progress.settings.goal} 题</small></strong><span>${Math.min(100, Math.round((completedToday / progress.settings.goal) * 100))}%</span></div><div class="goal-track"><span style="width:${Math.min(100, (completedToday / progress.settings.goal) * 100)}%"></span></div><p>${completedToday >= progress.settings.goal ? "今日目标已完成，给自己的坚持一个肯定。" : "每完成一轮练习，都在积累肌肉记忆。"}</p></section>
  <section class="tip-panel"><span class="tip-heading">${icon("Lightbulb")} 双拼小贴士</span><h3>一个汉字，两次敲击。</h3><p>第一键是声母，第二键是韵母。比如「双」的拼音 shuang，只需输入 <kbd>U</kbd> <kbd>L</kbd>。</p><button class="text-button" data-action="help">了解小鹤双拼 ${icon("ArrowRight")}</button><div class="tip-keycaps" aria-hidden="true"><span>U<small>sh</small></span><span>L<small>uang</small></span></div></section></aside></div>`;
}
function renderPracticeState() {
  if (
    page !== "practice" ||
    phase === "done" ||
    !current() ||
    !$(".question-content")
  )
    return;
  const q = current(),
    hint = hintsEnabled() || revealed;
  $(".question-content").innerHTML =
    `<p class="question-instruction">${phase === "paused" ? "练习已暂停" : lessonId === "initials" ? "这个声母，对应哪个键？" : lessonId === "finals" ? "这个韵母，对应哪个键？" : "用小鹤双拼，输入下面的" + (lessonId === "words" || lessonId === "custom" ? "词组" : lessonId === "article" ? "汉字" : "音节")}</p><div class="question-label ${q.label.length > 5 ? "long" : ""}">${phase === "paused" ? icon("Pause") : esc(q.label)}</div><p class="question-pinyin">${phase === "paused" ? "准备好了就继续吧" : q.label !== q.pinyin ? esc(q.pinyin) : lessonId === "initials" ? "声母" : lessonId === "finals" ? "韵母" : "零声母音节"}</p>`;
  $(".answer-slots").innerHTML = [...q.answer]
    .map(
      (key, i) =>
        `<span class="answer-slot ${i < typed.length ? "filled" : i === typed.length ? "cursor" : ""}">${i < typed.length ? typed[i].toUpperCase() : hint && phase !== "paused" ? key.toUpperCase() : ""}</span>`,
    )
    .join("");
  const input = $<HTMLInputElement>("#typing-input");
  input.disabled = phase === "paused";
  input.value = "";
  $("#input-help").textContent =
    phase === "paused"
      ? "点击继续按钮，或按 Esc 继续练习"
      : hint
        ? q.note
        : "切换到英文输入法，按下对应字母键";
  if (activeCourse?.mode === "check" && activeCourse.assisted)
    $(".course-round-context > p").textContent =
      "本轮查阅过提示或资料，成绩会记录，但不计为无提示验收。";
  $("#input-feedback").textContent = message;
  $("#input-feedback").classList.toggle("error", !!message);
  $("#pause-button").innerHTML =
    icon(phase === "paused" ? "Play" : "Pause") +
    (phase === "paused" ? "继续练习" : "暂停");
  document.querySelectorAll<HTMLButtonElement>(".key").forEach((k) => {
    k.classList.toggle(
      "expected",
      hint && phase !== "paused" && k.dataset.key === q.answer[typed.length],
    );
    k.classList.toggle("wrong-key", lastWrong && k.dataset.key === lastKey);
  });
  updateArticlePosition();
  refreshStats();
  createIcons({ icons });
}
function refreshStats() {
  if (page !== "practice" || phase === "done") return;
  const e = $("#timer");
  if (!e) return;
  e.textContent = timeLabel(seconds());
  $("#round-progress").textContent = String(index);
  $("#accuracy").textContent = attempts
    ? accuracy(correct, attempts) + "%"
    : "—";
  $("#streak").textContent = String(streak);
  $("#round-fill").style.transform =
    `scaleX(${queue.length ? index / queue.length : 0})`;
}
function resultHTML() {
  const acc = accuracy(correct, attempts);
  return `<div class="page-heading"><div><div class="heading-kicker">练习完成</div><h1>每一键，都算进步。</h1><p>${storageError ? "本轮结果尚未保存，请及时导出学习数据。" : "这一轮已记录，休息一下，或者再巩固一次。"}</p></div></div><section class="result-panel content-grid"><div class="result-emblem">${icon("PartyPopper")}</div><span class="result-tag">${lesson().title}${lessonId === "article" ? " · " + esc(getArticle(selectedGroups.article ?? defaultGroup("article")).title) : ""}</span><h2>${acc >= 95 ? "很棒，手指又熟悉了一些。" : "慢慢来，准确比速度更重要。"}</h2><p>完成 ${queue.length} 题，最高连续答对 ${bestStreak} 题</p><div class="result-stats"><div><strong>${acc}%</strong><span>按键准确率</span></div><div><strong>${timeLabel(elapsed)}</strong><span>有效练习时间</span></div><div><strong>${Math.round((completedKeys / Math.max(elapsed, 1)) * 60)}</strong><span>有效按键 / 分钟</span></div></div><div class="result-actions"><button class="primary-button" data-action="again">${icon("RotateCcw")} 再练一轮</button>${activeCourse ? `<button class="secondary-button" data-unit="${activeCourse.unitId}">返回本课</button>` : lessonId === "article" ? `<button class="secondary-button" data-page="articles">返回文章列表 ${icon("ArrowRight")}</button>` : `<button class="secondary-button" data-lesson="${lessons[Math.min(lessons.findIndex((l) => l.id === lessonId) + 1, 4)].id}">下一阶段 ${icon("ArrowRight")}</button>`}<button class="text-button" data-page="stats">查看学习记录</button></div>${activeCourse ? courseResultHTML(progress, activeCourse) : recommendationHTML()}<p class="result-footnote">速度按已完成题目的编码键数计算；暂停时间不计入。</p></section>`;
}
function referenceHTML() {
  return `<div class="page-heading"><div><div class="heading-kicker">随时查，不必一次背完</div><h1>把键位，记在手上。</h1><p>标准小鹤双拼方案，蓝色为韵母，紫色为复合声母。</p></div><button class="primary-button" data-page="practice">${icon("Keyboard")} 回到练习</button></div><div class="reference-content"><section class="reference-panel">${keyboardHTML(true)}<p class="muted">点击任一键，查看对应声母和韵母。单字母声母沿用原键位。</p><div class="key-detail" id="key-detail" role="status">选择一个键，看看它对应的拼音。</div></section><div class="rule-grid"><section class="info-panel"><h2>声母：大部分不需要重新记</h2><p>单字母声母保持原样，只需额外记住三个复合声母。</p><div class="mapping-trio"><span>zh <kbd>V</kbd></span><span>ch <kbd>I</kbd></span><span>sh <kbd>U</kbd></span></div></section><section class="info-panel"><h2>零声母：也要凑齐两键</h2><p>一个字母重复打：a → aa，o → oo，e → ee。<br>两个字母照原样：ai、an、ao、ei、en、er、ou。<br>三个字母首字母加韵母键：ang → ah，eng → eg。</p></section><section class="info-panel"><h2>ü 与 j、q、x、y</h2><p>ü 对应 V 键，例如：女 nv → nv，绿 lü → lv。<br>ju、qu、xu、yu 中的 u 也使用 V：ju → jv。<br>ue / üe 对应 T：学 xue → xt，略 lüe → lt。</p></section><section class="info-panel"><h2>词组：按每个字依次输入</h2><p>例如「你好」ni hao → ni hc，连续输入 nihc。<br>这里练习完整双拼音节，不使用音形辅助码或词组简码。</p><a href="https://flypy.cc/" target="_blank" rel="noopener noreferrer" class="inline-link">小鹤官方网站 ${icon("ExternalLink")}</a></section></div></div>`;
}
function reviewHTML() {
  const mistakes = Object.values(progress.mistakes).sort(
    (a, b) => b.count - a.count,
  );
  return `<div class="page-heading"><div><div class="heading-kicker">让下一次更熟练</div><h1>不熟悉的，再练一次。</h1><p>错题自动记录；每轮每题只出现一次，一次答对即从错题本移除。</p></div>${mistakes.length ? '<button class="primary-button" data-lesson="review">开始错题复习</button>' : ""}</div><section class="records-content info-panel">${!mistakes.length ? `<div class="empty-state">${icon("BookmarkCheck")}<h2>错题本还是空的</h2><p>从一次练习开始，我们会帮你记住需要巩固的键位。</p><button class="primary-button" data-lesson="initials">开始练习</button></div>` : `<div class="table-scroll"><table><thead><tr><th>练习内容</th><th>拼音</th><th>正确编码</th><th>错按次数</th></tr></thead><tbody>${mistakes.map((m) => `<tr><td><strong>${esc(m.question.label)}</strong>${m.question.id.startsWith("article-") ? `<small class="mistake-source">${esc(m.question.note.split("：")[0])}</small>` : ""}</td><td>${esc(m.question.pinyin)}</td><td><kbd>${esc(m.question.answer.toUpperCase())}</kbd></td><td>${m.count}</td></tr>`).join("")}</tbody></table></div>`}</section>`;
}
function statsHTML() {
  const records = [...progress.records].reverse(),
    total = records.reduce((s, r) => s + r.total, 0),
    totalAttempts = records.reduce((s, r) => s + r.attempts, 0),
    totalCorrect = records.reduce((s, r) => s + r.correct, 0),
    dates = new Set(records.map((r) => localDay(r.date)));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const count = records
      .filter((r) => localDay(r.date) === localDay(d))
      .reduce((s, r) => s + r.total, 0);
    return { label: `${d.getMonth() + 1}/${d.getDate()}`, count };
  });
  return `<div class="page-heading"><div><div class="heading-kicker">每一点积累，都有迹可循</div><h1>看见自己的进步。</h1><p>记录来自已完成的练习轮次，仅保存在当前浏览器。</p></div><div class="page-actions"><button class="secondary-button" data-action="import">${icon("BookOpen")} 导入备份</button><button class="secondary-button" data-action="export">${icon("Download")} 导出学习数据</button></div></div><div class="records-content">${recommendationHTML()}<div class="overview-stats"><section><span>累计练习</span><strong>${total}<small> 题</small></strong></section><section><span>按键准确率</span><strong>${totalAttempts ? accuracy(totalCorrect, totalAttempts) + "%" : "—"}</strong></section><section><span>练习天数</span><strong>${dates.size}<small> 天</small></strong></section><section><span>有效练习时间</span><strong>${Math.round(records.reduce((s, r) => s + r.seconds, 0) / 60)}<small> 分钟</small></strong></section></div><section class="info-panel activity-panel"><div class="rail-title"><h2>近七天的练习</h2><span class="muted">已完成题数</span></div>${activityHTML(days)}</section>${performanceHTML()}<section class="info-panel"><div class="rail-title"><h2>练习历史</h2><span class="muted">最近 ${Math.min(records.length, 30)} 轮</span></div>${
    records.length
      ? `<div class="table-scroll"><table><thead><tr><th>练习时间</th><th>内容</th><th>题数</th><th>准确率</th><th>用时</th><th>键 / 分钟</th></tr></thead><tbody>${records
          .slice(0, 30)
          .map(
            (r) =>
              `<tr><td>${new Date(r.date).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td><td>${r.lesson === "article" && r.articleId ? "文章 · " + esc(getArticle(r.articleId).title) : (lessons.find((l) => l.id === r.lesson)?.title ?? "练习")}${r.course ? `<small class="mistake-source">课程第 ${courseUnits.findIndex((u) => u.id === r.course!.unitId) + 1} 课 · ${r.course.mode === "guided" ? "有提示跟练" : r.course.assisted ? "验收用过提示" : "无提示验收"}</small>` : ""}</td><td>${r.total}</td><td>${accuracy(r.correct, r.attempts)}%</td><td>${timeLabel(r.seconds)}</td><td>${r.speed}</td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : `<div class="empty-state compact">${icon("ChartNoAxesCombined")}<h3>第一份进步记录，等你开始</h3><p>完成一轮练习后，这里会显示你的准确率和用时。</p><button class="primary-button" data-page="practice">开始练习</button></div>`
  }</section></div>`;
}
function dialogHTML(title: string, body: string) {
  dialogEpoch++;
  if (phase === "running") {
    elapsed = seconds();
    phase = "paused";
    persistRound();
    renderPracticeState();
  }
  const d = $<HTMLDialogElement>("#dialog");
  d.innerHTML = `<div class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-dialog" aria-label="关闭">${icon("X")}</button></div>${body}`;
  createIcons({ icons });
  d.showModal();
}
function help() {
  if (activeCourse?.mode === "check" && phase !== "done")
    activeCourse.assisted = true;
  dialogHTML(
    "两次敲击，一个汉字",
    `<div class="guide-demo"><span>双<small>shuang</small></span><b>=</b><kbd>U<small>sh</small></kbd><b>+</b><kbd>L<small>uang</small></kbd></div><ol class="guide-steps"><li><strong>先认声母，再记韵母</strong><p>除 zh → V、ch → I、sh → U 外，单字母声母保持原键位。韵母用一个按键表示。</p></li><li><strong>切换到英文输入法练习</strong><p>本网站直接检查英文字母编码。手机可以点输入区调出英文键盘，也可以点击屏幕键盘。</p></li><li><strong>从引导模式走向盲打</strong><p>引导模式显示答案和下一键的位置。熟悉以后切换盲打，遇到困难随时显示提示。</p></li><li><strong>错键会停留，答对自动进入下一题</strong><p>支持退格撤回当前题输入；Esc 暂停或继续，切换页面和离开浏览器会自动暂停。</p></li></ol><div class="dialog-note">本工具练习小鹤双拼音码，不包含音形辅助码。统计按有效按键计算，不等同于汉字输入速度。</div><button class="primary-button full-width" data-page="tutorial">按课程一步步学习</button><button class="text-button" data-action="close-dialog">明白了，开始练习</button>`,
  );
}
function settings() {
  dialogHTML(
    "找到你的练习节奏",
    `<form id="settings-form"><label class="setting-field">每轮题数<select name="count">${[10, 20, 50].map((n) => `<option value="${n}" ${progress.settings.count === n ? "selected" : ""}>${n} 题</option>`).join("")}</select></label><label class="setting-field">每日目标<select name="goal">${[20, 40, 100].map((n) => `<option value="${n}" ${progress.settings.goal === n ? "selected" : ""}>${n} 题</option>`).join("")}</select></label><label class="setting-toggle"><span><strong>键位引导</strong><small>显示答案，并点亮下一个按键</small></span><input type="checkbox" name="hints" ${progress.settings.hints ? "checked" : ""}></label><label class="setting-toggle"><span><strong>随机出题</strong><small>关闭后按课程顺序出题</small></span><input type="checkbox" name="random" ${progress.settings.random ? "checked" : ""}></label><label class="setting-toggle"><span><strong>按键音效</strong><small>用短音区分正确与错误</small></span><input type="checkbox" name="sound" ${progress.settings.sound ? "checked" : ""}></label><p class="dialog-note">题数与顺序在下一轮生效，当前练习进度会保留。文章跟练始终按全文顺序练习，不受题数与随机设置影响。</p><button class="primary-button full-width" type="submit">保存设置</button></form>`,
  );
}
let toastTimer: ReturnType<typeof setTimeout>;
function toast(text: string) {
  const e = $("#toast");
  e.textContent = text;
  e.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    e.hidden = true;
  }, 2800);
}
function exportData() {
  const blob = new Blob([JSON.stringify(progress, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `双键-学习记录-${localDay()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("学习数据已导出");
}
function confirmRestart() {
  if (!attempts || phase === "done") {
    startRound();
    render();
    return;
  }
  dialogHTML(
    "重新开始这一轮？",
    `<p class="dialog-copy">当前轮次尚未完成，重练后本轮用时和进度会清零，已收集的错题会保留。</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">继续这一轮</button><button class="primary-button" data-action="confirm-restart">重新开始</button></div>`,
  );
}
document.addEventListener("click", (e) => {
  const target = (e.target as Element).closest<HTMLElement>(
    "[data-action],[data-page],[data-lesson],[data-key],[data-article],[data-unit],[data-course-start],[data-course-read]",
  );
  if (!target) return;
  if (target.dataset.unit) {
    visitUnit(target.dataset.unit);
    return;
  }
  if (target.dataset.courseStart) {
    requestCourse(
      target.dataset.courseStart,
      target.dataset.courseMode as CourseMode,
    );
    return;
  }
  if (target.dataset.courseRead) {
    const id = target.dataset.courseRead;
    try {
      commitCandidate({
        ...progress,
        course: {
          ...progress.course,
          read: progress.course.read.includes(id)
            ? progress.course.read.filter((x) => x !== id)
            : [...progress.course.read, id],
        },
      });
      render();
    } catch (e) {
      toast((e as Error).message);
    }
    return;
  }
  if (target.dataset.article) {
    requestArticle(target.dataset.article);
    return;
  }
  if (target.dataset.page) {
    nav(target.dataset.page);
    return;
  }
  if (target.dataset.lesson) {
    const next = target.dataset.lesson as LessonId;
    if (
      (activeCourse || next !== lessonId || page !== "practice") &&
      attempts &&
      phase !== "done"
    ) {
      dialogHTML(
        "切换练习内容？",
        `<p class="dialog-copy">切换后会开始新的一轮，本轮尚未完成的进度不会计入历史；错题会保留。</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">保留当前练习</button><button class="primary-button" data-action="confirm-lesson" data-next="${next}">切换练习</button></div>`,
      );
    } else choose(next);
    return;
  }
  if (target.dataset.key) {
    if (page === "reference") {
      const key = target.dataset.key;
      $("#key-detail").textContent = `${key.toUpperCase()} 键：声母 ${
        Object.entries(INITIALS)
          .filter(([, v]) => v === key)
          .map(([p]) => p)
          .join(" / ") || "无"
      }；韵母 ${
        Object.entries(FINALS)
          .filter(([p, v]) => v === key && p !== "ve")
          .map(([p]) => (p === "v" ? "ü" : p))
          .join(" / ") || "无"
      }`;
    } else enterKey(target.dataset.key);
    return;
  }
  switch (target.dataset.action) {
    case "resume-round":
      if (page !== "practice") nav("practice");
      if (phase === "paused") pause();
      break;
    case "add-words":
      addWords();
      break;
    case "import":
      showImport();
      break;
    case "confirm-import":
      importData();
      break;
    case "confirm-group":
      $<HTMLDialogElement>("#dialog").close();
      applyGroup(target.dataset.group!);
      break;
    case "delete-word": {
      const q = progress.customWords.find(
        (q) => q.id === target.dataset.wordId,
      );
      if (q)
        dialogHTML(
          "删除这个词组？",
          `<p class="dialog-copy">将从词库中移除「${esc(q.label)}」。当前轮次、学习历史与错题记录都会保留。</p><p id="delete-error" class="form-error" role="alert" tabindex="-1" hidden></p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">保留词组</button><button class="primary-button" data-action="confirm-delete-word" data-word-id="${esc(q.id)}">确认删除</button></div>`,
        );
      break;
    }
    case "confirm-delete-word": {
      try {
        commitCandidate({
          ...progress,
          customWords: progress.customWords.filter(
            (q) => q.id !== target.dataset.wordId,
          ),
        });
        $<HTMLDialogElement>("#dialog").close();
        render();
        toast("词组已删除");
      } catch (e) {
        showFormError("#delete-error", (e as Error).message);
      }
      break;
    }
    case "help":
      help();
      break;
    case "settings":
      settings();
      break;
    case "close-dialog":
      $<HTMLDialogElement>("#dialog").close();
      break;
    case "confirm-course":
      $<HTMLDialogElement>("#dialog").close();
      beginCourse(
        target.dataset.next!,
        target.dataset.courseMode as CourseMode,
      );
      break;
    case "confirm-article":
      $<HTMLDialogElement>("#dialog").close();
      beginArticle(target.dataset.next!);
      break;
    case "confirm-lesson":
      $<HTMLDialogElement>("#dialog").close();
      choose(target.dataset.next as LessonId);
      break;
    case "mode":
      if (activeCourse) break;
      progress.settings.hints = !progress.settings.hints;
      save();
      render();
      break;
    case "hint":
      if (activeCourse) activeCourse.assisted = true;
      revealed = true;
      persistRound();
      renderPracticeState();
      break;
    case "pause":
      pause();
      break;
    case "restart":
      confirmRestart();
      break;
    case "confirm-restart":
    case "again":
      startRound();
      render();
      break;
    case "focus":
      if (page === "practice" && phase !== "done") $("#typing-input")?.focus();
      break;
    case "backspace":
      backspace();
      break;
    case "export":
      exportData();
      break;
  }
});
document.addEventListener("submit", (e) => {
  if ((e.target as HTMLElement).id === "words-form") {
    e.preventDefault();
    try {
      const additions = parseCustomWords(
        String(new FormData(e.target as HTMLFormElement).get("words") ?? ""),
      );
      const incoming = emptyProgress();
      incoming.customWords = additions;
      let latest = progress;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null && !storageError.startsWith("无法读取"))
        latest = mergeProgress(progress, parseProgress(raw));
      const candidate = mergeProgress(latest, incoming);
      const added = candidate.customWords.length - progress.customWords.length;
      commitCandidate(candidate);
      $<HTMLDialogElement>("#dialog").close();
      page = "library";
      render();
      toast(added ? `已加入 ${added} 个词组` : "这些词组已经在词库中");
    } catch (e) {
      showFormError("#words-error", (e as Error).message);
      $<HTMLTextAreaElement>("#words-text").setAttribute(
        "aria-invalid",
        "true",
      );
    }
    return;
  }
  if ((e.target as HTMLElement).id !== "settings-form") return;
  e.preventDefault();
  const form = new FormData(e.target as HTMLFormElement);
  progress.settings = {
    count: Number(form.get("count")),
    goal: Number(form.get("goal")),
    hints: form.has("hints"),
    random: form.has("random"),
    sound: form.has("sound"),
  };
  const saved = save();
  $<HTMLDialogElement>("#dialog").close();
  render();
  toast(saved ? "练习设置已保存" : "设置已应用于本次练习，无法保存到浏览器");
});
document.addEventListener("input", (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === "word-search") {
    $("#library-rows").innerHTML = libraryRows(input.value);
    createIcons({ icons });
    return;
  }
  if (input.id !== "typing-input" || (e as InputEvent).isComposing) return;
  if ((e as InputEvent).inputType === "deleteContentBackward") {
    backspace();
    return;
  }
  const val = input.value.toLowerCase();
  input.value = "";
  if (/[^a-z]/.test(val)) {
    message = "请切换到英文输入法，输入字母编码。";
    renderPracticeState();
    return;
  }
  for (const c of val) enterKey(c);
});
document.addEventListener("change", (e) => {
  const input = e.target as HTMLInputElement;
  if (input.id === "backup-file" && input.files?.[0]) {
    void readImport(input.files[0]);
    return;
  }
  if (input.id === "course-pace") {
    try {
      commitCandidate({
        ...progress,
        course: { ...progress.course, pace: input.value as CoursePace },
      });
      toast("练习量已保存，下一轮课后练习生效");
    } catch (e) {
      input.value = progress.course.pace;
      toast((e as Error).message);
    }
    return;
  }
  if (input.id === "training-group") {
    const groupId = input.value;
    if (attempts && phase !== "done") {
      input.value = selectedGroups[lessonId] ?? defaultGroup(lessonId);
      dialogHTML(
        "切换练习范围？",
        `<p class="dialog-copy">新的一轮将只练习所选内容。本轮尚未完成的进度不会计入历史，错题会保留。</p><div class="dialog-actions"><button class="secondary-button" data-action="close-dialog">保留当前范围</button><button class="primary-button" data-action="confirm-group" data-group="${esc(groupId)}">切换范围</button></div>`,
      );
    } else applyGroup(groupId);
  }
});
document.addEventListener("compositionend", (e) => {
  if ((e.target as HTMLElement).id === "typing-input") {
    $<HTMLInputElement>("#typing-input").value = "";
    message = "请先切换到英文输入法，再输入字母编码。";
    renderPracticeState();
  }
});
document.addEventListener("keydown", (e) => {
  if ($<HTMLDialogElement>("#dialog")?.open) return;
  const el = e.target as HTMLElement;
  const isInput = el.matches("input,select,textarea,[contenteditable]");
  if (
    e.key === "Escape" &&
    page === "practice" &&
    current() &&
    phase !== "done"
  ) {
    e.preventDefault();
    pause();
    return;
  }
  if (page !== "practice" || phase === "done") return;
  if (e.key === "Backspace" && (!isInput || el.id === "typing-input")) {
    e.preventDefault();
    backspace();
    return;
  }
  if (
    !isInput &&
    !e.ctrlKey &&
    !e.metaKey &&
    !e.altKey &&
    /^[a-zA-Z]$/.test(e.key)
  ) {
    e.preventDefault();
    enterKey(e.key.toLowerCase());
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && phase === "running") {
    elapsed = seconds();
    phase = "paused";
    persistRound();
    renderPracticeState();
  }
});
window.addEventListener("popstate", () => {
  const hash = location.hash.slice(1);
  if (
    [
      "practice",
      "reference",
      "review",
      "stats",
      "library",
      "articles",
      "tutorial",
    ].includes(hash)
  )
    nav(hash);
});
window.addEventListener("beforeunload", (e) => {
  if (attempts && phase !== "done" && !persistRound()) {
    e.preventDefault();
  }
});
window.addEventListener("pagehide", () => {
  persistRound();
});
setInterval(refreshStats, 500);
restoreRound();
if (
  ["reference", "review", "stats", "library", "articles", "tutorial"].includes(
    location.hash.slice(1),
  )
)
  page = location.hash.slice(1);
render();
