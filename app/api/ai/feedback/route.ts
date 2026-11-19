import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/** POST /api/ai/feedback { ref, helpful } — thumbs on an AI explanation. */

const BodySchema = z.object({
  ref: z.string().regex(/^\d{2}:\d{1,2}$/),
  helpful: z.boolean(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Signed in only." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Unavailable." }, { status: 503 });

  let parsed: z.infer<typeof BodySchema>;
  try {
    parsed = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { error } = await getServiceClient()
    .from("ai_usage")
    .insert({ user_id: userId, feature: "explain-feedback", ref: parsed.ref, meta: { helpful: parsed.helpful } });
  if (error) {
    console.error("ai feedback failed", error);
    return NextResponse.json({ error: "Unavailable." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
