> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

# gbrain-sync 错误速查

`gstack-brain-*` 可能打印的每一条错误信息,附带问题、原因与修复方法。

按 `BRAIN_SYNC:` 后的前缀、或命令输出中的二进制名检索本文件。

---

## `BRAIN_SYNC: brain repo detected: <url>`

**问题。** 当前机器上存在 `~/.gstack-artifacts-remote.txt`(或从别的机器拷来的旧版 `~/.gstack-brain-remote.txt`),但 `~/.gstack/.git` 没有本地 git 仓库。

**原因。** 你在别处配置过 GBrain 同步,这台机器还没恢复 gstack。

**修复。**
```bash
gstack-brain-restore
```
这会把仓库拉到 `~/.gstack/` 并重新注册 merge driver。

如果不想在这台机器恢复,用以下命令关闭提示:
```bash
gstack-config set artifacts_sync_mode_prompted true
```

---

## `BRAIN_SYNC: blocked: <pattern-family>:<snippet>`

**问题。** 秘密扫描器在暂存文件中检测到形似凭据的内容,同步停止。队列保留,没有任何内容被推送。

**原因。** 某条预置的秘密模式命中了文件内容——很可能是嵌入 JSON 的 AWS key、GitHub token、OpenAI key、PEM 块、JWT 或 bearer token。

**修复(三种选择)。**

1. **如果是真秘密**:编辑问题文件移除秘密,然后重跑任意 skill 触发重试。

2. **如果是误报**(比如你的经验记录里,示例字符串**就该**包含 GitHub token 模式):
   ```bash
   gstack-brain-sync --skip-file <path>
   ```
   这会把该路径永久排除出后续同步。

3. **如果想整批放弃这次同步**(从头再来):
   ```bash
   gstack-brain-sync --drop-queue --yes
   ```
   这会清空队列且不产生提交。后续写入会正常重新填充队列。

---

## `BRAIN_SYNC: push failed: auth.`

**问题。** Git push 被拒,因为对远端的认证已过期或缺失。

**原因。** 当前凭据无法访问远端。

**修复。** 按远端类型刷新认证:

- **GitHub**:`gh auth status`(必要时再 `gh auth refresh`)
- **GitLab**:`glab auth status`
- **其他**:`git remote -v` + 检查 SSH key 或凭据助手

修好认证后,重跑任意 skill 即自动重试同步。

---

## `BRAIN_SYNC: push failed: <first-line-of-error>`

**问题。** push 因认证以外的原因失败,冒号后是 git 错误的第一行。

**原因。** 可能是网络问题、push 被拒(远端领先)、服务器 500,或仓库访问权限被撤销。

**修复。** 查看 `~/.gstack/.brain-sync-status.json` 获取更多细节,或运行:
```bash
cd ~/.gstack && git status && git push origin HEAD
```
看 git 的完整报错。任何 push 尝试后队列都会清空,但本地提交仍在——下次 skill 运行会重试 push。

---

## `gstack: brain-sync push NOT sent — the egress receipt could not be written`

**问题。** push 在任何数据离开本机之前被拒绝。每次 brain-sync push 发送前都要向外发台账(`~/.gstack/security/egress.jsonl`)写入一份防篡改回执,fail-closed。回执写不进去,就什么都不发、不做本地提交,队列保留——下次运行重试整个排空。`gstack-brain-sync --status` 会显示 `EGRESS_RECEIPT_FAILED` 作为失败细节。

**原因。** `~/.gstack/security/` 不可写(回执写入器在目录缺失时会创建,所以单纯不存在不是原因)、磁盘已满,或 `GSTACK_HOME` 指向只读位置。

**修复。**
```bash
mkdir -p ~/.gstack/security && chmod -R u+w ~/.gstack/security
```
然后重跑任意 skill(或 `gstack-brain-sync --once`)重试。用 `gstack-egress list` 检查台账,用 `gstack-egress verify` 校验哈希链。

---

## `gstack-artifacts-init: ~/.gstack/ is already a git repo pointing at: <url>`

**问题。** 你初始化时给的远端 URL 与现有配置不一致,命令拒绝覆盖。

**原因。** 你之前用另一个远端跑过 `gstack-artifacts-init`。

**修复。** 二选一:

- 沿用现有远端:不带 `--remote` 运行 `gstack-artifacts-init`,或使用匹配的 URL。
- 更换远端:`git -C ~/.gstack remote set-url origin <url>`(命令自身会提示),或先 `gstack-brain-uninstall` 再用新 URL 重新 init。两种操作都不删数据。

---

## `Remote not reachable via SSH: <url>`

**问题。** init 无法连通 git 远端以验证可达性。

**原因。** URL 错误、认证缺失或网络问题。

**修复。** 手动测试:
```bash
git ls-remote <url>
```
如果失败,逐项检查:
- URL 拼写
- GitHub:`gh auth status`
- GitLab:`glab auth status`
- 内网 / VPN / DNS

---

## `Failed to create or find '<name>'. Try --remote <url>.`

**问题。** 通过 `gh repo create` 自动建仓失败,`gh repo view` 也找不到该仓库。

**原因。** `gh` 未认证、同名仓库已存在且属于别人,或 GitHub 账号触发配额限制。

**修复。**
```bash
gh auth status
```
未认证就 `gh auth login`。仓库名冲突就换一个名字:
```bash
gstack-artifacts-init --remote git@github.com:YOURUSER/custom-name.git
```

---

## `gstack-brain-restore: ~/.gstack/.git already points at <url>`

**问题。** 你尝试从不匹配现有 git 配置的 URL 恢复。

**原因。** 上一次 init 留下的 `.git` 指向了别的远端。

**修复。** 先 `gstack-brain-uninstall`,再重跑 `gstack-brain-restore <url>`。

---

## `gstack-brain-restore: ~/.gstack/ has existing allowlisted files that would be clobbered`

**问题。** 你在尝试恢复,但 `~/.gstack/` 里已有的经验或计划会被覆盖。

**原因。** 要么 (a) 本机在开启同步前就积累过 gstack 状态,要么 (b) 上一次失败的 restore 留下了部分状态。

**修复(三种选择)。**

1. **如果本机状态应当成为新的事实源**:改用 `gstack-artifacts-init` 而不是 restore——它会以本机状态创建全新的 brain 仓库。

2. **如果想采纳远端、丢弃本机状态**:先备份 `~/.gstack/projects/`,再删除冲突文件并重跑 restore。

3. **如果想合并**:没有自动合并。手动把经验从 `~/.gstack/` 拷进一台已开启同步的机器上正在运行的 gstack,然后在本机恢复。

---

## `gstack-brain-restore: <url> does not look like a gstack-brain repo`

**问题。** 克隆成功,但仓库缺少 `.brain-allowlist` 和 `.gitattributes`。

**原因。** restore 指向了一个随意的 git 仓库,或者有人从 brain 仓库删掉了规范配置文件。

**修复。** 核实 URL。如果无误,运行 `gstack-artifacts-init --remote <url>` 重新播种规范配置。

---

## 明明配置了同步却什么都没同步

**不是错误,但很常见的坑。** 按顺序检查:

1. `gstack-brain-sync --status` —— 模式是不是 `off`?
2. `~/.gstack/.git` 存在吗?
3. `gstack-config get artifacts_sync_mode` —— 应为 `full` 或 `artifacts-only`。
4. 你期望同步的文件在白名单里吗?`cat ~/.gstack/.brain-allowlist`
5. 隐私类过滤——若模式为 `artifacts-only`,行为类文件(时间线、开发者画像)会被有意跳过。

以上都对,就运行:
```bash
gstack-brain-sync --discover-new
gstack-brain-sync --once
```
强制排空一次。
