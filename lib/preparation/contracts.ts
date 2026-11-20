import { z } from "zod";
const DateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => { const d = new Date(`${v}T12:00:00Z`); return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0,10) === v; }, "Use a valid calendar date.");
const TimeZone = z.string().max(80).refine(v => { try { new Intl.DateTimeFormat("en", { timeZone:v }); return true; } catch { return false; } }, "Use an IANA time zone.");
export const ProfileInput = z.object({
  exam_date: DateOnly.nullable(),
  time_zone: TimeZone,
  weekly_minutes: z.array(z.number().int().min(0).max(720)).length(7),
  focus_topics: z.array(z.string().regex(/^[a-z0-9-]+$/).max(100)).max(14),
  goal: z.string().trim().max(1000),
  memory_enabled: z.boolean(),
}).strict();
export type Profile = z.infer<typeof ProfileInput>;
export const PreparationInput = z.discriminatedUnion("action", [
  z.object({ action:z.literal("save_profile"), profile:ProfileInput }).strict(),
  z.object({ action:z.literal("create_plan"), requestId:z.uuid(), startDate:DateOnly, days:z.number().int().min(7).max(84) }).strict(),
  z.object({ action:z.literal("update_task"), id:z.uuid(), status:z.enum(["todo","done","skipped"]) }).strict(),
  z.object({ action:z.literal("save_memory"), key:z.string().trim().min(1).max(80), value:z.string().trim().min(1).max(500) }).strict(),
  z.object({ action:z.literal("delete_memory"), id:z.uuid() }).strict(),
  z.object({ action:z.literal("add_reminder"), title:z.string().trim().min(1).max(150), dueAt:z.iso.datetime({ offset:true }), taskId:z.uuid().optional() }).strict(),
  z.object({ action:z.literal("dismiss_reminder"), id:z.uuid() }).strict(),
]);
export type PlanTask = { title:string; topic_slug:string; kind:"study"|"revision"|"viva"; scheduled_date:string; minutes:number };
