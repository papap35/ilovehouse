const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";
const ANTHROPIC_VERSION = "2023-06-01";

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * 呼叫 Anthropic Claude API，回傳文字內容。
 * 未設定 ANTHROPIC_API_KEY 或呼叫失敗時會拋出錯誤，由呼叫端決定 fallback 行為。
 */
export async function callClaude(params: {
  system: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY 未設定");
  }

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens ?? 2000,
      system: params.system,
      messages: [{ role: "user", content: params.userMessage }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    let flatDetail = detail.slice(0, 300);
    try {
      const parsed = JSON.parse(detail);
      if (parsed?.error?.type || parsed?.error?.message) {
        flatDetail = `${parsed.error.type ?? "unknown_error"} - ${parsed.error.message ?? ""}`;
      }
    } catch {
      // 回應不是 JSON，維持原始文字片段
    }
    throw new Error(`Claude API 呼叫失敗 (${res.status}): ${flatDetail}`);
  }

  const data = await res.json();
  const blocks: { type?: string; text?: string }[] = Array.isArray(data?.content)
    ? data.content
    : [];
  // 部分模型（例如具備 extended thinking 的模型）會在 text 區塊之前
  // 回傳 thinking／redacted_thinking 等其他類型的區塊，因此不能假設
  // content[0] 就是文字內容，需搜尋第一個 type === "text" 的區塊。
  const text = blocks.find((block) => block?.type === "text")?.text;
  if (typeof text !== "string") {
    const blockTypes = blocks.map((b) => b?.type ?? "unknown").join(", ") || "(空陣列)";
    throw new Error(`Claude API 回應格式不符預期，content 區塊類型：${blockTypes}`);
  }
  return text;
}

/** 從模型回應中擷取 JSON（容忍前後說明文字或 ```json 區塊） */
export function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("回應中找不到 JSON 內容");
  }
  return JSON.parse(candidate.slice(start, end + 1)) as T;
}
