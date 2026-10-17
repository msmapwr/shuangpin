# 第三轮功能验收

范围：学习建议、分阶段表现、连续练习天数、当前标签页刷新续练，以及不重复凑题的错题复习。未增加依赖，保留 v1 学习数据和备份格式。

| 目标                                           | 自动验证证据                                                                                                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 最近三轮按尝试次数加权，不伪造缺失指标         | `lesson summaries weight the latest three rounds and leave missing metrics empty`                                                                           |
| 同时间戳仍取最后追加的轮次                     | `same-timestamp summaries still prefer the last appended rounds`                                                                                            |
| 错题、未练阶段、近期较弱阶段的建议顺序         | `recommendations prioritize active mistakes, then an unstarted stage`；`after all stages recommendations use the weakest recent accuracy or continue words` |
| 日历天数去重、今天/昨天起算与断档边界          | `practice streaks use distinct calendar days ending today or yesterday and stop at gaps`                                                                    |
| 快照保留半题输入、提示、时间和轮次 ID          | `round snapshots retain partial input, timing, hints and the original round ID`                                                                             |
| 拒绝伪造答案、错误课程范围和不一致计数         | `round parser rejects forged answers and lesson or group mismatches`；`inconsistent counters, completed input and invalid timing cannot be restored`        |
| 已完成轮次不恢复、不重复结算                   | `missing and already-completed rounds are never replayed`；`completed or invalid snapshots cannot change recorded history`                                  |
| 刷新恢复暂停，等待不计时，沿用 ID 仅保存一次   | `refresh restores partial input and pauses timing, then saves the same round only once`                                                                     |
| 保留分组与退格后的当前输入                     | `restored focused groups and backspaced input survive a refresh`                                                                                            |
| 无效临时数据保留原始副本，不改变历史           | `forged temporary answers are rejected while the original temporary bytes are preserved`                                                                    |
| 标签页隔离、暂存失败有提示                     | `temporary progress stays isolated to its tab and reports storage failures`                                                                                 |
| 少量错题各出现一次，按真实题数结算             | `a short review round visits each existing mistake once and completes without filler questions`                                                             |
| 建议与课程表现使用真实数据，并可直接进入练习   | `study advice and stage summaries use real records and navigate to the suggested lesson`                                                                    |
| 手机/桌面恢复提示和无数据展示不溢出            | `empty insights and restored-round notices fit 375px without invented metrics`；同名 1440px 用例                                                            |
| 备份临时数据失败时保留原内容，明确重练后才替换 | `failed recovery-copy writes preserve damaged temporary data until an explicit restart`                                                                     |

验证命令：`npm test`、`npm run build`、`npm run format:check`、`npm run test:e2e`。

本地验证包含 27 项 Node 测试与 28 项浏览器测试。浏览器使用 Chromium，覆盖桌面和模拟手机尺寸；没有执行真机 Safari / Android 验证。

边界：临时进度仅属于当前标签页，不保证关闭标签页后仍可恢复，也不参与 JSON 导出。建议基于现有记录，不推断未记录的盲打掌握程度；阶段表现仅展示五个基础阶段。历史受最近 500 轮保留范围限制。
