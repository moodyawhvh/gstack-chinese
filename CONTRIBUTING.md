> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

> 注:本文件篇幅较长,此处仅翻译核心章节;完整细节请参阅英文原版 CONTRIBUTING.md。

# 参与贡献 gstack

感谢你愿意让 gstack 变得更好。无论是修一个 skill 提示词里的错别字,还是构建一套全新的工作流,本指南都能帮你快速上手。

## 快速开始

gstack 的 skill 是 Markdown 文件,Claude Code 从 `skills/` 目录中发现它们。通常位于 `~/.claude/skills/gstack/`(全局安装)。但在开发 gstack 本身时,你希望 Claude Code 使用**工作区里的** skill——这样改动立即生效,无需复制或部署。

这就是开发模式(dev mode)的作用:它把你的仓库软链接到本地 `.claude/skills/` 目录,Claude Code 直接从你的 checkout 读取 skill。

```bash
git clone https://github.com/garrytan/gstack.git && cd gstack
bun install                    # 安装依赖
bin/dev-setup                  # 激活开发模式
```

> **完整克隆 vs 浅克隆。** README 里面向用户的安装用 `--depth 1` 提速。作为贡献者,请用完整克隆(不加 `--depth`)——你需要完整历史来执行 `git log`、`git blame`、`git bisect`,以及对照早期版本审查 PR。如果已经按 README 建了 `--depth 1` 克隆,用 `git fetch --unshallow` 升级为完整克隆。

现在随便编辑一个 `SKILL.md`,在 Claude Code 里调用(比如 `/review`),即可实时看到改动。开发结束时:

```bash
bin/dev-teardown               # 退出开发模式,恢复全局安装
```

## 运营式自我改进

gstack 会自动从失败中学习。每次 skill 会话结束时,agent 会反思哪里出了问题(CLI 报错、错误做法、项目怪癖),并把运营经验写入 `~/.gstack/projects/{slug}/learnings.jsonl`。后续会话会自动呈现这些经验,gstack 在你的代码库上会越用越聪明。

无需任何配置,经验自动记录,用 `/learn` 查看。

### 贡献者工作流

1. **正常使用 gstack** —— 运营经验自动捕获
2. **查看你的经验:** `/learn` 或 `ls ~/.gstack/projects/*/learnings.jsonl`
3. **Fork 并克隆 gstack**(如果还没做)
4. **把你的 fork 软链接到踩到 bug 的项目里:**
   ```bash
   # 在你的核心项目里(gstack 惹到你的那个)
   ln -sfn /path/to/your/gstack-fork .claude/skills/gstack
   cd .claude/skills/gstack && bun install && bun run build && ./setup
   ```
   setup 会为每个 skill 创建目录并在里面放 SKILL.md 软链接(`qa/SKILL.md -> gstack/qa/SKILL.md`),同时把各 skill 的运行时资源(sections/、模板、清单——SKILL.md、测试、构建产物、`.tmpl` 源文件除外)一并链接过去,并询问你的前缀偏好。传 `--no-prefix` 可跳过询问,直接用短名。
5. **修复问题** —— 你的改动在该项目中立即生效
6. **真实使用来测试** —— 重做一遍惹恼你的操作,确认已修复
7. **从 fork 发起 PR**

这是最好的贡献方式:在真实工作、真实感到痛点的地方顺手修掉 gstack 的问题。

### 会话感知

同时开 3 个以上 gstack 会话时,每个问题都会注明属于哪个项目、哪个分支、正在做什么。再也不用盯着问题发呆:"等等,这是哪个窗口?"所有 skill 的格式保持一致。

## 日常开发流程

```bash
# 1. 进入开发模式
bin/dev-setup

# 2. 编辑 skill 模板(SKILL.md 是生成物——改 .tmpl)
vim review/SKILL.md.tmpl
bun run gen:skill-docs   # 或:bun run dev:skill(监听模式,改动自动重新生成)

# 3. 在 Claude Code 中测试——改动即时生效
#    > /review

# 4. 改了 browse 源码?重新构建二进制
bun run build

# 5. 今天收工?退出开发模式
bin/dev-teardown
```

## 测试与评估

### 配置

```bash
# 1. 复制 .env.example 并填入你的 API key
cp .env.example .env
# 编辑 .env → 设置 ANTHROPIC_API_KEY=sk-ant-...

# 2. 安装依赖(如果还没装)
bun install
```

Bun 自动加载 `.env`,无需额外配置。Conductor 工作区会自动从主 worktree 继承 `.env`。

### 测试分层

| 层级 | 命令 | 成本 | 测试内容 |
|------|------|------|----------|
| 1 — 静态 | `bun run test` | 免费 | 命令校验、快照参数、Aside 契约、渲染包装器选项映射、SKILL.md 正确性、TODOS-format.md 引用、可观测性单元测试 |
| 2 — E2E | `bun run test:e2e` | 约 $4.20 | 通过 `claude -p` 子进程完整执行 skill |
| 3 — LLM 评估 | `EVALS=1 bun test test/skill-llm-eval.test.ts` | 单独约 $0.15 | 用 LLM-as-judge 给生成的 SKILL.md 打分 |
| 2+3 | `bun run test:evals` | 合计约 $4 | E2E + LLM-as-judge(两者都跑) |

```bash
bun run test                 # 仅第 1 层(每次提交前都要跑,全套约 8700 个测试约 90-100 秒)
bun run test:e2e             # 第 2 层:仅 E2E(需 EVALS=1,不能在 Claude Code 内运行)
bun run test:evals           # 第 2+3 层合并(每次约 $4.35)
```

### 第 1 层:静态校验(免费)

通过 `bun run test` 运行,内部经由 `scripts/test-free-shards.ts` 调度:N 个并发分片进程受严格的输出契约约束——分片退出时没有 bun 的终端汇总行、或 worker 崩溃,整个运行即判失败,静默截断永远不可能报绿。传 `--verbose` 转发子进程完整输出;`--wall-timeout <秒>` 覆盖分片超时上限;`GSTACK_FREE_JOBS=<n>` 覆盖分片数;`GSTACK_FREE_RETRY_FLAKY=1` 为系统调用沙箱开启一次串行重试(本地默认关闭;CI 的免费通道会开启并把每次 flaky 通过记入 JSONL 账本,供 `bun run eval:flake-rank` 汇总)。在云沙箱工作?每次启动后跑一次 `scripts/sandbox-doctor.sh` 让测试套件全绿(详见 [docs/TESTING_INTERNALS.md](docs/TESTING_INTERNALS.md))。不要直接敲裸的 `bun test` 跑全套:它会遍历整个仓库、加载付费评估文件,还会绕过严格分类器。无需 API key。

### 第 2 层:`claude -p` E2E(每次约 $4.20)

以 `--output-format stream-json --verbose` 启动 `claude -p` 子进程,流式读取 NDJSON 实时展示进度,并扫描 browse 错误。这是最接近"这个 skill 端到端到底能不能跑"的验证。

```bash
# 必须在普通终端运行——不能嵌套在 Claude Code 或 Conductor 里
EVALS=1 bun test test/skill-e2e-*.test.ts
```

- 由 `EVALS=1` 环境变量把门(防止意外烧钱)
- 在 Claude Code 内自动跳过(`claude -p` 不能嵌套)
- API 连通性预检——在烧预算前对 ConnectionRefused 快速失败
- 实时进度输出到 stderr:`[Ns] turn T tool #C: Name(...)`
- 保存完整 NDJSON 转录与失败 JSON 供调试
- 测试位于 `test/skill-e2e-*.test.ts`(按类别拆分),运行器逻辑在 `test/helpers/session-runner.ts`

**默认封闭(hermetic)。** 每个 E2E 运行器都通过 `test/helpers/hermetic-env.ts` 启动子进程:白名单清洗过的环境变量、全新种子化的 `CLAUDE_CONFIG_DIR`、临时 `GSTACK_HOME` 和 `--strict-mcp-config`。你本机的 `~/.claude` 配置、MCP 服务器(gbrain、Conductor)、skill、`~/.gstack` 决策日志、`CONDUCTOR_*` 环境变量都不会泄漏进子进程,本地评估信号与 CI 一致。设 `EVALS_HERMETIC=0` 可对照真实环境调试。

### E2E 可观测性

E2E 测试运行时会在 `~/.gstack-dev/` 生成机器可读的工件:心跳(`e2e-live.json`)、部分结果(`evals/_partial-e2e.json`)、进度日志、NDJSON 转录、失败 JSON。在第二个终端运行 `bun run eval:watch` 可看到实时仪表盘(已完成测试、当前运行、成本),加 `--tail` 额外显示 progress.log 最后 10 行。

评估历史工具:

```bash
bun run eval:list            # 列出所有评估运行(轮次、时长、成本)
bun run eval:compare         # 对比两次运行——逐测试差值 + Takeaway 点评
bun run eval:summary         # 聚合统计 + 跨运行逐测试效率均值
bun run eval:flake-rank      # 按 flake 信号排序:重试后通过者优先,其次失败率(--json, --dir, --since-days)
```

**后台/分离运行。** agent 或长套件不想盯着时,用 `eval:bg*` 脚本。它们通过 `bin/gstack-detach` 包装评估命令:绕过轮次边界的 SIGTERM、`caffeinate` 防休眠、机器级 `gstack-evals` 锁让并发工作区串行化、运行级日志、分层看门狗,以及保证输出的 `### gstack-detach EXIT=<code> ###` 哨兵行(轮询方不会把沉默误判为成功)。

```bash
bun run eval:bg              # 分离运行 test:evals(基于 diff)
bun run eval:bg:all          # 分离运行 test:evals:all
bun run eval:bg:gate         # 分离运行 gate 层套件
bun run eval:bg:periodic     # 分离运行 periodic 层套件
```

工件永不清理——它们累积在 `~/.gstack-dev/` 供事后调试与趋势分析。

### 第 3 层:LLM-as-judge(每次约 $0.15)

用 Claude Sonnet 从三个维度给生成的 SKILL.md 打分。可用 `GSTACK_EVAL_MODEL_JUDGE` 覆盖评审模型:

- **清晰度** —— AI agent 能否无歧义地理解指令?
- **完整性** —— 所有命令、参数、用法是否都有文档?
- **可执行性** —— agent 仅凭文档信息能否完成任务?

每维 1-5 分,阈值:每维必须 **≥ 4**。另有回归测试把生成文档与 `origin/main` 的人工基线对比,生成版得分不得更低。

- 评分模型为 `claude-sonnet-4-6`(求稳定)
- 测试位于 `test/skill-llm-eval.test.ts`
- 直接调用 Anthropic API(非 `claude -p`),因此任何地方都能跑,包括 Claude Code 内部

### CI

GitHub Action(`.github/workflows/skill-docs.yml`)在每次 push 和 PR 上运行 `bun run gen:skill-docs --dry-run`。若生成的 SKILL.md 与仓库中提交的不一致,CI 失败,把过期文档挡在合并之前。

供应链门禁并行运行:质量门禁(凭据扫描、关键依赖通告、ShellCheck)、依赖审查、OSV 每周漏洞扫描、Dependabot 分组升级。供应链工作流把第三方 action 固定到 commit SHA。PR 模板要求提供证据(跑过的测试、评估输出),而不是口头承诺。

测试直接针对 browse 二进制运行,不依赖开发模式。需要 Aside 本体的测试只在打开 Aside 应用的 Mac 上运行,其余环境自动跳过。

## 编辑 SKILL.md 文件

SKILL.md 是由 `.tmpl` 模板**生成**的。不要直接改 `.md`——下次构建会覆盖你的改动。

```bash
# 1. 编辑模板
vim SKILL.md.tmpl              # 或 browse/SKILL.md.tmpl

# 2. 为所有 host 重新生成
bun run gen:skill-docs --host all

# 3. 健康检查(报告所有 host)
bun run skill:check

# 或使用监听模式——保存即自动重新生成
bun run dev:skill
```

需要渲染 HTML/PDF 的 skill 一律通过 `lib/aside-render.ts`(`bin/gstack-render.ts` CLI),不要在 skill 里内置 puppeteer/Chromium。新增 browse 命令改 `browse/src/commands.ts`;新增快照参数改 `browse/src/snapshot.ts` 的 `SNAPSHOT_FLAGS`;然后重新构建。

## 多 host 开发

gstack 从同一套 `.tmpl` 模板为 10 个 host 生成 SKILL.md。每个 host 是 `hosts/*.ts` 里的一个类型化配置,生成器读取配置产出各 host 适配的输出(不同 frontmatter、路径、工具名)。

**支持的 host:** Claude(主)、Codex、Factory、Kiro、OpenCode、Slate、Cursor、OpenClaw、Hermes、GBrain。

```bash
bun run gen:skill-docs                    # Claude(默认)
bun run gen:skill-docs --host codex       # Codex
bun run gen:skill-docs --host all         # 全部 10 个 host
bun run build                             # 所有 host + 编译二进制
```

各 host 之间变化的部分:输出目录、frontmatter 完整度、路径写法(`~/.claude/skills/gstack` vs `$GSTACK_ROOT`)、工具名改写、hook skill 表达方式、被抑制的章节、模型覆盖(`claude` vs `gpt`)。完整 `HostConfig` 接口见 `scripts/host-config.ts`。

### 新增 host

完整指南见 [docs/ADDING_A_HOST.md](docs/ADDING_A_HOST.md)。简版:

1. 创建 `hosts/myhost.ts`(从 `hosts/opencode.ts` 复制)
2. 加入 `hosts/index.ts`
3. 把 `.myhost/` 加入 `.gitignore`
4. 运行 `bun run gen:skill-docs --host myhost`
5. 运行 `bun run test`(参数化测试自动覆盖)

生成器、setup、工具链代码零改动。

### 新增 skill

新增 skill 模板后所有 host 自动获得:

1. 创建 `{skill}/SKILL.md.tmpl`
2. 运行 `bun run gen:skill-docs --host all`
3. 动态模板发现自动纳入,无需维护静态清单
4. 做预算登记:运行 `bun test/helpers/capture-context-budget.ts` 并提交刷新后的 `test/fixtures/context-budget.json`——上下文预算棘轮会拒绝没有上限的新 skill
5. 提交 `{skill}/SKILL.md`;外部 host 输出在 setup 时生成并 gitignore

## Conductor 工作区

如果你用 [Conductor](https://conductor.build) 并行跑多个 Claude Code 会话,`conductor.json` 会自动接好工作区生命周期:`setup` 钩子运行 `bin/dev-setup`(从主 worktree 复制 `.env`、装依赖、软链 skill、非交互运行 `./setup`);`archive` 钩子运行 `bin/dev-teardown`(移除软链与渲染目录并清理)。Conductor 创建新工作区时 `bin/dev-setup` 自动运行,无需手动操作。

**首次配置:** 把 `ANTHROPIC_API_KEY` 放进主仓库的 `.env`(参考 `.env.example`),所有 Conductor 工作区自动继承。

**`GSTACK_*` 环境变量前缀(Conductor 注入)。** Conductor 会从工作区进程环境中显式剥离 `ANTHROPIC_API_KEY` 和 `OPENAI_API_KEY`。要在 Conductor 工作区里跑付费评估、`/sync-gbrain` 向量或 `claude-agent-sdk` 调用,请在 Conductor 的工作区环境配置里设置 `GSTACK_ANTHROPIC_API_KEY` 和 `GSTACK_OPENAI_API_KEY`;gstack 侧的 `lib/conductor-env-shim.ts` 会在正式名为空时把 `GSTACK_FOO_API_KEY` 提升为 `FOO_API_KEY`。新增会调付费 API 的 TS 入口时,在文件顶部加 `import "../lib/conductor-env-shim";`。

## 注意事项

- **SKILL.md 是生成物。** 改 `.tmpl` 模板,别改 `.md`;改完跑 `bun run gen:skill-docs` 重新生成。
- **TODOS.md 是统一待办池。** 按 skill/组件组织,P0-P4 优先级。`/ship` 自动识别已完成项,所有规划/评审/复盘 skill 都会读它获取上下文。
- **browse、make-pdf、design 和 `lib/` 源码改动需要重新构建。** 碰了 `browse/src/*.ts`、`make-pdf/src/*.ts`、`design/src/*.ts` 或 `lib/` 下任何文件,跑 `bun run build`。`./setup` 自己也会做同样判断。
- **开发模式会遮蔽全局安装。** 项目本地 skill 优先于 `~/.claude/skills/gstack`;`bin/dev-teardown` 恢复全局版。
- **Conductor 工作区相互独立。** 每个工作区是独立 git worktree,`bin/dev-setup` 经由 `conductor.json` 自动运行。
- **`.env` 跨 worktree 传播。** 主仓库设一次,所有 Conductor 工作区共享。
- **`.claude/skills/` 已被 gitignore。** 软链不会被提交。
- **不要在 `setup` 里裸写 `ln -snf`。** 所有链接点必须经由 `_link_or_copy SRC DST` 辅助函数:Unix 上保留 `ln -snf`,Windows 无开发者模式时切换为 `cp -R`/`cp -f`(裸 `ln -snf` 会产生 `git pull` 后不刷新的冻结文件副本)。静态不变量测试强制执行。
- **同步派发子 agent 必须显式声明 `run_in_background: false`。** 模板里派发子 agent 并消费其输出的步骤都要带该参数,使用 `{{FOREGROUND_DISPATCH_NOTE}}` 占位符,并在同一提交里把生成的载体文件登记进 `GENERATED_WITH_GUIDANCE`。
- **绝不删除或覆盖 `setup` 无法证明属于 gstack 的 skill 条目。** 所有破坏性操作都经过所有权辅助函数校验;不确定的条目先移到 `~/.gstack/backups/skills/<ts>/`。
- **`./setup` 绝不因 Chromium 失败。** Playwright 引导是尽力而为且有界的:所有失败都变成原因码印进最终汇总,skill 注册照常执行。`GSTACK_PLAYWRIGHT_INSTALL_TIMEOUT=<秒>`(默认 600)限制下载;`GSTACK_SKIP_PLAYWRIGHT=1` 跳过;`GSTACK_SKIP_ASIDE=1` 让浏览器汇总把 Aside 视为不存在。

## 在真实项目中测试你的改动

**这是推荐的 gstack 开发方式。** 把你的 gstack checkout 软链到你实际使用的项目里,边干真活边让改动生效。

### 第 1 步:软链你的 checkout

```bash
# 在你的核心项目里(不是 gstack 仓库)
ln -sfn /path/to/your/gstack-checkout .claude/skills/gstack
```

### 第 2 步:运行 setup 创建逐 skill 软链

只有 `gstack` 一个软链还不够。Claude Code 是通过顶层目录(`qa/SKILL.md`、`ship/SKILL.md` 等)发现 skill 的。运行 `./setup` 创建它们:

```bash
cd .claude/skills/gstack && bun install && bun run build && ./setup
```

setup 会问你用短名(`/qa`)还是带命名空间(`/gstack-qa`),选择保存在 `~/.gstack/config.yaml`。跳过询问可传 `--no-prefix`(短名)或 `--prefix`(命名空间)。

### 第 3 步:开发

编辑模板,跑 `bun run gen:skill-docs`,下一次 `/review` 或 `/qa` 调用立即生效,无需重启。

### 回到稳定的全局安装

删掉项目本地软链即可,Claude Code 自动回落到 `~/.claude/skills/gstack/`:

```bash
rm .claude/skills/gstack
```

### 切换前缀模式

```bash
cd .claude/skills/gstack && ./setup --no-prefix   # 切到 /qa、/ship
cd .claude/skills/gstack && ./setup --prefix      # 切到 /gstack-qa、/gstack-ship
```

setup 自动清理旧软链,只需注意:只会移除 gstack 自己创建的条目,你自建的同名 skill(比如手写的 `qa/`)会原样保留并在汇总中说明。

### 替代方案:把全局安装指向某个分支

```bash
cd ~/.claude/skills/gstack
git fetch origin
git checkout origin/<branch>
bun install && bun run build && ./setup
```

这会影响所有项目。回退:`git checkout main && git pull && bun run build && ./setup`。

## 社区 PR 分诊(波次流程)

社区 PR 堆积时,按主题分批处理:

1. **归类** —— 按主题分组(安全、功能、基础设施、文档)
2. **去重** —— 两个 PR 修同一问题时,选改动行数更少的那个,关闭另一个并注明指向
3. **收集分支** —— 建 `pr-wave-N`,合并干净的 PR,给脏 PR 解冲突,用 `bun run test && bun run build` 验证
4. **带上下文地关闭** —— 每个被关闭的 PR 都留评论说明原因及被什么取代。贡献者付出了真实劳动,用清晰的沟通表达尊重
5. **合并为一个 PR** —— 单个 PR 进 main,合并提交保留全部署名,附合并/关闭汇总表

## 升级迁移

当一次发布以 `./setup` 无法自愈的方式改变磁盘状态(目录结构、配置格式、遗留文件)时,添加迁移脚本让老用户平滑升级。

### 何时需要迁移

- skill 目录的创建方式变了(软链 vs 实体目录)
- `~/.gstack/config.yaml` 的配置键改名或移动
- 需要删除上一版本的孤儿文件
- `~/.gstack/` 状态文件格式变更

不要为以下情况加迁移:新功能(用户自动获得)、新 skill(setup 会发现)、纯代码改动(不涉及磁盘状态)。

### 如何添加

1. 创建 `gstack-upgrade/migrations/v{VERSION}.sh`,`{VERSION}` 对应需要修复的发布的 VERSION 文件
2. 赋予执行权限:`chmod +x gstack-upgrade/migrations/v{VERSION}.sh`
3. 脚本必须**幂等**(可安全重复运行)且**非致命**(失败只记录日志,不阻塞升级)
4. 顶部加注释块:改了什么、为什么需要迁移、影响哪些用户

```bash
#!/usr/bin/env bash
# Migration: v0.15.2.0 — 修复 skill 目录结构
# 影响范围:v0.15.2.0 之前用 --no-prefix 安装的用户
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
"$SCRIPT_DIR/bin/gstack-relink" 2>/dev/null || true
```

### 执行机制

`/gstack-upgrade` 期间,`./setup` 完成后(步骤 4.75),升级 skill 扫描 `gstack-upgrade/migrations/`,运行所有版本号比用户旧版本新的 `v*.sh` 脚本,按版本顺序执行,失败只记录不阻塞。

### 测试迁移

迁移脚本作为 `bun run test`(第 1 层,免费)的一部分被测试:套件验证所有迁移脚本可执行且无语法错误。

## 发布你的改动

对 skill 改动满意后:

```bash
/ship
```

它会跑测试、评审 diff、分诊 Greptile 评论(两级升级)、管理 TODOS.md、升版本号并发起 PR。完整工作流见 `ship/SKILL.md`。
