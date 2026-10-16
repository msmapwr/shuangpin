# 第二轮功能验收

本轮没有增加依赖。保留原练习流程和 v1 存储格式，扩展分组、自定义词库与备份恢复。

| 目标                                                 | 自动验证证据                                                                                             |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 按组出题、取消切换保留进度                           | `focused groups restrict questions and cancelling a switch preserves round progress`                     |
| 分组完整且无重复、后鼻韵母不混入前鼻韵母             | `focused groups cover every base question once without mixing nasal finals`                              |
| 自定义词组的拼音归一化和完整双拼编码                 | `custom words normalize spelling and calculate whole phrase codes`                                       |
| 行号错误提示、字数/音节数校验、重复词去重            | `custom parsing reports the invalid line, rejects mismatched readings and deduplicates`                  |
| 词库保存、搜索、练习、删除确认                       | `custom words validate, persist, search, generate practice and require deletion confirmation`            |
| 兼容第一版备份                                       | `v1 backups without customWords retain history, settings and canonical mistakes`                         |
| 导入先预览、取消不修改、重复导入不累计、设置可选恢复 | `backup preview and cancel leave data unchanged; repeated merge is idempotent and settings are optional` |
| 保护本机数据、合并错题次数与日期、不改变输入对象     | `merge is idempotent, preserves local data, and takes maximum mistake count and latest date`             |
| 冲突取消与最新 500 轮限制                            | `record conflicts stop a merge while newest 500 records are retained chronologically`                    |
| 自定义词库超限不静默删除                             | `combined custom word capacity rejects overflow rather than silently dropping words`                     |
| 拒绝伪造编码和过大文件                               | `invalid backup answers and oversized files cannot modify local progress`                                |
| 损坏原记录先保留副本再恢复                           | `restoring corrupt storage preserves its original bytes in a recovery copy`                              |
| 写入失败后原数据不变，可继续重试                     | `storage failure leaves the original backup and the import dialog available to retry`                    |
| 375px、667px 横屏、1440px 页面和表单                 | `library and forms remain within the viewport on phones, landscape and desktop`                          |
| 动态开启减少动画后内容可见                           | `enabling reduced motion during a transition keeps the page visible`                                     |
| 连续选文件时只使用最后选中的备份                     | `a slower previously selected backup cannot replace the latest file preview`                             |

验证命令：

```bash
npm test
npm run build
npm run format:check
npm run test:e2e
```

本地结果：17 项 Node 测试、18 项浏览器测试、TypeScript 检查、生产构建和格式检查通过。浏览器测试覆盖桌面 Chromium 与模拟手机尺寸，未执行真机 Safari / Android 验证。

边界：词组拼音由用户指定；工具不验证汉字和读音的语义对应。备份是快照合并，旧备份可能带回已经移除的错题；最多保留最近 500 轮。数据不自动跨设备同步。
