> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

# gstack 为什么用 Diataxis 组织文档

gstack 的两个文档 skill——`/document-release` 和 `/document-generate`——都说 Diataxis 这套语言。新实体按四个象限打分,覆盖缺口按象限标注并出现在 PR 正文里。本文解释为什么这套词汇是承重墙,以及为什么"直接写 Markdown 就完事了"的简单思路在 gstack 的规模上会失灵。

## 问题所在

文档腐化是最容易被无视的腐化。代码编译不过,你马上发现;测试挂了,CI 尖叫;文档过期是无声的——README 还能解析,安装命令还能复制粘贴——唯一的信号是几周后某个困惑的用户来提 issue,或者悄无声息地走人。

gstack 有 45+ 个 skill。每个 skill 对应一个 SKILL.md 加一个 `.tmpl` 模板,理想情况下还要有一篇入门教程和一篇"为什么这样设计"的解释。再乘以所有在自己项目里有类似文档面的 gstack 用户,维护负载是实打实的。

第一种朴素的失败模式是"每个团队用自己的格式写文档":一个项目用 Wiki,另一个用嵌套 README,第三个只有 API 参考没有教程,第四个的教程早已跑不通。你没法写工具跨这些格式做审计,因为"什么叫覆盖良好"根本没有共同词汇。

第二种失败模式更隐蔽:即便团队有纪律,人也倾向于写符合自己当下心态的那类文档。构建期的工程师写参考,发布期的工程师写教程,维护期的工程师写故障排查 how-to。没有人早上醒来会说"今天我要写一篇解释我们为何选这个架构的文档"——所以 explanation 类文档腐化得最快。

## 方案

Diataxis(Daniele Procida 提出,源于 Divio,现已被 CPython、Django、NumPy、FastAPI、GitHub 文档等广泛采用)按**读者意图**把文档分为四个象限:

```
                    THEORETICAL                        PRACTICAL
                    (understanding)                    (doing)

  STUDY            +-----------------------------+----------------------------+
  (learning)       |                             |                            |
                   |   EXPLANATION               |   TUTORIAL                 |
                   |   "Why does X exist?"       |   "Walk me through X       |
                   |                             |    for the first time"     |
                   |   discusses code            |   teaches code             |
                   |                             |                            |
                   +-----------------------------+----------------------------+

  WORK             +-----------------------------+----------------------------+
  (using)          |                             |                            |
                   |   REFERENCE                 |   HOW-TO                   |
                   |   "What is the exact        |   "How do I accomplish Y   |
                   |    signature of Y?"         |    using X?"               |
                   |                             |                            |
                   |   describes code            |   uses code                |
                   |                             |                            |
                   +-----------------------------+----------------------------+
```

教程模式的读者在"做中学",要一条保证成功的引导路径;how-to 模式的读者已有基础,要完成特定任务的配方;参考模式的读者要准确、完整、事实表式的 API 覆盖;解释模式的读者要理解一个设计决策。

同一个人会在不同时间以这四种模式读同一个项目。同一段话不可能同时服务四者——教程需要的保姆级铺垫会拖慢参考读者;参考需要的穷尽完备会压垮教程读者。

## 为什么这是有效的覆盖透镜

用 Diataxis 词汇写的覆盖图,让"文档更新了吗"这个问题有了确定性答案——不是"有没有 README",而是"这个新 skill 有没有教程?常见任务有没有 how-to?API 有没有参考?非显而易见的设计选择有没有解释?"

`/document-release` 的步骤 1.5 遍历 diff,抽取新的公开面(skill、CLI 参数、配置项、API 端点),并对每个实体按四象限打分。零覆盖项成为**关键缺口**;只有参考覆盖的项(gstack 自身历史上最常见的失败模式)成为**常见缺口**。两者都会写进 PR 正文,评审者一眼可见。

`/document-generate` 有意按四象限分别成文,并且拒绝混写:教程里不出现"配置"章节,参考文档里不出现"你将构建什么"段落。该 skill 的 9 个步骤按 参考 → 解释 → how-to → 教程 排序,因为这个顺序就是依赖顺序:参考确定词汇,解释论证设计,how-to 建立在前两者之上,教程最后写也最难写。

## 权衡

**Diataxis 引入了读者必须学习的词汇。**没听过"reference vs explanation"的人初见标签会觉得怪。缓解因素:这些标签见一次就自解释,而且它们从不出现在文档正文里——只出现在覆盖图和 PR 正文中,面向评审者而非最终用户。

**一个文件变四个。**小 skill 可能一个 `docs/SKILL.md` 就混写了四种模式,Diataxis 要求拆成四个。缓解因素:AI 生成让四文件结构成本极低,象限间交叉链接是机械操作(每篇参考链到对应 how-to,每篇 how-to 链回参考,以此类推),而可审计性的收益巨大——`/document-release` 能自动给覆盖率打分。

**Diataxis 不是唯一的好框架。**"Every page is page one"(Mark Baker)、*Write the Docs* 社区的四类文档、Google 开发者文档风格指南,切法各有不同。gstack 选 Diataxis 是因为它外部采用度最高(CPython、Django、NumPy、FastAPI 等),下游用户最可能见过这套词汇,而且象限标签能干净地映射为覆盖图信号。

## 被否决的替代方案

**"往 README 里加章节就行。"** gstack 历史上隐性试过。失败模式:教程在 README 里越积越多,直到 800+ 行,没人读到第 50 行以后。Diataxis 把它们拆成独立文件,各自从 README 目录可达。

**自研内部分类法。**诱人,因为可以量身定制。否决原因:每个团队都会发明自己的词汇,`/document-release` 将失去跨项目审计能力。Diataxis 是通用语。

**只做自动生成的参考文档。**很多项目用 JSDoc / TypeDoc / Sphinx 试过。没有解释的参考文档对新手是天书;没有教程,API 很难上手。参考是必要条件,不是充分条件。

**完全不用文档框架,凭感觉来。**多数项目的现状。静默失败——用户直接走人不提 issue,反馈回路断裂。Diataxis 在用户抱怨之前就给出结构化信号。

## 相关链接

- **实现该方法的 skill:** [`document-generate/SKILL.md`](../document-generate/SKILL.md)
- **使用该分类法做审计的 skill:** [`document-release/SKILL.md`](../document-release/SKILL.md)
- **`/document-generate` 使用教程:** [`tutorial-document-generate.md`](./tutorial-document-generate.md)
- **How-to:为已上线功能补文档:** [`howto-document-a-shipped-feature.md`](./howto-document-a-shipped-feature.md)
- **Diataxis 主页:** https://diataxis.fr/ —— Procida 的框架权威参考
