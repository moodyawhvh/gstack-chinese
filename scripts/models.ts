/**
 * 模型分类表 —— 中立模块,不从 hosts/ 或 resolvers/ 导入任何东西。
 *
 * 这里是 model-overlays/{family}.md 所支持的模型族。host 配置以
 * `defaultModel` 字符串引用这些名称(生成期校验),
 * 但模型轴与 host 轴相互独立。
 *
 * 重要:host ≠ model。Claude Code 可以跑任意 Claude 模型(Opus、Sonnet、
 * Haiku 及未来型号)。Codex CLI 跑 GPT/o-series 模型。Cursor 与 OpenCode
 * 可以对接多家供应商。生成器**不会**从 host 自动推断模型 —— 用户可以显式
 * 传 --model,否则每个 host 使用自己的生成默认值。本模块之外的例外:
 * ./setup 会从 ${CODEX_HOME:-~/.codex}/config.toml 检测 Codex 模型
 * (scripts/resolve-codex-generation-model.ts),并以显式 --model 传入。
 */

export const ALL_MODEL_NAMES = [
  'claude',
  'opus-4-7',
  'fable-5',
  'opus-4-8',
  'sonnet-5',
  'gpt',
  'gpt-5.4',
  'gpt-5.6-sol',
  'gemini',
  'o-series',
] as const;

export type Model = (typeof ALL_MODEL_NAMES)[number];

/**
 * 把 CLI 传入的模型参数解析为已知 Model 族。
 *
 * 优先级规则:
 * 1. 与 ALL_MODEL_NAMES 精确匹配 → 原样返回。这是唯一能选中
 *    `gpt-5.6-sol` 的路径 —— Sol 是刻意设计的仅精确匹配。
 * 2. 常见变体的族启发式:
 *    - `gpt-5.4-mini`、`gpt-5.4-turbo`、`gpt-5.4-*` → `gpt-5.4`
 *    - `gpt-*`(其他一切 GPT,含其他 5.6 变体)→ `gpt`
 *    - `o3`、`o4`、`o4-mini`、`o1`、`o1-mini`、`o1-pro` → `o-series`
 *    - `claude-*`(sonnet、opus、haiku、任意版本)→ `claude`
 *    - `gemini-*`(2.5-pro、flash 等)→ `gemini`
 * 3. 未知输入 → 返回 null(由调用方决定:报错或回退)。
 *
 * model-overlays/{model}.md 里的 resolver 文件会做进一步的回退
 * (如缺少 gpt-5.4.md 时回退到 gpt.md)。本函数只负责把 CLI 输入
 * 规范化为族名。
 */
export function resolveModel(input: string): Model | null {
  const s = input.trim();
  if (!s) return null;

  // 先做精确匹配
  if ((ALL_MODEL_NAMES as readonly string[]).includes(s)) {
    return s as Model;
  }

  // 族启发式
  // Sol 永远走不到这里 —— 上面的精确匹配已经把它返回了。不要给 Sol 加
  // 族模式:Terra、Luna、未来的 5.6 变体以及带后缀的模型 ID 都**不能**
  // 继承 Sol 的行为特征,它们必须落到下面通用的 `gpt` 族。
  if (/^gpt-5\.4(-|$)/.test(s)) return 'gpt-5.4';
  if (/^gpt(-|$)/.test(s)) return 'gpt';
  if (/^o[0-9]+(-|$)/.test(s)) return 'o-series';
  if (/^claude-opus-4-7(-|$)/.test(s)) return 'opus-4-7';
  if (/^claude-fable-5(-|$)/.test(s)) return 'fable-5';
  if (/^claude-opus-4-8(-|$)/.test(s)) return 'opus-4-8';
  if (/^claude-sonnet-5(-|$)/.test(s)) return 'sonnet-5';
  if (/^claude(-|$)/.test(s)) return 'claude';
  if (/^gemini(-|$)/.test(s)) return 'gemini';

  return null;
}

/**
 * 对照 ALL_MODEL_NAMES 校验字符串。HostConfig 声明 `defaultModel` 时,
 * host-config 校验器会调用本函数。合法返回 null,否则返回错误信息。
 */
export function validateModel(input: string): string | null {
  if ((ALL_MODEL_NAMES as readonly string[]).includes(input)) return null;
  return `'${input}' is not a known model. Use ${ALL_MODEL_NAMES.join(', ')}.`;
}
