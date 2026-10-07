// Groq (OpenAI-compatible) client helpers — pure functions, không phụ thuộc Nest.
// Embedding vẫn dùng Gemini (Groq không có embedding API).

export interface GroqConfig {
  label?: string;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface NormalizedToolCall {
  id: string;
  name: string;
  args: any;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRetryable = (status: number): boolean =>
  status === 429 || (status >= 500 && status <= 599);

async function postWithRetry(
  url: string,
  init: RequestInit,
  tag: string,
  onWarn: (msg: string) => void,
): Promise<Response> {
  // Gateway local (9router) thỉnh thoảng sập momentarily → budget rộng cho lỗi mạng.
  for (let attempt = 0; attempt < 6; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err: any) {
      if (attempt === 5) throw err;
      const waitMs = Math.min(2000 * 2 ** attempt, 15000);
      onWarn(`${tag} network error, retry in ${Math.round(waitMs)}ms: ${err?.message || err}`);
      await sleep(waitMs);
      continue;
    }
    if (res.ok) return res;
    const retryAfterSec = Number(res.headers?.get?.('retry-after') ?? 0);
    const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
      ? Math.min(retryAfterSec * 1000, 15000)
      : 2000;
    const retryable = res.status === 429 || (res.status >= 500 && res.status <= 599);
    if (!retryable || attempt === 5) throw new Error(`${tag} HTTP ${res.status}`);
    onWarn(`${tag} hit ${res.status}, retry in ${Math.round(waitMs)}ms`);
    await sleep(waitMs);
  }
  throw new Error(`${tag} failed after retry`);
}

const cfgLabel = (cfg: GroqConfig): string => cfg.label || 'Groq';

// Gemini function_declaration -> OpenAI tool (giữ nguyên name/description/parameters).
export function toOpenAiTools(decls: any[]): any[] {
  return (decls || []).map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

function parseToolCall(tc: any): NormalizedToolCall | null {
  const fn = tc?.function;
  if (!fn?.name) return null;
  let args: any = {};
  try {
    args = fn.arguments ? JSON.parse(fn.arguments) : {};
  } catch {
    args = {};
  }
  return { id: String(tc.id || fn.name), name: fn.name, args };
}

// Non-streaming chat + tool loop helper (1 lượt gọi; caller tự loop tối đa 5).
export async function groqChatTurn(
  cfg: GroqConfig,
  messages: any[],
  tools: any[],
  onWarn: (msg: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; call: NormalizedToolCall | null }> {
  const res = await postWithRetry(
    `${cfg.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      signal,
      body: JSON.stringify({
        model: cfg.model,
        messages,
        ...(tools?.length ? { tools } : {}),
        temperature: 0.4,
        max_tokens: 768,
        // 9router mặc định stream nếu thiếu flag → endpoint non-stream phải ghim false.
        stream: false,
      }),
    },
    `${cfgLabel(cfg)} ${cfg.model}`,
    onWarn,
  );
  const data: any = await res.json();
  const msg = data?.choices?.[0]?.message;
  const text: string = (msg?.content || '').trim();
  const call = parseToolCall((msg?.tool_calls || [])[0]);
  return { text, call };
}

// Streaming chat: forward token từng chunk qua emit, gom tool_calls rời rạc
// (OpenAI SSE tách arguments thành nhiều delta) rồi parse 1 lần cuối stream.
export async function groqStreamTurn(
  cfg: GroqConfig,
  messages: any[],
  tools: any[],
  emit: (text: string) => void,
  onWarn: (msg: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; call: NormalizedToolCall | null }> {
  const res = await postWithRetry(
    `${cfg.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      signal,
      body: JSON.stringify({
        model: cfg.model,
        messages,
        ...(tools?.length ? { tools } : {}),
        temperature: 0.4,
        max_tokens: 768,
        stream: true,
        stream_options: { include_usage: true },
      }),
    },
    `${cfgLabel(cfg)} stream ${cfg.model}`,
    onWarn,
  );
  if (!res.body) throw new Error(`${cfgLabel(cfg)} empty stream body`);
  const reader: any = (res.body as any).getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  const tcParts: Record<string, { id: string; name: string; args: string }> = {};
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try {
        const data = JSON.parse(payload);
        const delta = data?.choices?.[0]?.delta;
        if (typeof delta?.content === 'string' && delta.content) {
          text += delta.content;
          emit(delta.content);
        }
        for (const tc of delta?.tool_calls || []) {
          const idx = String(tc.index ?? 0);
          const cur = tcParts[idx] || { id: '', name: '', args: '' };
          if (tc.id) cur.id = tc.id;
          if (tc.function?.name) cur.name += tc.function.name;
          if (typeof tc.function?.arguments === 'string') cur.args += tc.function.arguments;
          tcParts[idx] = cur;
        }
      } catch {
        // Chunk JSON dở — remainder đã giữ trong buf
      }
    }
  }
  const first = tcParts['0'];
  const call = first?.name ? parseToolCall({ id: first.id || first.name, function: { name: first.name, arguments: first.args } }) : null;
  return { text: text.trim(), call };
}
