import { gsap } from "gsap";
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
  questionsFor,
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
  type Progress,
} from "./progress.ts";

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
try {
  progress = parseProgress(localStorage.getItem(STORAGE_KEY));
} catch {
  storageError = "无法读取学习记录。原数据已保留，本次可以继续练习。";
}
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
    gsap.globalTimeline.clear();
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
function pool() {
  return lessonId === "review"
    ? Object.values(progress.mistakes)
        .sort((a, b) => b.count - a.count)
        .map((m) => m.question)
    : questionsFor(lessonId);
}
function startRound() {
  queue = makeQueue(pool(), progress.settings.count, progress.settings.random);
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
}
function pause() {
  if (phase === "running" || phase === "ready") {
    elapsed = seconds();
    phase = "paused";
  } else if (phase === "paused") {
    phase = "running";
    startedAt = performance.now();
  }
  renderPracticeState();
}
function nav(pageId: string) {
  if (phase === "running") {
    elapsed = seconds();
    phase = "paused";
  }
  page = pageId;
  render();
}
function choose(id: LessonId) {
  if (lessonId !== id || page !== "practice") {
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
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      lesson: lessonId,
      total: queue.length,
      attempts,
      correct,
      seconds: elapsed,
      speed: Math.round((completedKeys / Math.max(elapsed, 1)) * 60),
    });
    progress.records = progress.records.slice(-500);
    roundSaved = true;
    save();
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
    message = `按键 ${key.toUpperCase()} 不匹配，再试一次。${progress.settings.hints || revealed ? `当前需要 ${current().answer[typed.length].toUpperCase()} 键。` : "可以点击「显示提示」查看键位。"}`;
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
  renderPracticeState();
}
function backspace() {
  if (page === "practice" && (phase === "running" || phase === "ready")) {
    typed = typed.slice(0, -1);
    message = "";
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
  return `<button class="nav-item ${page === id ? "active" : ""}" data-page="${id}">${icon(name)}<span>${label}</span>${count ? `<span class="nav-count">${count}</span>` : ""}</button>`;
}
function render() {
  animation?.revert();
  const allDone = progress.records.reduce((sum, r) => sum + r.total, 0);
  $("#app").innerHTML =
    `<a class="skip-link" href="#main">跳到主内容</a><aside class="sidebar"><a class="brand" href="#practice" aria-label="双键首页"><span class="brand-mark"><span></span><span></span></span><span>双键<span class="brand-sub">让双拼，成为习惯</span></span></a><div class="nav-group-label">学习空间</div><nav aria-label="主导航">${navItem("practice", "开始练习", "Keyboard")}${navItem("reference", "键位速查", "BookOpen")}${navItem("review", "错题本", "Bookmark", String(Object.keys(progress.mistakes).length))}${navItem("stats", "学习记录", "ChartNoAxesCombined")}</nav><div class="sidebar-course"><div class="sidebar-course-title">循序渐进，一步一步来</div><div class="course-line"><span style="width:${Math.min((allDone / 200) * 100, 100)}%"></span></div><p>已完成 ${allDone} 题练习</p></div><div class="sidebar-bottom"><div class="small-tip">${icon("Sprout")}<p>每天一点点，<br>让手指记住每个键位。</p></div><button class="nav-item" data-action="help">${icon("CircleHelp")}<span>入门指南</span>${icon("ArrowUpRight", "small")}</button><button class="nav-item" data-action="settings">${icon("Settings2")}<span>练习设置</span></button><div class="local-status"><span></span> 学习数据仅保存在本机</div></div></aside>
  <div class="workspace"><header class="topbar"><div class="breadcrumb">我的学习空间 ${icon("ChevronRight")}<span>${({ practice: "开始练习", reference: "键位速查", review: "错题本", stats: "学习记录" } as Record<string, string>)[page]}</span></div><div class="topbar-right"><span class="scheme-indicator"><span></span>小鹤双拼</span><button class="avatar" data-action="settings" aria-label="打开个人练习设置">双</button></div></header><main id="main" tabindex="-1"><div id="storage-warning" role="status" class="storage-warning" ${storageError ? "" : "hidden"}>${esc(storageError)}</div>${page === "practice" ? practiceHTML() : page === "reference" ? referenceHTML() : page === "review" ? reviewHTML() : statsHTML()}</main><footer class="footer"><span>双键<span class="footer-dot">·</span>每一次敲击，都离熟练更近一点。</span><a href="https://github.com/msmapwr/shuangpin" target="_blank" rel="noopener noreferrer">${icon("Github")} 开源项目</a></footer></div><div id="toast" role="status" class="toast" hidden></div><dialog id="dialog" aria-labelledby="dialog-title"></dialog>`;
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
function practiceHTML() {
  const completedToday = progress.records
    .filter((r) => localDay(r.date) === localDay())
    .reduce((sum, r) => sum + r.total, 0);
  if (phase === "done") return resultHTML();
  return `<div class="page-heading"><div><div class="heading-kicker">把全拼，变成两次敲击</div><h1>今天，也进步一点。</h1><p>从认识键位到自然输入，找到属于你的打字节奏。</p></div><button class="quiet-button" data-action="help">${icon("BookOpen")} 新手指南</button></div>
  <div class="content-grid"><div class="practice-column"><section class="practice-panel" aria-label="练习台"><div class="panel-toolbar"><div class="lesson-tabs" role="group" aria-label="基础练习类型">${lessons
    .slice(0, 2)
    .map(
      (l) =>
        `<button class="lesson-tab ${lessonId === l.id ? "selected" : ""}" data-lesson="${l.id}" aria-pressed="${lessonId === l.id}">${l.title}</button>`,
    )
    .join(
      "",
    )}<button class="lesson-tab ${!["initials", "finals"].includes(lessonId) ? "selected" : ""}" data-lesson="${["initials", "finals"].includes(lessonId) ? "words" : lessonId}" aria-pressed="${!["initials", "finals"].includes(lessonId)}">${["initials", "finals"].includes(lessonId) ? "词组练习" : lesson().title}</button></div><button class="icon-button" data-action="settings" aria-label="练习设置">${icon("SlidersHorizontal")}</button></div>
  <div class="session-stats"><div><span class="stat-label">本轮进度</span><strong><span id="round-progress">0</span><small> / ${queue.length}</small></strong></div><div><span class="stat-label">准确率</span><strong id="accuracy">—</strong></div><div><span class="stat-label">练习用时</span><strong id="timer">00:00</strong></div><div><span class="stat-label">连续答对</span><strong><span id="streak">0</span><small> 题</small></strong></div></div><div class="round-track"><div id="round-fill"></div></div>
  ${queue.length ? `<div class="exercise"><div class="exercise-topline"><span class="lesson-caption">${icon(lesson().icon)} ${lesson().title}</span><button class="mode-switch" data-action="mode" aria-pressed="${!progress.settings.hints}">${icon(progress.settings.hints ? "Eye" : "EyeOff")} ${progress.settings.hints ? "引导模式" : "盲打模式"} ${icon("ChevronDown")}</button></div><div class="question-content"></div><div class="answer-entry"><label class="sr-only" for="typing-input">输入当前题目的小鹤双拼编码</label><input id="typing-input" class="typing-input" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-describedby="input-help input-feedback" aria-label="输入当前题目的小鹤双拼编码"><div class="answer-slots" aria-hidden="true"></div></div><p id="input-help" class="input-help">切换到英文输入法，按下对应字母键</p><p id="input-feedback" class="input-feedback" role="status" aria-live="polite"></p><div class="exercise-controls"><button class="text-button" data-action="hint">${icon("Lightbulb")} 显示提示</button><span class="control-divider"></span><button class="text-button" data-action="pause" id="pause-button">${icon("Pause")} 暂停</button><span class="control-divider"></span><button class="text-button" data-action="restart">${icon("RotateCcw")} 重新开始</button></div></div>` : `<div class="empty-state">${icon("CircleCheck")}<h2>暂时没有需要复习的题目</h2><p>练习中出现的错题会自动收集到这里。</p><button class="primary-button" data-lesson="initials">开始声母练习</button></div>`}
  <div class="keyboard-area"><div class="keyboard-heading"><span>键位就在手边</span><div class="keyboard-legend"><span><b class="legend-initial"></b>声母</span><span><b class="legend-final"></b>韵母</span><button data-page="reference" aria-label="查看完整键位图">${icon("Expand")}</button></div></div>${keyboardHTML()}<div class="keyboard-foot"><span>${icon("Info")} 也可以点击屏幕键盘练习</span><span><kbd>Esc</kbd> 暂停 / 继续</span></div></div></section>
  <section class="next-section"><div class="section-title"><h2>打好基础，再向前一步</h2><span>按自己的节奏学习</span></div><div class="next-lessons">${lessons
    .slice(2, 5)
    .map(
      (l) =>
        `<button class="next-lesson" data-lesson="${l.id}"><span class="lesson-icon ${l.color}">${icon(l.icon)}</span><span><strong>${l.title}</strong><small>${l.subtitle}</small></span>${icon("ArrowUpRight", "next-arrow")}</button>`,
    )
    .join("")}</div></section></div>
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
    hint = progress.settings.hints || revealed;
  $(".question-content").innerHTML =
    `<p class="question-instruction">${phase === "paused" ? "练习已暂停" : lessonId === "initials" ? "这个声母，对应哪个键？" : lessonId === "finals" ? "这个韵母，对应哪个键？" : "用小鹤双拼，输入下面的" + (lessonId === "words" ? "词组" : "音节")}</p><div class="question-label ${q.label.length > 5 ? "long" : ""}">${phase === "paused" ? icon("Pause") : esc(q.label)}</div><p class="question-pinyin">${phase === "paused" ? "准备好了就继续吧" : q.label !== q.pinyin ? esc(q.pinyin) : lessonId === "initials" ? "声母" : lessonId === "finals" ? "韵母" : "零声母音节"}</p>`;
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
  return `<div class="page-heading"><div><div class="heading-kicker">练习完成</div><h1>每一键，都算进步。</h1><p>${storageError ? "本轮结果尚未保存，请及时导出学习数据。" : "这一轮已记录，休息一下，或者再巩固一次。"}</p></div></div><section class="result-panel content-grid"><div class="result-emblem">${icon("PartyPopper")}</div><span class="result-tag">${lesson().title}</span><h2>${acc >= 95 ? "很棒，手指又熟悉了一些。" : "慢慢来，准确比速度更重要。"}</h2><p>完成 ${queue.length} 题，最高连续答对 ${bestStreak} 题</p><div class="result-stats"><div><strong>${acc}%</strong><span>按键准确率</span></div><div><strong>${timeLabel(elapsed)}</strong><span>有效练习时间</span></div><div><strong>${Math.round((completedKeys / Math.max(elapsed, 1)) * 60)}</strong><span>有效按键 / 分钟</span></div></div><div class="result-actions"><button class="primary-button" data-action="again">${icon("RotateCcw")} 再练一轮</button><button class="secondary-button" data-lesson="${lessons[Math.min(lessons.findIndex((l) => l.id === lessonId) + 1, 4)].id}">下一阶段 ${icon("ArrowRight")}</button><button class="text-button" data-page="stats">查看学习记录</button></div><p class="result-footnote">速度按已完成题目的编码键数计算；暂停时间不计入。</p></section>`;
}
function referenceHTML() {
  return `<div class="page-heading"><div><div class="heading-kicker">随时查，不必一次背完</div><h1>把键位，记在手上。</h1><p>标准小鹤双拼方案，蓝色为韵母，紫色为复合声母。</p></div><button class="primary-button" data-page="practice">${icon("Keyboard")} 回到练习</button></div><div class="reference-content"><section class="reference-panel">${keyboardHTML(true)}<p class="muted">点击任一键，查看对应声母和韵母。单字母声母沿用原键位。</p><div class="key-detail" id="key-detail" role="status">选择一个键，看看它对应的拼音。</div></section><div class="rule-grid"><section class="info-panel"><h2>声母：大部分不需要重新记</h2><p>单字母声母保持原样，只需额外记住三个复合声母。</p><div class="mapping-trio"><span>zh <kbd>V</kbd></span><span>ch <kbd>I</kbd></span><span>sh <kbd>U</kbd></span></div></section><section class="info-panel"><h2>零声母：也要凑齐两键</h2><p>一个字母重复打：a → aa，o → oo，e → ee。<br>两个字母照原样：ai、an、ao、ei、en、er、ou。<br>三个字母首字母加韵母键：ang → ah，eng → eg。</p></section><section class="info-panel"><h2>ü 与 j、q、x、y</h2><p>ü 对应 V 键，例如：女 nv → nv，绿 lü → lv。<br>ju、qu、xu、yu 中的 u 也使用 V：ju → jv。<br>ue / üe 对应 T：学 xue → xt，略 lüe → lt。</p></section><section class="info-panel"><h2>词组：按每个字依次输入</h2><p>例如「你好」ni hao → ni hc，连续输入 nihc。<br>这里练习完整双拼音节，不使用音形辅助码或词组简码。</p><a href="https://flypy.cc/" target="_blank" rel="noopener noreferrer" class="inline-link">小鹤官方网站 ${icon("ExternalLink")}</a></section></div></div>`;
}
function reviewHTML() {
  const mistakes = Object.values(progress.mistakes).sort(
    (a, b) => b.count - a.count,
  );
  return `<div class="page-heading"><div><div class="heading-kicker">让下一次更熟练</div><h1>不熟悉的，再练一次。</h1><p>错题自动记录；复习时一次答对，即从错题本移除。</p></div>${mistakes.length ? '<button class="primary-button" data-lesson="review">开始错题复习</button>' : ""}</div><section class="records-content info-panel">${!mistakes.length ? `<div class="empty-state">${icon("BookmarkCheck")}<h2>错题本还是空的</h2><p>从一次练习开始，我们会帮你记住需要巩固的键位。</p><button class="primary-button" data-lesson="initials">开始练习</button></div>` : `<div class="table-scroll"><table><thead><tr><th>练习内容</th><th>拼音</th><th>正确编码</th><th>错按次数</th></tr></thead><tbody>${mistakes.map((m) => `<tr><td><strong>${esc(m.question.label)}</strong></td><td>${esc(m.question.pinyin)}</td><td><kbd>${esc(m.question.answer.toUpperCase())}</kbd></td><td>${m.count}</td></tr>`).join("")}</tbody></table></div>`}</section>`;
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
  const max = Math.max(...days.map((d) => d.count), 1);
  return `<div class="page-heading"><div><div class="heading-kicker">每一点积累，都有迹可循</div><h1>看见自己的进步。</h1><p>记录来自已完成的练习轮次，仅保存在当前浏览器。</p></div><button class="secondary-button" data-action="export">${icon("Download")} 导出学习数据</button></div><div class="records-content"><div class="overview-stats"><section><span>累计练习</span><strong>${total}<small> 题</small></strong></section><section><span>按键准确率</span><strong>${totalAttempts ? accuracy(totalCorrect, totalAttempts) + "%" : "—"}</strong></section><section><span>练习天数</span><strong>${dates.size}<small> 天</small></strong></section><section><span>有效练习时间</span><strong>${Math.round(records.reduce((s, r) => s + r.seconds, 0) / 60)}<small> 分钟</small></strong></section></div><section class="info-panel activity-panel"><div class="rail-title"><h2>近七天的练习</h2><span class="muted">已完成题数</span></div><div class="activity-chart" role="img" aria-label="${days.map((d) => d.label + "：" + d.count + "题").join("；")}">${days.map((d) => `<div class="chart-column"><span>${d.count}</span><div class="chart-bar-space"><div class="chart-bar" style="height:${(d.count / max) * 100}%"></div></div><span>${d.label}</span></div>`).join("")}</div></section><section class="info-panel"><div class="rail-title"><h2>练习历史</h2><span class="muted">最近 ${Math.min(records.length, 30)} 轮</span></div>${
    records.length
      ? `<div class="table-scroll"><table><thead><tr><th>练习时间</th><th>内容</th><th>题数</th><th>准确率</th><th>用时</th><th>键 / 分钟</th></tr></thead><tbody>${records
          .slice(0, 30)
          .map(
            (r) =>
              `<tr><td>${new Date(r.date).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</td><td>${lessons.find((l) => l.id === r.lesson)?.title ?? "练习"}</td><td>${r.total}</td><td>${accuracy(r.correct, r.attempts)}%</td><td>${timeLabel(r.seconds)}</td><td>${r.speed}</td></tr>`,
          )
          .join("")}</tbody></table></div>`
      : `<div class="empty-state compact">${icon("ChartNoAxesCombined")}<h3>第一份进步记录，等你开始</h3><p>完成一轮练习后，这里会显示你的准确率和用时。</p><button class="primary-button" data-page="practice">开始练习</button></div>`
  }</section></div>`;
}
function dialogHTML(title: string, body: string) {
  if (phase === "running") {
    elapsed = seconds();
    phase = "paused";
    renderPracticeState();
  }
  const d = $<HTMLDialogElement>("#dialog");
  d.innerHTML = `<div class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="icon-button" data-action="close-dialog" aria-label="关闭">${icon("X")}</button></div>${body}`;
  createIcons({ icons });
  d.showModal();
}
function help() {
  dialogHTML(
    "两次敲击，一个汉字",
    `<div class="guide-demo"><span>双<small>shuang</small></span><b>=</b><kbd>U<small>sh</small></kbd><b>+</b><kbd>L<small>uang</small></kbd></div><ol class="guide-steps"><li><strong>先认声母，再记韵母</strong><p>除 zh → V、ch → I、sh → U 外，单字母声母保持原键位。韵母用一个按键表示。</p></li><li><strong>切换到英文输入法练习</strong><p>本网站直接检查英文字母编码。手机可以点输入区调出英文键盘，也可以点击屏幕键盘。</p></li><li><strong>从引导模式走向盲打</strong><p>引导模式显示答案和下一键的位置。熟悉以后切换盲打，遇到困难随时显示提示。</p></li><li><strong>错键会停留，答对自动进入下一题</strong><p>支持退格撤回当前题输入；Esc 暂停或继续，切换页面和离开浏览器会自动暂停。</p></li></ol><div class="dialog-note">本工具练习小鹤双拼音码，不包含音形辅助码。统计按有效按键计算，不等同于汉字输入速度。</div><button class="primary-button full-width" data-action="close-dialog">明白了，开始练习</button>`,
  );
}
function settings() {
  dialogHTML(
    "找到你的练习节奏",
    `<form id="settings-form"><label class="setting-field">每轮题数<select name="count">${[10, 20, 50].map((n) => `<option value="${n}" ${progress.settings.count === n ? "selected" : ""}>${n} 题</option>`).join("")}</select></label><label class="setting-field">每日目标<select name="goal">${[20, 40, 100].map((n) => `<option value="${n}" ${progress.settings.goal === n ? "selected" : ""}>${n} 题</option>`).join("")}</select></label><label class="setting-toggle"><span><strong>键位引导</strong><small>显示答案，并点亮下一个按键</small></span><input type="checkbox" name="hints" ${progress.settings.hints ? "checked" : ""}></label><label class="setting-toggle"><span><strong>随机出题</strong><small>关闭后按课程顺序出题</small></span><input type="checkbox" name="random" ${progress.settings.random ? "checked" : ""}></label><label class="setting-toggle"><span><strong>按键音效</strong><small>用短音区分正确与错误</small></span><input type="checkbox" name="sound" ${progress.settings.sound ? "checked" : ""}></label><p class="dialog-note">题数与顺序在下一轮生效，当前练习进度会保留。</p><button class="primary-button full-width" type="submit">保存设置</button></form>`,
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
    "[data-action],[data-page],[data-lesson],[data-key]",
  );
  if (!target) return;
  if (target.dataset.page) {
    nav(target.dataset.page);
    return;
  }
  if (target.dataset.lesson) {
    const next = target.dataset.lesson as LessonId;
    if (next !== lessonId && attempts && phase !== "done") {
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
    case "help":
      help();
      break;
    case "settings":
      settings();
      break;
    case "close-dialog":
      $<HTMLDialogElement>("#dialog").close();
      break;
    case "confirm-lesson":
      $<HTMLDialogElement>("#dialog").close();
      choose(target.dataset.next as LessonId);
      break;
    case "mode":
      progress.settings.hints = !progress.settings.hints;
      save();
      render();
      break;
    case "hint":
      revealed = true;
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
    renderPracticeState();
  }
});
window.addEventListener("popstate", () => {
  const hash = location.hash.slice(1);
  if (["practice", "reference", "review", "stats"].includes(hash)) nav(hash);
});
window.addEventListener("beforeunload", (e) => {
  if (attempts && phase !== "done") {
    e.preventDefault();
  }
});
setInterval(refreshStats, 500);
startRound();
if (["reference", "review", "stats"].includes(location.hash.slice(1)))
  page = location.hash.slice(1);
render();
