> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

# 领域技能(Domain Skills)

> **适用范围:** domain-skills 是 gstack 自研浏览器引擎(`$B`)的功能,是 Aside 浏览器不在场时的**回退**(Linux、Windows、Aside 未打开)。驱动 Aside 的 skill 改为通过 `/learn` 记录按项目的经验。参见 [BROWSER.md](../BROWSER.md)。

这是 agent 为自己写的按站点笔记,并且跨会话复利:agent 一旦搞清某个网站的非显而易见之处,就保存成一条 skill,之后该主机上的每个新会话都会把这条笔记注入提示词上下文。

这是 gstack 向 [browser-use/browser-harness](https://github.com/browser-use/browser-harness) 的借鉴:只抄"按站点笔记"模式,**不抄**"自修改运行时"模式。skill 是加载进提示词的 Markdown 文本,不是可执行代码。

## Agent 如何使用

```bash
# Agent 在任务成功后把学到的东西记下来。
# 主机名自动取自活动标签页(不需要 agent 传参)。
echo "# LinkedIn Apply Button

The Apply button on /jobs/view pages is inside an iframe with a class
matching 'jobs-apply-button-iframe'. Use \$B frame --url 'apply' first,
then snapshot." | $B domain-skill save

# 查看已保存的技能
$B domain-skill list

# 读取某个主机技能的正文
$B domain-skill show linkedin.com

# 在 $EDITOR 里交互式编辑
$B domain-skill edit linkedin.com

# 把项目级技能提升为全局(跨项目)
$B domain-skill promote-to-global linkedin.com

# 回滚一次最近的编辑
$B domain-skill rollback linkedin.com

# 删除(墓碑标记——可通过 rollback 恢复)
$B domain-skill rm linkedin.com
```

## 状态机

```
  ┌──────────────┐  3 successful uses        ┌────────┐  promote-to-global   ┌────────┐
  │ quarantined  │ ─────────────────────▶  │ active │ ──────────────────▶  │ global │
  │ (per-project)│  (no classifier flags)   │(project)│  (manual command)    │        │
  └──────────────┘                          └────────┘                      └────────┘
          ▲                                       │
          │  classifier flag during use           │  rollback (version log)
          └───────────────────────────────────────┘
```

新保存的技能落为 **quarantined(隔离)** 状态,不会自动注入提示词。在该主机上成功使用 3 次、且 L4 ML 分类器均未标记其内容后,自动晋升为项目内 **active(激活)**。激活状态的技能在该主机名的每个新侧栏 agent 会话中触发。

要让技能跨项目生效(例如"我希望 LinkedIn 技能在我每个 gstack 项目里都可用"),必须显式运行 `$B domain-skill promote-to-global <host>`。这是有意设计的可选操作(Codex T4 外部评审的结论):无差别的跨项目复利会把上下文泄漏到不相关的工作中。

## 存储

技能存在两处:

- **按项目**:`~/.gstack/projects/<slug>/learnings.jsonl` —— 与 `/learn` skill 用的是同一个 JSONL 文件,domain skill 是其中 `type:"domain"` 的行。
- **全局**:`~/.gstack/global-domain-skills.jsonl` —— 只存 `state:"global"` 的行。

两个文件都是追加型 JSONL:删除写墓碑;空闲压缩器定期重写文件。宽容解析器在读取时丢弃末尾不完整的行,写入中途崩溃不会污染后续读取。

## 安全模型

skill 是会被加载进未来提示词上下文的 agent 自写内容,因此是典型的 agent-to-agent 提示注入向量。方案用多层防御明确应对:

| 层 | 内容 | 位置 |
|-------|------|-------|
| L1-L3 | Datamarking、隐藏元素剥离、ARIA 正则、URL 黑名单 | `content-security.ts`(编译二进制) |
| L4 | TestSavantAI ONNX 分类器 | `security-classifier.ts`(侧栏 agent,非编译) |
| L4b | Claude Haiku 转录分类器 | `security-classifier.ts`(侧栏 agent) |
| L5 | 金丝雀令牌泄漏检测 | `security.ts` |

L1-L3 在**保存时**运行(daemon 内)。L4 ML 分类器在**加载时**运行(侧栏 agent 内),因此每个把技能载入提示词的会话都会重新校验内容——这能抓住分类器模型更新后才暴露的问题。

save 命令的主机名取自**活动标签页的顶层 origin**,而不是 agent 参数。这封死了 Codex 指出的 confused-deputy 缺陷:否则恶意页面的重定向链可能诱骗 agent 毒化另一个域名。

## 错误参考

| 错误 | 原因 | 处理 |
|-------|------|--------|
| `Save blocked: classifier flagged content as potential injection` | 保存时 L4 分数 ≥ 0.85 | 重写技能内容,删掉指令式文字后重试。 |
| `Save blocked: <L1-L3 message>` | 保存时命中 URL 黑名单或 ARIA 注入 | 检查技能正文中的可疑模式。 |
| `Save failed: empty body` | stdin 与 `--from-file` 都没有内容 | 把 Markdown 管道给 `$B domain-skill save`,或传 `--from-file <path>`。 |
| `Cannot save domain-skill: no top-level URL on active tab` | 标签页是 `about:blank` 或 `chrome://...` | 先 `$B goto <目标站点>` 再保存。 |
| `Cannot promote: skill is in state "quarantined"` | 技能尚未自动晋升 | 在本项目继续使用,直到 3 次成功且无分类器标记。 |
| `Cannot rollback: <host> has fewer than 2 versions` | 只有一个版本 | 改用 `$B domain-skill rm` 删除。 |

## 遥测

遥测开启时(默认 `community` 模式,除非手动关闭),以下事件写入 `~/.gstack/analytics/browse-telemetry.jsonl`:

- `domain_skill_saved {host, scope, state, bytes}`
- `domain_skill_save_blocked {host, reason}`
- `domain_skill_fired {host, source, version}`
- `domain_skill_state_changed {host, from_state, to_state}`(计划中)

只记主机名——不含正文内容,不含 agent 文本。用 `gstack-config set telemetry off` 或 `GSTACK_TELEMETRY_OFF=1` 可彻底关闭。
