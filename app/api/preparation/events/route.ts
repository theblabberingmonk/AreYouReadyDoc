import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { InputError,json,readInput } from "@/lib/ai/http";
import { getServiceClient,isSupabaseConfigured } from "@/lib/supabase/server";
const schema=z.object({events:z.array(z.object({event_id:z.uuid(),kind:z.enum(["page_view","question_view","active_app_time"]),resource_ref:z.string().regex(/^(\/[-a-zA-Z0-9/]*|\d{2}:\d{1,2})$/).max(150),duration_seconds:z.number().int().min(0).max(60).default(0)}).strict()).min(1).max(20)}).strict();
export async function POST(request:Request){
  const {userId}=await auth();if(!userId)return json({error:"Sign in to record preparation activity."},401);
  if(!isSupabaseConfigured())return json({error:"Activity sync unavailable."},503);
  try{const parsed=schema.safeParse(await readInput(request));if(!parsed.success)return json({error:"Invalid activity batch."},400);
    const {data,error}=await getServiceClient().rpc("append_study_events",{p_user_id:userId,p_events:parsed.data.events});
    if(error)return json({error:"Activity sync unavailable. Please retry later."},429);
    return json({accepted:data});
  }catch(e){return json({error:e instanceof InputError?e.message:"Activity sync unavailable."},e instanceof InputError?400:503);}
}
