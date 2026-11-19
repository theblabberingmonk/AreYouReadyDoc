import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to search." }, { status: 401 });
  const index = await readFile(path.join(process.cwd(), "data/search-index.json"), "utf8");
  return new NextResponse(index, { headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
}
