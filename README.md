# 双键 · 小鹤双拼练习

一个打开即可使用的小鹤双拼练习网站。练习声母、韵母、零声母、单字和高频词组，再通过错题复习巩固薄弱键位。

## 本地运行

需要 Node.js 22.12+（或 20.19+）。

```bash
npm ci
npm run dev
```

打开终端显示的本地地址。切换为英文输入法，直接按键或点击屏幕键盘；手机点击输入区调出英文键盘。正确后自动进入下一题，错键停留，退格撤回当前题，Esc 暂停或继续。切换功能页面、打开弹窗或隐藏浏览器页面会暂停计时。

## 功能

- 声母、韵母、零声母、单字、高频词组分阶段练习。
- 引导 / 盲打模式、即时纠错、单题提示、交互键盘、暂停与重练。
- 可设置每轮 10 / 20 / 50 题、随机顺序、音效和每日目标。
- 轮次结算、七天练习统计、练习历史、错题本和针对性复习。
- 键位速查、新手指南、响应式布局、键盘焦点、减少动态效果支持。
- 本地保存学习数据，支持 JSON 导出；无账号、无上传、无虚构学习数据。

## 数据与统计

数据存于当前浏览器的 `localStorage`（`shuangjian-progress-v1`），不同设备不会自动同步，清除浏览器数据会丢失记录。学习记录页面可导出 JSON 快照。历史保留最近 500 轮；未完成轮次不记入历史，错题即时保存。记录损坏时保留原数据并提示，不自动覆盖。

准确率 = 正确按键次数 / 总尝试按键次数。有效按键速度 = 已完成题目的编码长度 / 有效练习分钟数，**不等同于汉字/分钟**。暂停时间不计入。复习中一次无错完成的题目会移出错题本。

## 验证与构建

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

浏览器测试使用 Playwright 自带 Chromium；可通过 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 指定已安装的 Chromium。`npm run build` 包含 TypeScript 检查并生成 `dist/`；可部署至任意静态托管平台。Sites 的身份和静态产物目录见 `.openai/hosting.json`。

## 技术与规则

Vite、TypeScript、GSAP、Lucide。GSAP 仅用于短暂入场与纠错反馈，尊重 `prefers-reduced-motion`。字体使用 Noto Sans SC，加载失败回退系统中文字体。

练习使用标准小鹤双拼音码，按音节顺序完整输入，不包含小鹤音形辅助码或词组简码。规则依据 [小鹤官网](https://flypy.cc/) 与 [Rime 官方小鹤方案](https://github.com/rime/rime-double-pinyin/blob/master/double_pinyin_flypy.schema.yaml)。词库采用人工标注拼音以消除多音字歧义。

开发计划、设计和验收标准见 [docs/PLAN.md](docs/PLAN.md)。
