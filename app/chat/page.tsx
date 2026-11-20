import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import StudyChat from "@/components/StudyChat";
export const metadata: Metadata = { title: "Study chat", robots: { index: false } };
export default async function ChatPage() {
  await auth.protect();
  return <main className="shell chat-page"><StudyChat /></main>;
}
