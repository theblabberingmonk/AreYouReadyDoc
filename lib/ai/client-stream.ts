import type { Quota, Turn } from "./contracts";
export type ChatEvent =
  | { type: "meta"; requestId: string }
  | { type: "delta"; text: string }
  | { type: "done"; conversationId: string; turn: Turn; quota?: Quota }
  | { type: "error"; error: string; code?: string; status?: number };

export async function consumeChat(body: ReadableStream<Uint8Array>, onEvent: (event: ChatEvent) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 100000) throw new Error("Invalid chat response.");
      let at: number;
      while ((at = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, at).trim(); buffer = buffer.slice(at + 1);
        if (!line) continue;
        const event = JSON.parse(line) as ChatEvent;
        onEvent(event);
        if (event.type === "done") completed = true;
      }
      if (done) break;
    }
    if (!completed) throw new Error("The connection was interrupted. Send again to retrieve a saved answer or retry.");
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
