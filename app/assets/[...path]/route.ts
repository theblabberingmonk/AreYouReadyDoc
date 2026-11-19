import { auth } from "@clerk/nextjs/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
const types: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to view illustrations." }, { status: 401 });
  const { path: parts } = await params;
  if (!parts.length || parts.some(part => !/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part))) return new NextResponse(null, { status: 404 });
  const type = types[path.extname(parts.at(-1)!).toLowerCase()];
  if (!type) return new NextResponse(null, { status: 404 });
  try {
    const image = await readFile(path.join(process.cwd(), "study-assets", ...parts));
    return new NextResponse(new Uint8Array(image), { headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
