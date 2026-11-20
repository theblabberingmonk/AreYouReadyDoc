/** Incremental SSE decoding, shared by provider code and tests. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lines: string[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      if (buffer.length > 100000) throw new Error("Invalid provider event");
      let at: number;
      while ((at = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, at).replace(/\r$/, "");
        buffer = buffer.slice(at + 1);
        if (line === "") { if (lines.length) { yield lines.join("\n"); lines = []; } }
        else if (line.startsWith("data:")) lines.push(line.slice(5).replace(/^ /, ""));
      }
      if (done) break;
    }
    // An unterminated event is not evidence of a complete generation.
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
