/**
 * defineHost() 工厂 —— 过去散落在 hosts/*.ts 里复制粘贴的那份逻辑,
 * 现在只存在这一处。
 *
 * host 未覆盖的每个字段都取通用外部 host 默认值:
 * 路径由 host 名派生(`.{name}/skills/gstack`)、allowlist frontmatter
 * (name + description)、无元数据附属文件、跳过 codex skill、由解析路径
 * 派生的标准三条 pathRewrite、共享的 runtimeRoot 资源列表,
 * 以及 symlink-generated 安装策略。
 *
 * 默认值每次调用都全新构造,因此任意两个 host 配置绝不会共享同一个
 * 可变数组/对象。当前缺省的可选字段(toolRewrites、coAuthorTrailer、
 * boundaryInstruction)除非 host 显式设置,否则保持缺省 ——
 * 工厂绝不给可选字段塞默认值。
 */

import type { HostConfig } from '../scripts/host-config';

type PathRewrite = { from: string; to: string };

/**
 * 编排跨模型第二意见的前导 resolver(它们会 shell 出 Codex 或拉起
 * review army)。在不能或不应调用其他模型的 host 上被抑制 ——
 * Codex 自己(不能调用自己)以及非 Claude 的 agent 运行时
 * (OpenClaw、Hermes、GBrain)。
 */
export const CROSS_MODEL_RESOLVERS: string[] = [
  'DESIGN_OUTSIDE_VOICES',  // design.ts —— 调 Codex 获取外部声音
  'ADVERSARIAL_STEP',       // review.ts —— 对抗式调用 Codex
  'CODEX_SECOND_OPINION',   // review.ts —— 调 Codex
  'CODEX_PLAN_REVIEW',      // review.ts —— 调 Codex
  'REVIEW_ARMY',            // review-army.ts —— 多模型编排
];

/**
 * brain 感知 resolver。默认在每个 host 上抑制 ——
 * 只有能与 GBrain 配合运行的 host(hermes、gbrain)保持激活。
 */
export const GBRAIN_RESOLVERS: string[] = [
  'GBRAIN_CONTEXT_LOAD',
  'GBRAIN_SAVE_RESULTS',
];

/**
 * OpenClaw 风格 agent 运行时的工具名改写(小写 exec / read / write / edit
 * 工具,子 agent 用 sessions_spawn)。OpenClaw 与 GBrain 逐字节共享这份表;
 * 在使用点展开进 `toolRewrites`,让每个配置持有自己的副本。
 */
export const EXEC_STYLE_TOOL_REWRITES: Record<string, string> = {
  'use the Bash tool': 'use the exec tool',
  'use the Write tool': 'use the write tool',
  'use the Read tool': 'use the read tool',
  'use the Edit tool': 'use the edit tool',
  'use the Agent tool': 'use sessions_spawn',
  'use the Grep tool': 'search for',
  'use the Glob tool': 'find files matching',
  'the Bash tool': 'the exec tool',
  'the Read tool': 'the read tool',
  'the Write tool': 'the write tool',
  'the Edit tool': 'the edit tool',
};

/**
 * host 定义入参:name + displayName 必填,其余字段都是对上文
 * 通用外部 host 默认值的覆盖。
 *
 * `extraPathRewrites` 追加到派生的标准三元组之后
 * (`~/.claude/skills/gstack` → `~/{globalRoot}`,`.claude/skills/gstack` →
 * localSkillRoot,`.claude/skills` → `{hostSubdir}/skills`)。改写规则
 * 无法机械派生的 host(codex、factory 用 $GSTACK_ROOT 并附加一条
 * review 改写;claude 没有改写)改用 `pathRewrites` 整体替换该列表。
 * 两者互斥。
 */
export interface HostOverrides<N extends string = string>
  extends Partial<Omit<HostConfig, 'name' | 'displayName'>> {
  name: N;
  displayName: string;
  /** 追加在派生的 pathRewrite 三元组之后。与 `pathRewrites` 互斥。 */
  extraPathRewrites?: PathRewrite[];
}

export function defineHost<const N extends string>(overrides: HostOverrides<N>): HostConfig & { name: N } {
  const {
    name,
    displayName,
    cliCommand = name,
    cliAliases = [],
    defaultModel = 'claude',
    globalRoot = `.${name}/skills/gstack`,
    localSkillRoot = `.${name}/skills/gstack`,
    hostSubdir = `.${name}`,
    usesEnvVars = true,  // 仅 Claude 为 false(字面 ~ 路径,不使用 $GSTACK_ROOT)
    frontmatter = {
      mode: 'allowlist',
      keepFields: ['name', 'description'],
      descriptionLimit: null,
    },
    generation = {
      generateMetadata: false,
      skipSkills: ['codex'],  // codex skill 是包装 codex exec 的 Claude 专用件
    },
    pathRewrites,
    extraPathRewrites,
    toolRewrites,
    suppressedResolvers = [...GBRAIN_RESOLVERS],
    runtimeRoot = {
      globalSymlinks: ['bin', 'browse/dist', 'browse/bin', 'gstack-upgrade', 'ETHOS.md'],
      globalFiles: {
        'review': ['checklist.md', 'TODOS-format.md'],
      },
    },
    install = {
      linkingStrategy: 'symlink-generated',
    },
    coAuthorTrailer,
    learningsMode = 'basic',
    boundaryInstruction,
  } = overrides;

  if (pathRewrites && extraPathRewrites) {
    throw new Error(
      `[${name}] pathRewrites and extraPathRewrites are mutually exclusive: ` +
      `pathRewrites replaces the derived trio, extraPathRewrites appends to it`
    );
  }

  const resolvedPathRewrites: PathRewrite[] = pathRewrites ?? [
    { from: '~/.claude/skills/gstack', to: `~/${globalRoot}` },
    { from: '.claude/skills/gstack', to: localSkillRoot },
    { from: '.claude/skills', to: `${hostSubdir}/skills` },
    ...(extraPathRewrites ?? []),
  ];

  // 下方字段顺序镜像 HostConfig 接口(以及最初的手写配置),
  // 保证序列化输出稳定。可选字段用条件展开,未覆盖的项保持真正缺席
  // (不产生 `key: undefined` 条目)。
  return {
    name,
    displayName,
    cliCommand,
    cliAliases,
    defaultModel,
    globalRoot,
    localSkillRoot,
    hostSubdir,
    usesEnvVars,
    frontmatter,
    generation,
    pathRewrites: resolvedPathRewrites,
    ...(toolRewrites !== undefined ? { toolRewrites } : {}),
    suppressedResolvers,
    runtimeRoot,
    install,
    ...(coAuthorTrailer !== undefined ? { coAuthorTrailer } : {}),
    learningsMode,
    ...(boundaryInstruction !== undefined ? { boundaryInstruction } : {}),
  };
}
