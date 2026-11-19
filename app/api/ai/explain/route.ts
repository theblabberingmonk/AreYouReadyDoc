import { createHash } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getPaper } from "@/lib/content";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { EXPLAIN_SYSTEM_PROMPT, explainUserMessage } from "@/lib/ai/prompts";

/**
 * POST /api/ai/explain { ref: "01:3" } → { body_md, cached }
 * Signed-in only. Shared per-content cache across users; per-user daily quota.
 * Provider: OpenCode Go (OpenAI-compatible), key held server-side only.
 */

const BodySchema = z.object({ ref: z.string().regex(/^\d{2}:\d{1,2}$/) });

function aiEnv(): { enabled: boolean; key: string; baseUrl: string; model: string; limit: number } {
  return {
    enabled: process.env.AI_ENABLED === "true",
    key: process.env.OPENCODE_GO_API_KEY ?? "",
    baseUrl: (process.env.OPENCODE_GO_BASE_URL ?? "https://opencode.ai/zen/go/v1").replace(/\/$/, ""),
    model: process.env.AI_MODEL ?? "deepseek-v4-pro",
    limit: Number(process.env.AI_DAILY_LIMIT ?? 20),
  };
}

function cacheKey(ref: string, contentHash: string, model: string): string {
  return createHash("sha256").update(`explain|${ref}|${contentHash}|${model}`).digest("hex");
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to use AI explanations." }, { status: 401 });

  const env = aiEnv();
  if (!env.enabled || !env.key) {
    return NextResponse.json(
      { error: "AI explanations are not switched on yet. The published answer above is complete on its own." },
      { status: 503 },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "AI explanations are not switched on yet. The published answer above is complete on its own." },
      { status: 503 },
    );
  }

  let ref: string;
  try {
    ref = BodySchema.parse(await request.json()).ref;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const [paperId, sn] = ref.split(":");
  const paper = getPaper(paperId);
  const question = paper?.questions.find((q) => q.n === Number(sn));
  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  const db = getServiceClient();
  const contentHash = createHash("sha256").update(question.body_md).digest("hex");
  const key = cacheKey(ref, contentHash, env.model);

  try {
    const cached = await db.from("ai_cache").select("body_md").eq("key", key).maybeSingle();
    if (cached.error) throw new Error(cached.error.message);
    if (cached.data) {
      return NextResponse.json({ body_md: cached.data.body_md, cached: true });
    }

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const usage = await db
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", "explain")
      .gte("created_at", dayAgo);
    if (usage.error) throw new Error(usage.error.message);
    if ((usage.count ?? 0) >= env.limit) {
      return NextResponse.json(
        { error: "You have used today's AI explanations. More unlock tomorrow — the published answers are always here." },
        { status: 429 },
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let reply: string;
    try {
      const response = await fetch(`${env.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env.key}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: env.model,
          max_tokens: 900,
          temperature: 0.3,
          messages: [
            { role: "system", content: EXPLAIN_SYSTEM_PROMPT },
            { role: "user", content: explainUserMessage(question.prompt, question.body_md) },
          ],
        }),
      });
      if (!response.ok) throw new Error(`provider ${response.status}`);
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      reply = payload.choices?.[0]?.message?.content?.trim() ?? "";
      if (!reply) throw new Error("provider returned no content");
    } finally {
      clearTimeout(timeout);
    }

    await db.from("ai_cache").upsert({ key, body_md: reply }, { onConflict: "key" });
    await db.from("ai_usage").insert({ user_id: userId, feature: "explain", ref });

    return NextResponse.json({ body_md: reply, cached: false });
  } catch (error) {
    console.error("ai explain failed", error);
    return NextResponse.json(
      { error: "AI is unavailable right now — the published answer above is complete on its own.", retryable: true },
      { status: 502 },
    );
  }
}
