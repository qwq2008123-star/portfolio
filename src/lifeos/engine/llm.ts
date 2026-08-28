// ─── LLM 适配层：默认本地推理引擎，检测到环境变量时自动切换 OpenAI 兼容 API ───
//
// 配置（.env.local）—— 直连模式:
//   VITE_LLM_BASE_URL=https://api.openai.com/v1   （或任意 OpenAI 兼容端点）
//   VITE_LLM_API_KEY=sk-...
//   VITE_LLM_MODEL=gpt-4o-mini
//
// 配置（.env.local）—— DeepSeek（走 vite 代理，Key 不进前端）:
//   DEEPSEEK_API_KEY=sk-...
//   VITE_LLM_BASE_URL=/deepseek
//   VITE_LLM_MODEL=deepseek-chat
//
// VITE_LLM_BASE_URL 以 "/" 开头视为同源代理路径；未配置时全部走本地模拟引擎。

export interface LLMAdapter {
  readonly name: string;
  readonly isRemote: boolean;
  complete(system: string, user: string): Promise<string>;
}

class LocalAdapter implements LLMAdapter {
  readonly name = "LifeOS-Local-Engine";
  readonly isRemote = false;

  async complete(_system: string, _user: string): Promise<string> {
    // 本地引擎不生成自由文本；各模块使用确定性模板逻辑
    return "";
  }
}

class OpenAICompatibleAdapter implements LLMAdapter {
  readonly name: string;
  readonly isRemote = true;

  private baseUrl: string;
  private apiKey: string;
  private model: string;

  constructor(baseUrl: string, apiKey: string, model: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.model = model;
    this.name = `remote:${model}`;
  }

  async complete(system: string, user: string): Promise<string> {
    // 30s 超时：防止请求挂起导致界面"永远思考中"，超时后回退本地引擎
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          // 同源代理模式下由代理注入真实 Key，这里不带 Authorization
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.8,
        }),
      });
      if (!res.ok) throw new Error(`LLM request failed: ${res.status}`);
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return data.choices?.[0]?.message?.content?.trim() ?? "";
    } finally {
      clearTimeout(timeout);
    }
  }
}

let cached: LLMAdapter | null = null;

export function getLLM(): LLMAdapter {
  if (cached) return cached;
  const env = import.meta.env as Record<string, string | undefined>;
  const baseUrl = env.VITE_LLM_BASE_URL;
  const apiKey = env.VITE_LLM_API_KEY;
  const model = env.VITE_LLM_MODEL ?? "gpt-4o-mini";
  // 以 "/" 开头的 baseUrl 是同源代理（如 /deepseek），无需前端携带 Key
  const isProxy = !!baseUrl?.startsWith("/");
  cached =
    baseUrl && (isProxy || apiKey)
      ? new OpenAICompatibleAdapter(baseUrl, apiKey ?? "", model)
      : new LocalAdapter();
  return cached;
}

/** 把人格档案序列化为 LLM 上下文 */
export function personaContext(profile: unknown, persona: unknown): string {
  return `【用户人格档案】${JSON.stringify(profile)}\n【AI人格模型】${JSON.stringify(persona)}`;
}
