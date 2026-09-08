> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

# 如何为刚上线的功能补文档

这是上线后的工作流:PR 已合并,文档过期了,你想一次性拿到覆盖图并补齐缺口。先跑 `/document-release` 做审计,再用 `/document-generate` 填掉它发现的缺口。

## 前置条件

- gstack 已安装(`./setup` 已完成;用 `which gstack` 验证,或在 Claude Code 里输入 `/` 看到 skill 列表)
- 包含已上线功能的分支已 checkout
- GitHub 或 GitLab 上已有 PR(推荐——工作流会把覆盖图更新进 PR 正文)

还没有 PR 就先跑 `/ship` 建一个;`/document-release` 就是围绕 PR 设计的。

## 步骤

### 1. 审计当前覆盖

运行:

```
/document-release
```

该 skill 遍历你相对基线分支的 diff,抽取新的公开面(skill、CLI 参数、配置项、API 端点、新模块),并对每个实体按四个 Diataxis 象限打分。你会看到类似这样的覆盖图:

```
Coverage map:
  [entity]         [reference?] [how-to?] [tutorial?] [explanation?]
  /new-skill       ✅ AGENTS.md  ❌        ❌          ❌
  --new-flag       ✅ README     ✅ README  ❌          ❌
  FooProcessor     ❌            ❌        ❌          ❌
```

零覆盖项是**关键缺口**;只有参考覆盖的项是**常见缺口**。两者都会以 `### Documentation Debt` 子章节写进 PR 正文,评审者一眼可见。

如果 `/document-release` 报告全部已覆盖,收工。本 how-to 后面的部分可以跳过。

### 2. 阅读 PR 正文中的文档欠账章节

打开你的 PR(skill 会打印 URL),滚到 `## Documentation` → `### Documentation Debt`。每一条都标注了能填补它的 Diataxis 象限:

```
### Documentation Debt

- ⚠️ /new-skill — has reference in AGENTS.md but no how-to example in README. Diataxis quadrant: how-to.
- ⚠️ FooProcessor — zero coverage. Diataxis quadrants: reference, explanation.
```

这就是下一步的输入。每行告诉你缺什么、该用哪个象限补。

### 3. 用 /document-generate 填缺口

运行:

```
/document-generate
```

skill 询问范围时,告诉它欠账章节里点名的具体实体。skill 会读代码库(步骤 1 的考古阶段是强制的),按 Diataxis 象限分派,并写出缺失的文档。

也可以让 skill 自动发现:如果 /document-release 已显式把缺口递过来(链式调用时如此),`/document-generate` 自己就知道该写什么。

### 4. 验证缺口已闭合

重跑 `/document-release`:

```
/document-release
```

覆盖图里,之前被点名的实体应在此前为空的象限挂上绿色对勾。PR 正文的 Documentation Debt 章节应为空,或只剩你有意推迟的条目。

## 验证

打开 PR 确认:

1. PR 正文有 `## Documentation` 章节及文档 diff 预览。
2. `### Documentation Debt` 子章节关键缺口为零(或只剩你明知推迟的项)。
3. `docs/` 下每个生成的文档都能正常打开,且与兄弟文档互链(reference → how-to → tutorial → explanation)。
4. 运行 `grep -rE '\]\([^)]*\.md\)' docs/`,确认没有链接指向不存在的文件。

四项全过,你的 PR 就可以带着完整文档落地了。

## 故障排查

**`/document-release` 报告 "No public surface changes detected."**
diff 是纯内部的(重构、测试、基础设施)。不需要文档,直接落地。

**某个缺口的 Diataxis 象限标注与你预期不符。**
skill 用实体分类法决定哪些象限重要(CLI 参数要 reference + how-to;内部模块要 reference + explanation;面向用户的功能四象限全要)。不认同的话,生成后手工改文档即可覆盖。审计是指南,不是约束。

**`/document-generate` 写出的教程要走 8 步才见结果。**
教程应在 3 步以内见到可用结果。重跑 skill 要求压缩,或手工编辑。步骤 8 的质量自审能抓住一部分,但不是全部。

**想补文档但还没有 PR。**
先跑 `/ship` 建 PR,再走本工作流。没有 PR 时 `/document-release` 仍可审计,但会跳过 PR 正文更新。

**生成的参考文档出现了幻觉 API 签名。**
提 bug。skill 的步骤 1 考古本应端到端读实现文件而不只是签名,专门防这个。附上生成文本与实际代码,便于追查考古为何漏掉。
