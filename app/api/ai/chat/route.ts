import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { ChatInput } from "@/lib/ai/contracts";
import { aiConfigured } from "@/lib/ai/provider";
import { CHAT_SYSTEM, studyContext } from "@/lib/ai/context";
import { answer, quota, turns, AIError } from "@/lib/ai/service";
import { InputError, json, readInput } from "@/lib/ai/http";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
export const maxDuration = 60;

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Sign in to use study chat." }, 401);
  if (!isSupabaseConfigured()) return json({ error: "Study chat is being set up." }, 503);
  try {
    const id = new URL(request.url).searchParams.get("conversationId");
    if (id) {
      if (!z.uuid().safeParse(id).success) return json({ error: "Invalid conversation." }, 400);
      const { data, error } = await getServiceClient().from("ai_conversations").select("id,title,updated_at").eq("id", id).eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Conversation not found." }, 404);
      return json({ conversation: data, turns: await turns(userId, id), quota: await quota(userId), enabled: aiConfigured() });
    }
    const { data, error } = await getServiceClient().from("ai_conversations").select("id,title,updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(50);
    if (error) throw error;
    return json({ conversations: data ?? [], quota: await quota(userId), enabled: aiConfigured() });
  } catch { return json({ error: "Unable to load study chat. Please try again." }, 503); }
}
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Sign in to use study chat." }, 401);
  if (!aiConfigured() || !isSupabaseConfigured()) return json({ error: "Study chat is not switched on yet." }, 503);
  try {
    const parsed = ChatInput.safeParse(await readInput(request));
    if (!parsed.success) return json({ error: "Enter a question of up to 3,000 characters." }, 400);
    const input = parsed.data;
    // Include the last user question so brief follow-ups retain retrieval context.
    let previous = "";
    if (input.conversationId) {
      const history = await turns(userId, input.conversationId, 1);
      previous = history.at(-1)?.prompt ?? "";
    }
    const context = studyContext(`${input.message} ${previous}`);
    const result = await answer({ userId, requestId: input.requestId, conversationId: input.conversationId, feature: "chat", prompt: input.message, system: CHAT_SYSTEM, context: context.text, sources: context.sources });
    // Retrieve saved sources on replay rather than recomputing them.
    const saved = await getServiceClient().from("ai_requests").select("id,prompt,reply,sources").eq("user_id",userId).eq("id",input.requestId).eq("status","completed").single();
    if (saved.error) throw saved.error;
    return json({ ...result, turn: saved.data });
  } catch (e) {
    if (e instanceof InputError) return json({ error: e.message }, 400);
    if (e instanceof AIError) return json({ error: e.message, code: e.code }, e.status);
    return json({ error: "AI is temporarily unavailable." }, 503);
  }
}
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) return json({ error: "Sign in to use study chat." }, 401);
  if (!isSupabaseConfigured()) return json({ error: "Study chat is unavailable." }, 503);
  try {
    const schema = z.object({ conversationId: z.uuid() }).strict();
    const parsed = schema.safeParse(await readInput(request));
    if (!parsed.success) return json({ error: "Invalid conversation." }, 400);
    const { data, error } = await getServiceClient().rpc("delete_ai_conversation", { p_user_id: userId, p_conversation_id: parsed.data.conversationId });
    if (error) throw error;
    if (!data) return json({ error: "Conversation unavailable or still preparing an answer. Please try again." },409);
    return json({ deleted: true });
  } catch(e) { return json({ error: e instanceof InputError ? e.message : "Unable to delete conversation." }, e instanceof InputError ? 400 : 503); }
}
