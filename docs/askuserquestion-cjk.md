> 🌐 本文档由 [garrytan/gstack](https://github.com/garrytan/gstack) 翻译,英文原版见原项目。

# AskUserQuestion — 非 ASCII / CJK 字符

当 AskUserQuestion 中出现中文(繁体/简体)、日文、韩文或其他非 ASCII 文本时,按需阅读本文。操作性规则在常驻加载的 AskUserQuestion 自检里("非 ASCII 字符必须直接写出,不得使用 \u 转义");本文是完整论证。

## 规则

当任何字符串字段(question、option label、option description)包含非 ASCII 文本时,必须在 JSON 字符串里直接输出 UTF-8 字面字符。**绝不要转义成 `\uXXXX`。**

Claude Code 的工具参数管道原生支持 UTF-8,字符原样透传。仅允许 JSON 强制转义:`\n`、`\t`、`\"`、`\\`。

## 为什么转义会失败

手动转义要求模型凭训练记忆逐个码位还原,这对长 CJK 字符串极不可靠——模型经常写错码位。例如:以为 `㄃` 是 管(U+7BA1)而写出 `㄃`,结果用户看到 `管理工具` 被渲染成 `㄃3用箱`。

触发场景正是包含数百个 CJK 字符的长篇多行问题:这恰恰是条件反射式转义被激活的时刻,也恰恰是写错码位代价最大的时刻。长 ≠ 转义。保持字面字符。

- 错误:`"question": "請選擇\uXXXX\uXXXX\uXXXX\uXXXX"`
- 正确:`"question": "請選擇管理工具"`
