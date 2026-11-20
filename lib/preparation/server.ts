import "server-only";
import { getServiceClient } from "@/lib/supabase/server";
export async function preparationState(userId:string) {
  const db=getServiceClient();
  const [profile,memories,plan,reminders]=await Promise.all([
    db.from("preparation_profiles").select("exam_date,time_zone,weekly_minutes,focus_topics,goal,memory_enabled").eq("user_id",userId).maybeSingle(),
    db.from("preparation_memories").select("id,key,value,updated_at").eq("user_id",userId).order("updated_at",{ascending:false}).limit(20),
    db.from("preparation_plans").select("id,title,created_at").eq("user_id",userId).eq("status","active").maybeSingle(),
    db.from("preparation_reminders").select("id,title,due_at,task_id,status").eq("user_id",userId).eq("status","scheduled").order("due_at").limit(100),
  ]);
  if([profile,memories,plan,reminders].some(r=>r.error)) throw new Error("Preparation unavailable");
  const tasks=plan.data ? await db.from("preparation_tasks").select("id,title,topic_slug,kind,scheduled_date,minutes,status,completed_at").eq("user_id",userId).eq("plan_id",plan.data.id).order("scheduled_date").limit(252) : { data:[],error:null };
  if(tasks.error) throw new Error("Preparation unavailable");
  const [metrics,activity]=await Promise.all([
    db.rpc("preparation_metrics",{p_user_id:userId}),
    db.from("study_events").select("event_id,kind,resource_ref,duration_seconds,occurred_at,source").eq("user_id",userId).order("occurred_at",{ascending:false}).limit(30),
  ]);
  if(metrics.error||activity.error)throw new Error("Preparation metrics unavailable");
  return { metrics:metrics.data,activity:activity.data??[],profile:profile.data,memories:memories.data??[],plan:plan.data,tasks:tasks.data??[],reminders:reminders.data??[],serverTime:new Date().toISOString() };
}
