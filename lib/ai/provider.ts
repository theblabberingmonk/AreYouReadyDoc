import "server-only";

export type Message = { role: "system" | "user" | "assistant"; content: string };

export function aiConfigured(): boolean {
  return process.env.AI_ENABLED === "true" && Boolean(process.env.OPENCODE_GO_API_KEY);
}

export async function generate(messages: Message[], sessionId: string): Promise<string> {
  // Fixed origin and known paths: never forward credentials to an arbitrary URL.
  const base = (process.env.OPENCODE_GO_BASE_URL ?? "https://opencode.ai/zen/go/v1").replace(/\/$/, "");
  const allowed = ["https://opencode.ai/inference/go/openai/v1", "https://opencode.ai/zen/go/v1", "https://opencode.ai/inference/openai/v1"];
  if (!allowed.includes(base) || !aiConfigured()) throw new Error("AI configuration unavailable");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(45000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENCODE_GO_API_KEY}`,
      "User-Agent": "AreYouReadyDoc/1.0 (educational study chat)",
      "x-opencode-session": sessionId,
    },
    body: JSON.stringify({ model: process.env.AI_MODEL ?? "mimo-v2.6-flash", max_tokens: 1200, messages }),
  });
  // Never expose/log provider bodies, credentials or request headers.
  if (!response.ok) throw new Error(`AI upstream status ${response.status}`);
  const payload = await response.json();
  const reply = payload?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim() || reply.length > 20000) throw new Error("Invalid AI reply");
  // Defense in depth if an upstream service accidentally echoes our credential.
  const secret = process.env.OPENCODE_GO_API_KEY;
  if (secret && reply.includes(secret)) throw new Error("Invalid AI reply");
  return reply.trim();
}
