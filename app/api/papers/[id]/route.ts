import { NextResponse } from "next/server";
import { getPaper } from "@/lib/content";

/** Full paper JSON for post-exam self-review. Content is public; exam
 *  integrity during the timed run is by client design (prompts only). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const paper = getPaper(id);
  if (!paper) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ paper });
}
