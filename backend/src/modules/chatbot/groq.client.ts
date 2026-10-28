// Groq / OpenAI-compatible client helper — simple chat turn, không phụ thuộc Nest.

export interface GroqConfig {
  label?: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postWithRetry(
  url: string,
  init: RequestInit,
  tag: string,
  onWarn?: (msg: string) => void,
): Promise<Response> {
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err: any) {
      if (attempt === maxAttempts - 1) throw err;
      const waitMs = Math.min(1000 * 2 ** attempt, 5000);
      onWarn?.(`${tag} network error, retry in ${waitMs}ms: ${err?.message || err}`);
      await sleep(waitMs);
      continue;
    }

    if (res.ok) return res;

    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
    if (!retryable || attempt === maxAttempts - 1) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`${tag} HTTP ${res.status}: ${errBody}`);
    }

    const waitMs = Math.min(1500 * (attempt + 1), 5000);
    onWarn?.(`${tag} hit ${res.status}, retry in ${waitMs}ms`);
    await sleep(waitMs);
  }
  throw new Error(`${tag} failed after retry`);
}

// Simple single-turn chat completion
export async function groqChatTurn(
  cfg: GroqConfig,
  messages: ChatMessage[],
  onWarn?: (msg: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string }> {
  const res = await postWithRetry(
    `${cfg.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      signal,
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: 0.5,
        max_tokens: 1024,
        stream: false,
      }),
    },
    `${cfg.label || 'LLM'} (${cfg.model})`,
    onWarn,
  );

  const data: any = await res.json();
  const text = data?.choices?.[0]?.message?.content || '';
  return { text: text.trim() };
}
