<div align="center">

# gstack 中文文档

**[中文翻译版] Garry Tan 的 Claude Code 虚拟工程团队:23 个专职智能体工具**

[![原项目](https://img.shields.io/badge/原项目-garrytan--gstack-blue?style=flat-square&logo=github)](https://github.com/garrytan/gstack)
[![微信联系](https://img.shields.io/badge/微信-uaycar-brightgreen?style=flat-square&logo=wechat)](#)

</div>

---

## 项目背景

Karpathy 在 2026 年 3 月的 No Priors 播客中说:"我大概从去年 12 月起基本没手写过一行代码。" 一个人怎么像一个 20 人团队一样交付?Peter Steinberger 凭 AI 智能体几乎单枪匹马做出了 247K Star 的 OpenClaw。革命已经到来:一个装备了正确工具的个人建造者,可以跑得比传统团队更快。

作者 Garry Tan 是 Y Combinator 总裁兼 CEO,曾投资/辅导过 Coinbase、Instacart、Rippling 等公司在车库阶段的团队;加入 YC 之前,他是 Palantir 最早的工程/产品/设计之一,联合创办了 Posterous(卖给 Twitter),并打造了 YC 内部社交网络 Bookface。

**gstack 就是他的答案。** 过去 60 天:3 个生产级服务、40+ 个上线功能——全部兼职完成,同时全职运营 YC。按逻辑代码变更量(而非 AI 灌水的原始行数)计算,2026 年速率约为 2013 年的 **810 倍**(11,417 对 14 逻辑行/天)。截至 4 月 18 日,2026 年产出已达 **2013 全年的 240 倍**。

> 关于 LOC 争议:批评者说原始行数被 AI 灌水,没错;但扣除通胀后作者依然快得多。完整方法论、注意事项与复现脚本见原文档 [On the LOC Controversy](https://github.com/garrytan/gstack/blob/main/docs/ON_THE_LOC_CONTROVERSY.md)。

## 这是什么

gstack 把 Claude Code 变成一支**虚拟工程团队**:

- 一位重新思考产品的 **CEO**
- 一位锁定架构的 **工程经理**
- 一位把关品质的 **设计师**
- 一位负责发布的 **发布经理**
- 一位 **文档工程师**
- 一位 **QA**

合计 **23 个各司其职的智能体技能(Agent Skills)**,覆盖从产品定义到发布的完整工作流。

## 核心理念

- **同一个时代,不同的工具**:2013 年建 Bookface(772 次贡献)与 2026 年(1,237+ 次贡献)是同一个人——差别只在工具链。
- **谁敲的键盘不重要,交付了什么才重要**:AI 写了大部分代码,度量的是逻辑变更而非行数。
- **角色化分工**:让每个智能体只做自己最擅长的事,像管理真实团队一样管理智能体。

## 快速开始

```bash
# 1. 克隆原项目
git clone https://github.com/garrytan/gstack.git

# 2. 将技能目录复制到你的项目
cp -r gstack/.agents/* your-project/.claude/skills/
```

3. 启动 Claude Code,先让 "CEO" 技能定义产品方向与需求
4. 让 "Eng Manager" 技能锁定架构与技术决策
5. 编码任务交给实现类技能,完成后由 "QA" 技能审查
6. 发布阶段交给 "Release Manager" 生成变更说明与发布清单

## 适用人群

- 想用 Claude Code 做严肃产品开发的独立开发者
- 希望借鉴 YC 掌门人 AI 工作流的技术管理者
- 研究智能体技能(Agent Skills)编排的工程师

## 相关链接

| 链接 | 说明 |
|:-----|:-----|
| [原项目](https://github.com/garrytan/gstack) | 完整源代码与全部 23 个技能 |
| [OpenClaw](https://github.com/openclaw/openclaw) | 文中提到的 247K Star 智能体项目 |
| [LOC 争议说明](https://github.com/garrytan/gstack/blob/main/docs/ON_THE_LOC_CONTROVERSY.md) | 完整方法论与复现脚本 |

---

## 联系方式

**代部署 / 定制服务 / 技术咨询 请添加微信:uaycar**

---

本项目为 [garrytan/gstack](https://github.com/garrytan/gstack) 的中文翻译版本,所有代码版权归原项目作者所有,遵循其原始许可证。

**如果觉得有用,请给原项目点个 Star!** ⭐
