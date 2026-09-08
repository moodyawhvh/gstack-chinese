> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

# 教程:90 秒为一个功能生成文档

你将对一个现有项目运行 `/document-generate`,看它把 tutorial / how-to / reference / explanation 文档写到正确的位置,最后得到一张可直接贴进 PR 的覆盖图。读完后你会掌握四个动作:划定范围、考古、分派、落笔。

## 你需要准备

- 已安装 gstack(`git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`)
- Claude Code 运行在任意至少有一处公开面的项目里(一个 CLI 命令、一个导出函数、一个配置项、一个 skill、一个 API 端点)
- 大约 90 秒

不需要提前准备 `docs/` 目录——缺了 skill 会自建。不需要懂 Diataxis 术语——skill 会替你打标签。

## 步骤 1:在任意项目调用 skill

在要写文档的项目里打开 Claude Code,输入:

```
/document-generate
```

skill 会问一个关于输出目标的问题:

```
A) Write documentation inline in existing files (README, ARCHITECTURE, etc.)
B) Create standalone documentation files (e.g., docs/ directory)
C) Both — inline summaries in existing files + deep docs in standalone files

RECOMMENDATION: Choose C because it maximizes both discoverability and depth.
```

选 C。你会得到 README 指针 + 一整套独立文档。

## 步骤 2:观察考古阶段运行

skill 会安静约 30 秒读代码库。这是有意的——步骤 1 的"代码库考古"是整个工作流最重要的环节。它读的是:

- 完整的仓库结构
- README、ARCHITECTURE、CONTRIBUTING、CLAUDE.md(入口文档)
- 你要写文档的对象的实现文件(读完整文件,不只看签名)
- 测试(揭示边界情况与预期行为)
- 标了 `// NOTE:`、`// DESIGN:`、`// WHY:` 的行内注释

结束后你会看到一行类似:

```
Researched 47 files, identified 12 public surface items, 8 concepts, and 4 design decisions.
```

这个数字说明 skill 真读了代码,而不是靠文件名瞎猜。

## 步骤 3:查看 Diataxis 分派计划

skill 打印一份分派计划,说明为哪些实体写哪些象限:

```
Documentation plan:
  [entity]              [tutorial] [how-to] [reference] [explanation]
  WidgetService         ✅ new     ✅ new   ✅ new      ✅ new
  --verbose flag        ❌        ✅ new   ✅ inline   ❌
  Bayesian scheduler    ❌        ❌       ✅ new      ✅ new
```

并非每个实体都需要四个象限:CLI 参数要 reference + how-to,内部模块要 reference + explanation,面向用户的功能四象限全要。skill 按实体类型自行选择。

计划超过 5 份文档时,skill 会先请你确认;否则直接开写。

## 步骤 4:阅读第一份落地的文档

参考文档最先落地,因为它固定词汇。你会看到:

```
GENERATED: docs/reference-widget-service.md
```

打开该文件。结构严格:一段式导语、带类型与默认值的完整 API 列表、2-3 个可运行示例,以及一个 Related 章节链接到接下来落地的 how-to 和教程。

这就是 Diataxis 里参考文档该有的样子:事实性、穷尽性、无叙事。当你忍不住想解释某个选项**为什么**存在时,那份内容属于 skill 接下来要写的解释文档。

## 步骤 5:看解释、how-to 与教程依次出现

紧接着(每份约 5-10 秒),skill 写出其余象限:

```
GENERATED: docs/explanation-widget-architecture.md
GENERATED: docs/howto-create-a-custom-widget.md
GENERATED: docs/tutorial-build-your-first-widget.md
```

逐个打开。注意它们互不重复:

- **解释**以问题开篇,然后是方案,然后是权衡与被否决的替代项
- **How-to** 有前置条件、带精确命令的编号步骤、验证章节、故障排查章节
- **教程**在 3 步内让你拿到可用结果,以"What you built"收尾

skill 强制这些结构。how-to 缺验证章节这类问题,提交前就被步骤 8 的质量自审抓住。

## 步骤 6:检查交叉链接

每份文档都互相链接:参考文档的 Related 链到 how-to 与教程;how-to 的 Related 链回参考;教程的"What you built"链到参考供深入探索。

跑个 grep 确认没有死链:

```bash
grep -rE '\]\([^)]*\.md\)' docs/ | head -10
```

每个被链接的文件都应存在。skill 的步骤 7"跨文档链接与可发现性"会在提交前检查这个。

## 步骤 7:在 PR 正文看到覆盖汇总

如果你在带开 PR 的功能分支上,skill 会把 `## Documentation Generated` 表格更新进 PR 正文:

```
## Documentation Generated

| File | Quadrant | Description |
|------|----------|-------------|
| docs/tutorial-build-your-first-widget.md | Tutorial | Walk-through from install to first working widget |
| docs/reference-widget-service.md | Reference | Complete widget API with types, defaults, examples |
| docs/explanation-widget-architecture.md | Explanation | Why widgets are isolated services |
| docs/howto-create-a-custom-widget.md | How-to | Creating and registering custom widgets |
```

打开 PR 的评审者看到表格,立刻知道上线了哪种覆盖。

## 你构建了什么

你现在有四份服务四种读者的文档:

- 项目新人读 `tutorial-*.md` 就能让东西跑起来
- 老手读 `howto-*.md` 完成特定任务
- API 调用方读 `reference-*.md` 查精确签名
- 代码评审者读 `explanation-*.md` 理解设计

每份都短到可以维护,每份只有一件事。PR 正文展示了覆盖了哪些象限。之后再跑 `/document-release`,Diataxis 覆盖图会把该实体报告为全覆盖(4/4 象限)。

## 接下来做什么

- **`/document-release` 点名了缺口但没填**:重跑 `/document-generate`,范围限定到那些实体。
- **想理解四象限为什么存在**:读 [explanation-diataxis-in-gstack.md](./explanation-diataxis-in-gstack.md)。
- **只想为某一个已上线功能补文档**(而非整个项目):读 [howto-document-a-shipped-feature.md](./howto-document-a-shipped-feature.md)。
- **skill 本身的参考文档**:[`document-generate/SKILL.md`](../document-generate/SKILL.md)。
