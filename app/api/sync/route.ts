import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Batched user-state sync. Clerk-authenticated; service-role Supabase client.
 * Idempotent upserts — safe to retry. Never deletes server data on partial
 * pushes; unmark/unbookmark ops delete single rows explicitly.
 */

const RefSchema = z
  .string()
  .regex(/^\d{2}:\d{1,2}$/)
  .refine((ref) => {
    const n = Number(ref.split(":")[1]);
    return n >= 1 && n <= 20;
  });

const OpSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("progress"), ref: RefSchema, revised: z.boolean() }),
  z.object({ kind: z.literal("bookmark"), ref: RefSchema }),
  z.object({ kind: z.literal("unbookmark"), ref: RefSchema }),
  z.object({
    kind: z.literal("note"),
    ref: RefSchema,
    body: z.string().max(2000),
  }),
  z.object({
    kind: z.literal("attempt"),
    paper_id: z.string().regex(/^\d{2}$/),
    started_at: z.string(),
    ended_at: z.string().nullable(),
    ratings: z.record(z.string(), z.enum(["again", "hard", "good", "easy"])).optional(),
  }),
]);

const PushSchema = z.object({ ops: z.array(OpSchema).max(500) });

function splitRef(ref: string): { paper_id: string; n: number } {
  const [paper_id, sn] = ref.split(":");
  return { paper_id, n: Number(sn) };
}

async function serverState(userId: string) {
  const db = getServiceClient();
  const [progress, bookmarks, notes, attempts] = await Promise.all([
    db.from("question_progress").select("paper_id,question_n,revised,revised_at").eq("user_id", userId),
    db.from("bookmarks").select("paper_id,question_n,created_at").eq("user_id", userId),
    db.from("notes").select("paper_id,question_n,body,updated_at").eq("user_id", userId),
    db.from("exam_attempts").select("paper_id,started_at,ended_at,ratings").eq("user_id", userId).order("created_at", { ascending: true }).limit(200),
  ]);
  for (const r of [progress, bookmarks, notes, attempts]) {
    if (r.error) throw new Error(`Supabase read failed: ${r.error.message}`);
  }
  return {
    progress: (progress.data ?? []).map((row) => ({
      ref: `${row.paper_id}:${row.question_n}`,
      revised: row.revised,
      revised_at: row.revised_at,
    })),
    bookmarks: (bookmarks.data ?? []).map((row) => ({
      ref: `${row.paper_id}:${row.question_n}`,
      created_at: row.created_at,
    })),
    notes: (notes.data ?? []).map((row) => ({
      ref: `${row.paper_id}:${row.question_n}`,
      body: row.body,
      updated_at: row.updated_at,
    })),
    attempts: (attempts.data ?? []).map((row) => ({
      paper_id: row.paper_id,
      started_at: row.started_at,
      ended_at: row.ended_at,
      ratings: row.ratings ?? undefined,
    })),
  };
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Signed in only." }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sync is not configured yet." }, { status: 503 });
  }
  try {
    return NextResponse.json({ ok: true, state: await serverState(userId) });
  } catch (error) {
    console.error("sync GET failed", error);
    return NextResponse.json({ error: "Sync unavailable right now." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Signed in only." }, { status: 401 });
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Sync is not configured yet." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = PushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sync payload." }, { status: 400 });
  }

  const db = getServiceClient();
  const now = new Date().toISOString();

  try {
    for (const op of parsed.data.ops) {
      if (op.kind === "progress") {
        const { paper_id, n } = splitRef(op.ref);
        if (op.revised) {
          const { error } = await db.from("question_progress").upsert(
            { user_id: userId, paper_id, question_n: n, revised: true, revised_at: now, updated_at: now },
            { onConflict: "user_id,paper_id,question_n" },
          );
          if (error) throw error;
        } else {
          const { error } = await db
            .from("question_progress")
            .delete()
            .eq("user_id", userId)
            .eq("paper_id", paper_id)
            .eq("question_n", n);
          if (error) throw error;
        }
      } else if (op.kind === "bookmark") {
        const { paper_id, n } = splitRef(op.ref);
        const { error } = await db.from("bookmarks").upsert(
          { user_id: userId, paper_id, question_n: n, created_at: now },
          { onConflict: "user_id,paper_id,question_n" },
        );
        if (error) throw error;
      } else if (op.kind === "unbookmark") {
        const { paper_id, n } = splitRef(op.ref);
        const { error } = await db
          .from("bookmarks")
          .delete()
          .eq("user_id", userId)
          .eq("paper_id", paper_id)
          .eq("question_n", n);
        if (error) throw error;
      } else if (op.kind === "note") {
        const { paper_id, n } = splitRef(op.ref);
        if (!op.body.trim()) {
          const { error } = await db
            .from("notes")
            .delete()
            .eq("user_id", userId)
            .eq("paper_id", paper_id)
            .eq("question_n", n);
          if (error) throw error;
        } else {
          const { error } = await db.from("notes").upsert(
            { user_id: userId, paper_id, question_n: n, body: op.body.trim(), updated_at: now },
            { onConflict: "user_id,paper_id,question_n" },
          );
          if (error) throw error;
        }
      } else if (op.kind === "attempt") {
        const { error } = await db.from("exam_attempts").insert({
          user_id: userId,
          paper_id: op.paper_id,
          started_at: op.started_at,
          ended_at: op.ended_at,
          ratings: op.ratings ?? null,
        });
        if (error) throw error;
      }
    }

    return NextResponse.json({ ok: true, state: await serverState(userId) });
  } catch (error) {
    console.error("sync POST failed", error);
    return NextResponse.json({ error: "Sync unavailable right now." }, { status: 503 });
  }
}
