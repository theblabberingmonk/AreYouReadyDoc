import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getPaper } from "@/lib/content";

/** Signed-in paper JSON for post-exam self-review. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to view papers." }, { status: 401 });
  const { id } = await params;
  const paper = getPaper(id);
  if (!paper) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ paper }, { headers: { "Cache-Control": "private, no-store" } });
}
