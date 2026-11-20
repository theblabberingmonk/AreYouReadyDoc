import { z } from "zod";

export const ChatInput = z.object({
  requestId: z.uuid(),
  conversationId: z.uuid().optional(),
  message: z.string().trim().min(1).max(3000),
}).strict();
export const ExplainInput = z.object({ ref: z.string().regex(/^\d{2}:\d{1,2}$/), requestId: z.uuid() }).strict();
export type Source = { ref: string; title: string; href: string };
export type Turn = { id: string; prompt: string; reply: string; sources: Source[] };
export type Quota = { remaining: number; limit: number; resetsAt: string };
export type Conversation = { id: string; title: string; updated_at: string };
