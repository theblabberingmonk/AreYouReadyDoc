import "server-only";
import { getServiceClient } from "@/lib/supabase/server";

export async function buddyContext(userId:string):Promise<string> {
  const db=getServiceClient();
  const profile=await db.from("preparation_profiles").select("exam_date,time_zone,weekly_minutes,focus_topics,goal,memory_enabled").eq("user_id",userId).maybeSingle();
  if(profile.error) throw new Error("Preparation memory unavailable");
  if(!profile.data?.memory_enabled) return "";
  const [memories,plans,progress,attempts,metrics]=await Promise.all([
    db.from("preparation_memories").select("key,value,updated_at").eq("user_id",userId).order("updated_at",{ascending:false}).limit(20),
    db.from("preparation_plans").select("id,title").eq("user_id",userId).eq("status","active").maybeSingle(),
    db.from("question_progress").select("question_n",{count:"exact",head:true}).eq("user_id",userId).eq("revised",true),
    db.from("exam_attempts").select("paper_id,ended_at,ratings").eq("user_id",userId).order("created_at",{ascending:false}).limit(3),
    db.rpc("preparation_metrics",{p_user_id:userId}),
  ]);
  if([memories,plans,progress,attempts,metrics].some(r=>r.error)) throw new Error("Preparation memory unavailable");
  let plan=null;
  if(plans.data) {
    const tasks=await db.from("preparation_tasks").select("title,scheduled_date,status,minutes").eq("user_id",userId).eq("plan_id",plans.data.id).order("scheduled_date").limit(252);
    if(tasks.error) throw new Error("Preparation memory unavailable");
    const list=tasks.data??[];
    plan={ title:plans.data.title, total_tasks:list.length, completed_tasks:list.filter(t=>t.status==="done").length, next_tasks:list.filter(t=>t.status==="todo").slice(0,7) };
  }
  // Bound context and exclude private notes, patient details and unrelated history.
  return JSON.stringify({ profile:profile.data, explicit_candidate_memories:memories.data, plan, revised_question_count:progress.count??0, recent_mock_attempts:attempts.data, activity_metrics:metrics.data, instruction:"Use these as self-reported activity, not proof of competence. Help with study planning when asked; do not claim to change plans or schedule reminders from chat." }).slice(0,10000);
}
