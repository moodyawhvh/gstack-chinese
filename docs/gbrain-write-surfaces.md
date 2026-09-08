> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

# gbrain 写入面 —— 什么落到哪里,以及如何验证

本文服务两类读者:

1. **Agent**:规划类 skill 渲染出紧凑的 `## Brain Context Load` 或 `## Save Results to Brain` 块时,块里会引用本文。真正使用 gbrain 时按需阅读 §Context Load 或 §Save Template;`gbrain` 不在 PATH 上则完全跳过。
2. **人类**:对真实 brain 跑完规划 skill 后,用手动探针章节确认页面确实落库。

## 什么落到哪里

| Host + 检测状态 | 规划 skill 的 SKILL.md 中渲染什么 |
|---|---|
| 任意 host + `gstack-config gbrain-refresh` 报告 `gbrain_local_status: "ok"` | 渲染压缩版 brain 感知块。agent 在真正保存时按需读本文。每个规划 skill 约 250 token 开销。 |
| 任意 host + 未检测到 gbrain | 生成期抑制块。零 token 开销。校准引语仍会渲染(独立 resolver,与 host 无关)。 |
| GBrain 或 Hermes host | 无论检测结果如何都渲染块——这些 host 把 gbrain 集成当一等公民交付。 |

`.gbrain-source` 只固定**读取**——写入走 `~/.gbrain/config.json` 配置的默认引擎。代码查找类 resolver 的文档在 `bin/gstack-gbrain-sync.ts`;gstack 把同一契约视为工件 `put` 语义的承重约定。如果用户报告写入落到错误的源,先查这里。

信任策略(`personal` vs `shared`,按端点哈希)控制自动推送与回写。用 `gstack-config set brain_trust_policy@<endpoint-hash> personal` 设置。本地 PGLite 安装自动默认 `personal`;远程 MCP 安装在 `/setup-gbrain` 步骤 9.5 询问。

## §Context Load(agent 运行规划 skill 时阅读)

开始之前,先在 brain 里搜索相关上下文:

1. **从用户请求中提取 2-4 个关键词**。选名词、错误名、文件路径、技术术语——不要动词或形容词。例如"登录页在部署后坏了",搜 `login broken deploy`。
2. **搜索**:`gbrain search "<keyword1 keyword2>"`。返回形如 `[slug] Title (score: 0.85) - first line of content...` 的行。
3. **结果太少**(少于 3 条):放宽到唯一最具区分度的关键词再搜。还是少就直接干,不带 brain 上下文。
4. **读前 3 条结果**:逐个 `gbrain get_page "<slug>"`。读完 3 条就停——再往下收益递减。
5. **利用上下文**辅助分析。某条 brain 页面改变了你的思路时,在输出中引用具体 slug。

如果 `gbrain search` 返回任何非零退出码(gbrain 不在 PATH、网络抖动、限流),视为瞬态:不带 brain 上下文继续干。不要内联重试——用户之后可以重跑 skill。

## §Save Template(agent 真正保存时阅读)

skill 完成后,保存输出。紧凑 resolver 块已经展示了适配你这个 skill 的 slug 前缀 + 标题 + 标签(如 `gbrain put "ceo-plans/<feature-slug>" ...`)。完整模板:

```bash
gbrain put "<slug-prefix>/<feature-slug>" --content "$(cat <<'EOF'
---
title: "<Title>: <feature name>"
tags: [<tag>, <feature-slug>]
---
<skill output in markdown — the actual deliverable, not a summary>
EOF
)"
```

**Slug 指南**:`<feature-slug>` 用 kebab-case、全小写、前缀内唯一。优先具体的项目/功能名,别用抽象标签。例如 `auth-rate-limit` 而非 `security-fix`。

**标题指南**:常量前缀(如 "CEO Plan"、"Eng Review")固定;后缀是该功能/主题的人类可读名称。

**标签指南**:第一个标签是 skill 元数据里的常量 `<tag>`(如 `ceo-plan`、`eng-review`);第二个标签是 `<feature-slug>`,保证跨页遍历可用。有明确关联就再加标签(如 `[ceo-plan, auth-rate-limit, security]`)。

### 实体桩补全

保存主页面后,抽取输出中提到的人名与组织名,逐个处理:

```bash
# 先检查页面是否已存在
gbrain search "<entity name>"

# 无匹配则创建桩页
gbrain put "entities/<entity-slug>" --content "$(cat <<'EOF'
---
title: "<Person or Company Name>"
tags: [entity, person]
---
Stub page. Mentioned in <skill name> output. Replace with real bio when relevant.
EOF
)"
```

**只抽取真实名称**——真实人名(如 "Garry Tan")和公司/组织名(如 "Y Combinator")。跳过产品名、功能名、章节标题、技术术语(CSS 类名、函数名)和文件路径。拿不准就跳过。

人物用 `tags: [entity, person]`,公司/团队用 `tags: [entity, organization]`。

### 错误处理

- **限流**:退出码 1 且 stderr 含 `throttle`、`rate limit`、`capacity` 或 `busy`。推迟保存并继续——brain 正忙;内容没丢,只是本轮未持久化。
- **其他任何非零退出**:视为瞬态失败。不要内联重试——用户可重跑 skill,或在怀疑 gbrain 本身配置错误时运行 `gstack-config gbrain-refresh`。
- **`gbrain: command not found`**:gbrain 不在 PATH。紧凑 resolver 块已经让你跳过——按理走不到这段代码。真走到了,静默跳过继续。

### 反链

保存输出按名称或主题提到另一个 brain 页面时,在 Markdown 正文底部加一行反链:

```
Related: [[other-page-slug]], [[another-slug]]
```

gbrain 会把 `[[slug]]` 语法自动解析为渲染页面里的可点击链接。只在关系具体时加反链(如"这份 CEO 计划依赖 `eng-reviews/auth-rate-limit` 的工程评审")。不许编造关联。

### 完成摘要

在 skill 最终输出里用一行注明 brain 使用情况:
"Brain: read 3 pages, saved 1 page, enriched 2 entity stubs, 0 throttles."
这能帮用户看到 brain 覆盖随时间增长。

## 持久化验证(自动化)

"我们希望保存的数据真的被保存了吗"这一配对问题由 `test/skill-e2e-gbrain-roundtrip-local.test.ts` 覆盖:在隔离的临时 HOME 上做真实的 `gbrain init --pglite` + `gbrain put` + `gbrain get` 往返。属 periodic 层。`VOYAGE_API_KEY` 未设或 gbrain CLI 不在 PATH 时跳过。

动 resolver 的 PR 开启前先跑:

```bash
EVALS=1 EVALS_TIER=periodic VOYAGE_API_KEY=$VOYAGE_API_KEY \
  bun test test/skill-e2e-gbrain-roundtrip-local.test.ts
```

如果在真实规划 skill 运行后想手动抽查自己的 brain(调试某个 agent 本应保存的页面):

```bash
gbrain get "<prefix>/<slug>"           # 期望 markdown + frontmatter
gbrain search "<slug fragment>"        # 期望 slug 出现在前几条结果
gbrain sources list                    # 确认 gstack-brain-<user> 源
gbrain get "entities/<person>"         # 期望每个被点名的人物有桩页
```

## 远程 / Supabase / 瘦客户端 MCP 路由

resolver 只发出一种 CLI 形态——`gbrain put "<slug>" --content "..."`——对 gbrain 支持的所有引擎通用。CLI 内部按用户的 `~/.gbrain/config.json` 路由到本地 PGLite、远程 Supabase 或远程 MCP 端点。**gstack 不测那条路由**:存储层是 gbrain 要兑现的契约,我们对本地 PGLite 测的同一条 CLI 调用,打到其他引擎上也是同一条。

如果你在 Supabase 或瘦客户端 MCP 上写入不落库:

1. `gbrain doctor --fast --json` —— 引擎健康检查。有任何 `error` 先修它。
2. `gstack-config get brain_trust_policy@<endpoint-hash>` 必须是 `personal` 才会自动写。用 `gstack-config endpoint-hash` 取当前哈希。若是 `shared`,agent 写入前会询问——你当时拒绝了就重跑 skill。
3. 信任策略是 `personal` 且 `gbrain doctor` 干净但页面仍不在,去给 gbrain 提 issue——gstack 的 CLI 调用形态与 T11(`gbrain-roundtrip-local`)验证的一致。

## 自动化未覆盖的部分

- **校准引语(`takes_add`)**:目前回退为 `gbrain put` 内的围栏块写入,因为 gbrain v0.42+ 发布 `takes_add` MCP 操作之前 `BRAIN_CALIBRATION_WRITEBACK` 为 FALSE。开关翻转后,对 `/office-hours` 重跑本文的探针,确认 `gbrain takes_list` 出现权重符合预期的 `kind=bet` 条目(office-hours 为 0.9,见 `scripts/brain-cache-spec.ts:151-157`)。
- **其余 4 个规划 skill 的逐 skill E2E**:只有 `/office-hours` 有假 CLI E2E 覆盖(`test/skill-e2e-office-hours-brain-writeback.test.ts`)。resolver 单元测试(`test/resolvers-gbrain-save-results.test.ts`)覆盖全部 5 个的接线。逐 skill E2E 扩展在 TODOS.md 跟踪。
- **`.gbrain-source` 写语义**:gstack 把"仅读取"的文档契约视为承重,但不独立验证 gbrain CLI 绝不基于该 pin 重路由写入。如果你发现它这么做,那是 gbrain 的上游 bug。
