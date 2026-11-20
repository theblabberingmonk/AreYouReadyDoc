import "server-only";
import { sseData } from "./stream";

export type Message = { role: "system" | "user" | "assistant"; content: string };

export function aiConfigured(): boolean {
  return process.env.AI_ENABLED === "true" && Boolean(process.env.OPENCODE_GO_API_KEY);
}

async function providerRequest(messages: Message[], sessionId: string, stream = false, signal?: AbortSignal): Promise<Response> {
  // Fixed origin and known paths: never forward credentials to an arbitrary URL.
  const base = (process.env.OPENCODE_GO_BASE_URL ?? "https://opencode.ai/zen/go/v1").replace(/\/$/, "");
  const allowed = ["https://opencode.ai/inference/go/openai/v1", "https://opencode.ai/zen/go/v1", "https://opencode.ai/inference/openai/v1"];
  if (!allowed.includes(base) || !aiConfigured()) throw new Error("AI configuration unavailable");
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENCODE_GO_API_KEY}`,
      "User-Agent": "AreYouReadyDoc/1.0 (educational study chat)",
      "x-opencode-session": sessionId,
    },
    body: JSON.stringify({ model: process.env.AI_MODEL ?? "mimo-v2.6-flash", max_tokens: 1200, stream, messages }),
  });
  // Never expose/log provider bodies, credentials or request headers.
  if (!response.ok) throw new Error(`AI upstream status ${response.status}`);
  return response;
}

export async function generate(messages: Message[], sessionId: string): Promise<string> {
  const response = await providerRequest(messages, sessionId);
  const payload = await response.json();
  const reply = payload?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim() || reply.length > 20000) throw new Error("Invalid AI reply");
  // Defense in depth if an upstream service accidentally echoes our credential.
  const secret = process.env.OPENCODE_GO_API_KEY;
  if (secret && reply.includes(secret)) throw new Error("Invalid AI reply");
  return reply.trim();
}


export async function* generateStream(messages: Message[], sessionId: string, signal?: AbortSignal): AsyncGenerator<string> {
  const response = await providerRequest(messages, sessionId, true, signal);
  if (!response.body) throw new Error("Missing provider stream");
  const secret = process.env.OPENCODE_GO_API_KEY ?? "";
  // Hold enough trailing characters to catch a credential split across chunks.
  const hold = Math.max(0, secret.length - 1);
  let pending = "";
  let length = 0;
  let finished = false;
  let ended = false;
  for await (const data of sseData(response.body)) {
    if (data === "[DONE]") { ended = true; break; }
    const event = JSON.parse(data);
    if (event.error) throw new Error("Provider stream failed");
    const choice = event.choices?.[0];
    if (choice?.finish_reason) {
      if (choice.finish_reason !== "stop") throw new Error("Provider answer incomplete");
      finished = true;
    }
    const delta = choice?.delta?.content;
    if (typeof delta !== "string") continue;
    length += delta.length;
    if (length > 20000) throw new Error("Provider answer too large");
    pending += delta;
    if (secret && pending.includes(secret)) throw new Error("Invalid AI reply");
    if (pending.length > hold) {
      const ready = pending.slice(0, pending.length - hold);
      pending = pending.slice(pending.length - hold);
      yield ready;
    }
  }
  if (!ended || !finished || length === 0) throw new Error("Provider answer incomplete");
  if (pending) yield pending;
}
