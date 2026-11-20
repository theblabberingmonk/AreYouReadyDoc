import { auth } from "@clerk/nextjs/server";
import { getPaper } from "@/lib/content";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { EXPLAIN_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { ExplainInput } from "@/lib/ai/contracts";
import { aiConfigured } from "@/lib/ai/provider";
import { AIError, answer } from "@/lib/ai/service";
import { InputError, json, readInput } from "@/lib/ai/http";
export const maxDuration = 60;
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Sign in to use AI explanations." }, 401);
  if (!aiConfigured() || !isSupabaseConfigured()) return json({ error: "AI explanations are not switched on yet." }, 503);
  try {
    const parsed = ExplainInput.safeParse(await readInput(request));
    if (!parsed.success) return json({ error: "Invalid request." }, 400);
    const [paperId, number] = parsed.data.ref.split(":");
    const question = getPaper(paperId)?.questions.find(q => q.n === Number(number));
    if (!question) return json({ error: "Question not found." }, 404);
    return json(await answer({ userId, requestId: parsed.data.requestId, feature: "explain", prompt: `Explain the reasoning, memory hooks and examiner traps for: ${question.prompt}`.slice(0,3000), system: EXPLAIN_SYSTEM_PROMPT, context: question.body_md.slice(0,18000), sources: [{ ref: parsed.data.ref, title: question.title, href: `/papers/${paperId}#q${question.n}` }] }));
  } catch(e) {
    if (e instanceof InputError) return json({ error: e.message },400);
    if (e instanceof AIError) return json({ error: e.message, code: e.code, retryable: e.status >= 500 },e.status);
    return json({ error: "AI is temporarily unavailable." },503);
  }
}
