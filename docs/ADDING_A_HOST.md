> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

# 为 gstack 接入新 Host

gstack 采用声明式 host 配置系统。每个受支持的 AI 编码 agent(Claude、Codex、Factory、Kiro、OpenCode、Slate、Cursor、OpenClaw、Hermes、GBrain)都定义为由 `defineHost()` 工厂构建的类型化 TypeScript 配置对象。接入新 host 只需新建一个文件并重新导出,生成器、setup、工具链代码零改动。

## 工作原理

```
hosts/
├── define-host.ts   # defineHost() 工厂:共享默认值 + 派生字段
├── claude.ts        # 主 host
├── codex.ts         # OpenAI Codex CLI
├── factory.ts       # Factory Droid
├── kiro.ts          # Amazon Kiro
├── opencode.ts      # OpenCode
├── slate.ts         # Slate (Random Labs)
├── cursor.ts        # Cursor
├── openclaw.ts      # OpenClaw
├── hermes.ts        # Hermes (Nous Research)
├── gbrain.ts        # GBrain
└── index.ts         # 注册表:统一导入,派生 Host 类型
```

每个配置文件调用 `defineHost()` 并导出得到的 `HostConfig` 对象,它告诉生成器:
- 生成的 skill 放哪里(路径)
- 如何转换 frontmatter(字段白名单/黑名单)
- 需要改写哪些 Claude 特有引用(路径、工具名)
- 自动安装时检测哪个二进制
- 抑制哪些 resolver 章节
- 安装时软链哪些资源

生成器、setup 脚本、平台检测、卸载、健康检查、worktree 复制、测试全部读取这些配置,没有任何一处写死某个 host 的代码。

## 分步操作:接入新 host

### 1. 创建配置文件

配置通过 `hosts/define-host.ts` 中的 `defineHost()` 工厂构建。你只需写与通用外部 host 默认值不同的字段,其余全部由 host 名派生。一个全默认 host 只有两个字段(参见 `hosts/slate.ts` 或 `hosts/cursor.ts`):

```typescript
import { defineHost } from './define-host';

const myhost = defineHost({
  name: 'myhost',
  displayName: 'MyHost',
});

export default myhost;
```

它会展开为带以下默认值的完整 `HostConfig`:

- `cliCommand: 'myhost'`(即 name;用于 `command -v` 检测的二进制名)
- `cliAliases: []`
- `defaultModel: 'claude'`(生成时未显式传 `--model` 时使用的模型覆盖;codex 覆盖为 `'gpt'`)
- `globalRoot` / `localSkillRoot`:`.myhost/skills/gstack`,`hostSubdir`:`.myhost`
- `usesEnvVars: true`(仅 Claude 为 false,它使用字面 `~` 路径)
- `frontmatter`:白名单保留 `name` + `description`,不限描述长度
- `generation`:无元数据文件,`skipSkills: ['codex']`(codex skill 仅限 Claude)
- `pathRewrites`:由解析后的路径派生的标准三元组
  (`~/.claude/skills/gstack` → `~/{globalRoot}`,`.claude/skills/gstack` →
  `{localSkillRoot}`,`.claude/skills` → `{hostSubdir}/skills`)
- `suppressedResolvers`:GBrain 那一对(`GBRAIN_CONTEXT_LOAD`、`GBRAIN_SAVE_RESULTS`)
- `runtimeRoot`:共享资源列表(`bin`、`browse/dist`、`browse/bin`、
  `gstack-upgrade`、`ETHOS.md` + 评审清单文件)
- `install`:`{ linkingStrategy: 'symlink-generated' }`
- `learningsMode: 'basic'`

把任意字段传给 `defineHost()` 即可覆盖。路径改写有两个选项:

- `extraPathRewrites`:在派生三元组**之后**追加条目(如 kiro 的 codex 路径清理,或 AGENTS.md host 的 `{ from: 'CLAUDE.md', to: 'AGENTS.md' }`)。标准三元组够用但还需要更多时用它。
- `pathRewrites`:整体替换派生列表。只用于非机械性场景——codex 和 factory 把全局路径改写为 `$GSTACK_ROOT` 并附加一条评审路径改写;claude 的列表为空。

两者互斥(同时传入工厂会抛错)。

`define-host.ts` 还导出可用于展开组合的共享常量:`CROSS_MODEL_RESOLVERS`(五个调用 Codex 的 resolver,在不具备跨模型调用能力的 host 上抑制)、`GBRAIN_RESOLVERS`(默认抑制对)、`EXEC_STYLE_TOOL_REWRITES`(openclaw 与 gbrain 共享的 OpenClaw 风格小写工具名改写)。

优秀范例:`hosts/opencode.ts`(路径 + runtimeRoot 覆盖)、`hosts/factory.ts`(工具改写与条件字段)、`hosts/hermes.ts`(带自定义工具改写与 resolver 组合的 AGENTS.md host)。

### 2. 注册到 index

编辑 `hosts/index.ts`:

```typescript
import myhost from './myhost';

// 加入 ALL_HOST_CONFIGS 数组:
export const ALL_HOST_CONFIGS: HostConfig[] = [
  claude, codex, factory, kiro, opencode, slate, cursor, openclaw, hermes, gbrain, myhost
];

// 加入重新导出:
export { claude, codex, factory, kiro, opencode, slate, cursor, openclaw, hermes, gbrain, myhost };
```

### 3. 加入 .gitignore

把 `.myhost/` 加进 `.gitignore`(生成的 skill 文档不入库)。

### 4. 生成并验证

```bash
# 为新 host 生成 skill 文档
bun run gen:skill-docs --host myhost

# 验证输出存在且无 .claude/skills 泄漏
ls .myhost/skills/gstack-*/SKILL.md
grep -r ".claude/skills" .myhost/skills/ | head -5
# (应为空)

# 为所有 host 生成(含新 host)
bun run gen:skill-docs --host all

# 健康仪表盘会显示新 host
bun run skill:check
```

### 5. 跑测试

```bash
bun test test/gen-skill-docs.test.ts
bun test test/host-config.test.ts
```

参数化冒烟测试会自动纳入新 host,零测试代码要写。它们验证:输出存在、无路径泄漏、frontmatter 合法、新鲜度检查通过、codex skill 已排除。

### 6. 更新 README.md

在相应章节补充新 host 的安装说明。

## 配置字段参考

完整的 `HostConfig` 接口及逐字段 JSDoc 注释见 `scripts/host-config.ts`。

关键字段:

| 字段 | 用途 |
|-------|---------|
| `defaultModel` | 生成时未显式传 `--model` 时渲染的模型覆盖(对照 `scripts/models.ts` 的 `ALL_MODEL_NAMES` 校验) |
| `frontmatter.mode` | `allowlist`(只保留列出的)或 `denylist`(剔除列出的) |
| `frontmatter.descriptionLimit` | 最大字符数,`null` 表示不限制 |
| `frontmatter.descriptionLimitBehavior` | `error`(构建失败)、`truncate`、`warn` |
| `frontmatter.conditionalFields` | 依据模板值追加字段(如 sensitive → disable-model-invocation) |
| `frontmatter.renameFields` | 重命名模板字段(如 voice-triggers → triggers) |
| `pathRewrites` | 对内容做字面 replaceAll,顺序敏感;整体替换派生三元组 |
| `extraPathRewrites` | (仅 defineHost 入参)追加在派生三元组之后 |
| `toolRewrites` | 改写 Claude 工具名(如 "use the Bash tool" → "run this command") |
| `suppressedResolvers` | 对该 host 返回空的 resolver 函数 |
| `coAuthorTrailer` | 提交时的 Git co-author 字符串 |
| `boundaryInstruction` | 跨模型调用的防提示注入警告 |

## 校验

`scripts/host-config.ts` 中的 `validateHostConfig()` 检查:
- 名称:小写字母数字加连字符
- CLI 命令:字母数字加连字符/下划线
- `defaultModel`:必须是 `scripts/models.ts` `ALL_MODEL_NAMES` 中的已知模型族
- 路径:仅限安全字符(字母数字、`.`、`/`、`$`、`{}`、`~`、`-`、`_`)
- 所有配置之间无重复的名称、hostSubdir、globalRoot

运行 `bun run scripts/host-config-export.ts validate` 检查全部配置。
