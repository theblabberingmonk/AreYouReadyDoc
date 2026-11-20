import { auth } from "@clerk/nextjs/server";
import { InputError, json, readInput } from "@/lib/ai/http";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getLessonsIndex } from "@/lib/content";
import { PreparationInput, ProfileInput } from "@/lib/preparation/contracts";
import { buildPlan } from "@/lib/preparation/planner";
import { preparationState } from "@/lib/preparation/server";

export async function GET() {
  const {userId}=await auth();
  if(!userId) return json({error:"Sign in to view your preparation."},401);
  if(!isSupabaseConfigured()) return json({error:"Preparation workspace is unavailable."},503);
  try { return json(await preparationState(userId)); }
  catch { return json({error:"Unable to load preparation. Please try again."},503); }
}
export async function POST(request:Request) {
  const {userId}=await auth();
  if(!userId) return json({error:"Sign in to manage your preparation."},401);
  if(!isSupabaseConfigured()) return json({error:"Preparation workspace is unavailable."},503);
  try {
    const parsed=PreparationInput.safeParse(await readInput(request));
    if(!parsed.success) return json({error:"Check the fields and try again."},400);
    const input=parsed.data;
    const db=getServiceClient();
    let result:{error:unknown;data?:unknown};
    switch(input.action) {
      case "save_profile": {
        const valid=new Set(getLessonsIndex().map(m=>m.slug));
        if(input.profile.focus_topics.some(slug=>!valid.has(slug))) return json({error:"Choose a focus area from the study modules."},400);
        result=await db.from("preparation_profiles").upsert({user_id:userId,...input.profile,updated_at:new Date().toISOString()},{onConflict:"user_id"}); break;
      }
      case "create_plan": {
        const profile=await db.from("preparation_profiles").select("*").eq("user_id",userId).maybeSingle();
        if(profile.error) throw profile.error;
        if(!profile.data) return json({error:"Save your preparation profile first."},400);
        const p=ProfileInput.parse({exam_date:profile.data.exam_date,time_zone:profile.data.time_zone,weekly_minutes:profile.data.weekly_minutes,focus_topics:profile.data.focus_topics,goal:profile.data.goal,memory_enabled:profile.data.memory_enabled});
        const today=new Intl.DateTimeFormat("en-CA",{timeZone:p.time_zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
        if(input.startDate<today || input.startDate>new Date(Date.now()+366*86400000).toISOString().slice(0,10)) return json({error:"Choose a start date between today and the next year."},400);
        const tasks=buildPlan(p,getLessonsIndex(),input.startDate,input.days);
        if(!tasks.length) return json({error:"No study time fits these dates. Check your exam date and weekday availability."},400);
        result=await db.rpc("create_preparation_plan",{p_user_id:userId,p_id:input.requestId,p_title:`${input.days}-day preparation plan`,p_tasks:tasks});break;
      }
      case "update_task": {
        result=await db.from("preparation_tasks").update({status:input.status,completed_at:input.status==="done"?new Date().toISOString():null}).eq("user_id",userId).eq("id",input.id).select("id").maybeSingle();
        if(!result.error&&!result.data) return json({error:"Task not found."},404);break;
      }
      case "save_memory": result=await db.rpc("save_preparation_memory",{p_user_id:userId,p_key:input.key,p_value:input.value});break;
      case "delete_memory": {
        result=await db.from("preparation_memories").delete().eq("user_id",userId).eq("id",input.id).select("id").maybeSingle();
        if(!result.error&&!result.data) return json({error:"Memory not found."},404);break;
      }
      case "add_reminder": {
        const due=Date.parse(input.dueAt);
        if(due<=Date.now() || due>Date.now()+366*86400000) return json({error:"Choose a reminder time within the next year."},400);
        if(input.taskId) {
          const own=await db.from("preparation_tasks").select("id").eq("user_id",userId).eq("id",input.taskId).maybeSingle();
          if(own.error) throw own.error;
          if(!own.data) return json({error:"Task not found."},404);
        }
        const pending=await db.from("preparation_reminders").select("id",{head:true,count:"exact"}).eq("user_id",userId).eq("status","scheduled");
        if(pending.error) throw pending.error;
        if((pending.count??0)>=100) return json({error:"Dismiss an existing reminder before adding another."},409);
        result=await db.from("preparation_reminders").insert({user_id:userId,title:input.title,due_at:input.dueAt,task_id:input.taskId??null});break;
      }
      case "dismiss_reminder": {
        result=await db.from("preparation_reminders").update({status:"dismissed"}).eq("user_id",userId).eq("id",input.id).select("id").maybeSingle();
        if(!result.error&&!result.data) return json({error:"Reminder not found."},404);break;
      }
    }
    if(result.error) return json({error:input.action==="save_memory" ? "Unable to save memory. You can keep up to 20 facts; edit or remove one first." : "Unable to save preparation. Please try again."},503);
    return json(await preparationState(userId));
  } catch(e) { return json({error:e instanceof InputError?e.message:"Unable to save preparation. Please try again."},e instanceof InputError?400:503); }
}
