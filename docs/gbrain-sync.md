> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

# 用 GBrain sync 实现跨机器记忆

gstack 往 `~/.gstack/` 写入大量有用状态——经验记录、复盘、CEO 计划、设计文档、开发者画像。默认情况下,这些内容在你换笔记本时就全部归零。**GBrain sync** 把一个精选子集推送到私有 git 仓库,让记忆跟着你跨机器走,并且可被 GBrain 索引。

## 你能得到什么

- 在机器 A 上干活,到机器 B 上无缝接续。
- 你的经验、计划、设计在 GBrain 中可见(如果你在用)。
- 干净的退出口(`gstack-brain-uninstall`),绝不碰你的数据。
- 无 daemon、无系统服务、无后台进程。

## 什么不会离开你的机器

设计上,即使同步开启,以下内容也只留本地:

- 凭据:`.auth.json`、`auth-token.json`、`sidebar-sessions/`、`security/device-salt`
- 机器相关状态:Chromium profile、ONNX 模型权重、缓存、eval-cache、CDP-profile、一次性提示标记(`.welcome-seen`、`.telemetry-prompted`、`.vendoring-warned-*` 等)
- 问题偏好:按机器的 UX 偏好(`question-preferences.json`、`question-log.jsonl`、`question-events.jsonl`)

精确白名单在 `~/.gstack/.brain-allowlist`,由 CLI 管理;你可以在标记行下方追加自己的条目。

## 首次配置(30–90 秒)

```bash
gstack-artifacts-init
```

该命令会:

1. 把 `~/.gstack/` 变成 git 仓库。
2. 询问远端 URL(默认:`gh repo create --private gstack-artifacts-$USER`)。任何 git 远端都行——GitHub、GitLab、Gitea、自建皆可。
3. 推送一个只含配置的初始提交。
4. 写入 `~/.gstack-artifacts-remote.txt`(仅 URL,无秘密——可安全拷到其他机器)。
5. 打印 brain 主机所需的 `gbrain sources add` 接线命令(绝不自动执行——自己跑,或在你自己的机器上用 `bin/gstack-gbrain-source-wireup` 做同样的接线),让 `gbrain search` 能索引你同步的经验、计划与设计。旧的 `gstack-brain-reader add --ingest-url ...` HTTP 路径已在 v1.15.1.0 移除——它依赖一个 gbrain 从未发布的 `/ingest-repo` 端点。

init 之后,**你运行的下一个 skill** 会问且只问一个隐私模式问题:

- **同步全部白名单内容(推荐)**:经验、评审、计划、设计、复盘、时间线、开发者画像全部同步。
- **仅同步工件**:计划、设计、复盘、经验——跳过行为数据(时间线、开发者画像)。
- **拒绝**:全部留本地。之后可用 `gstack-config set artifacts_sync_mode full` 随时打开。

答案会被持久化,不会重复询问。

## 跨机器工作流

机器 A:运行一次 `gstack-artifacts-init`。完事——此后每次 skill 调用都会在开始与结束边界排空同步队列(每个 skill 约 200–800 毫秒的网络停顿)。

机器 B:

1. 把机器 A 的 `~/.gstack-artifacts-remote.txt` 拷到机器 B(密码管理器、dotfile 仓库、U 盘随意;旧文件名 `~/.gstack-brain-remote.txt` 仍可识别)。
2. 运行任意 gstack skill。前导逻辑发现 URL 文件后打印:
   ```
   BRAIN_SYNC: brain repo detected: <url>
   BRAIN_SYNC: run 'gstack-brain-restore' to pull your cross-machine memory
   ```
3. 运行 `gstack-brain-restore`。它会克隆仓库,回灌你的经验/计划/复盘,并重新注册 git merge driver。
4. 下一个 skill:你昨天在机器 A 上记的经验浮出水面。魔法时刻就在这。

## 状态、健康与队列深度

```bash
gstack-brain-sync --status
```

显示:最近成功 push、待发队列深度、同步阻塞、当前隐私模式。

每次 skill 运行都会在前导输出顶部附近打印一行 `BRAIN_SYNC:`,扫一眼就能发现问题。

## 隐私模式详解

| 模式 | 同步内容 |
|------|------------|
| `off` | 什么都不同步(默认)。 |
| `artifacts-only` | 计划、设计、复盘、经验、评审。跳过时间线与开发者画像。 |
| `full` | 白名单内全部内容,含行为状态。 |

随时切换:
```bash
gstack-config set artifacts_sync_mode full
gstack-config set artifacts_sync_mode off
```

## 秘密防护

每个提交在离开你的机器前都会做凭据形状扫描。拦截的模式包括:

- AWS 访问密钥(`AKIA…`)
- GitHub token(`ghp_`、`gho_`、`ghu_`、`ghs_`、`ghr_`、`github_pat_`)
- OpenAI 密钥(`sk-…`)
- PEM 块(`-----BEGIN …-----`)
- JWT(`eyJ…`)
- JSON 中的 bearer token(`"authorization": "…"`、`"api_key": "…"` 等)

扫描命中时,同步停止,队列保留,前导输出打印:

```
BRAIN_SYNC: blocked: <pattern-family>:<snippet>
```

处置方式:

1. 审查问题文件。
2. 若属误报、且内容确实要同步,运行 `gstack-brain-sync --skip-file <path>` 永久排除该路径。
3. 否则编辑文件移除秘密,重跑任意 skill。

`~/.gstack/.git/hooks/pre-commit` 还有一道纵深防御钩子:你手动对仓库 `git commit` 时执行同样的扫描。

另外(v1.63.0.0+),每次 push 在发送**之前**都会向外发台账(`~/.gstack/security/egress.jsonl`)写入防篡改回执,fail-closed:回执写不进去,push 即被拒绝,队列保留。用 `gstack-egress list` 检查台账,用 `gstack-egress verify` 校验哈希链。

## 双机冲突

如果你同一天在机器 A 和机器 B 都有写入,双方都会推追加提交。Git 默认会在文件尾部冲突,但 `.jsonl` 与 Markdown 文件注册了自定义 merge driver:

- JSONL 文件用排序去重 driver,按 ISO 时间戳排序追加(为确定性,退化为按每行 SHA-256 哈希排序)。
- Markdown 工件(复盘、计划、设计)用 union merge driver,直接拼接两侧。

正常情况下你不会看到冲突提示。真出现语义冲突(比如两台机器改同一个计划),git 会停下并提示。

## 跨机器拉取节奏

前导逻辑每 24 小时跑一次 `git fetch` + `git merge --ff-only`(经 `~/.gstack/.brain-last-pull` 缓存)。你不用操心——每天第一次 skill 调用时自动发生。

历史备注(#2516):过去那次每日拉取只刷新 `~/.gstack` 本身,**不刷新** gbrain 实际索引的 detached worktree `~/.gstack-brain-worktree`,导致 brain 在下一次 setup-gbrain/sync-gbrain 之前一直悄悄提供过期页面。修复后,每日同步也会推进 brain worktree(`gstack-gbrain-source-wireup --advance-only`,经 `~/.gstack/.brain-worktree-last-advance` 节流);推进失败会告警而不是静默失败,且绝不 force-reset 脏 worktree。

## 卸载

```bash
gstack-brain-uninstall
```

它会:

- 移除 `~/.gstack/.git/` 和所有 `.brain-*` 配置文件。
- 清除 `gstack-config` 里的 `artifacts_sync_mode`。
- **不会**碰你的经验、计划、复盘或开发者画像。

加 `--delete-remote` 可同时删除私有 GitHub 仓库(仅限 GitHub,走 `gh repo delete`)。

随时可用 `gstack-artifacts-init` 重新初始化。

## 故障排查

[gbrain-sync-errors.md](gbrain-sync-errors.md) 索引了 gstack-brain 可能打印的每条错误信息,逐条给出问题 / 原因 / 修复。

## 底层设计

这个功能背后的架构决策:白名单而非黑名单(未知文件默认留本地)、前导边界同步而非 daemon(没有需要看护的后台进程)、JSONL merge driver 让并发机器的队列做并集而不是冲突、以及在任何内容同步前只问一次的隐私闸门。
