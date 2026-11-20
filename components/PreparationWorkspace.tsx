"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Profile } from "@/lib/preparation/contracts";
type Task={id:string;title:string;topic_slug:string;scheduled_date:string;minutes:number;status:"todo"|"done"|"skipped"};
type Memory={id:string;key:string;value:string};
type Reminder={id:string;title:string;due_at:string};
type Metrics={published_questions:number;revised_questions:number;mock_attempts:number;mock_self_ratings:Record<string,number>;active_app_seconds_28d:number;unique_questions_viewed_28d:number;revision_events_28d:number;ai_answers_28d:number;active_days_28d:number;planned_minutes:number;completed_task_minutes:number;daily_activity:{day:string;events:number;active_seconds:number}[]};
type State={metrics:Metrics;activity:{event_id:string;kind:string;resource_ref:string|null;occurred_at:string}[];profile:Profile|null;memories:Memory[];plan:{id:string;title:string}|null;tasks:Task[];reminders:Reminder[];serverTime:string};
const defaultProfile:Profile={exam_date:null,time_zone:"Asia/Kolkata",weekly_minutes:[60,60,60,60,60,60,60],focus_topics:[],goal:"",memory_enabled:false};
export default function PreparationWorkspace({modules}:{modules:{slug:string;title:string}[]}) {
  const [state,setState]=useState<State|null>(null);
  const [profile,setProfile]=useState<Profile>(defaultProfile);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [days,setDays]=useState(14);
  const [start,setStart]=useState("");
  const [key,setKey]=useState("");
  const [value,setValue]=useState("");
  const [reminder,setReminder]=useState("");
  const [due,setDue]=useState("");
  const lock=useRef(false);
  const planRequest=useRef<string|null>(null);
  const dateInZone=(zone:string)=>new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  useEffect(()=>{let active=true; (async()=>{try{
    const response=await fetch("/api/preparation",{cache:"no-store"});const data=await response.json();
    if(!response.ok)throw new Error(data.error);
    if(active){setState(data);const p=data.profile??{...defaultProfile,time_zone:Intl.DateTimeFormat().resolvedOptions().timeZone};setProfile(p);setStart(dateInZone(p.time_zone));}
  }catch(e){if(active)setError(e instanceof Error?e.message:"Unable to load preparation.");}finally{if(active)setLoading(false);}})();return()=>{active=false;};},[]);
  // Reminders are checked while this workspace is open; no background-delivery promise.
  useEffect(()=>{const timer=setInterval(()=>{if(!lock.current)fetch("/api/preparation",{cache:"no-store"}).then(async r=>r.ok?r.json():null).then(d=>{if(d)setState(d);}).catch(()=>{});},60000);return()=>clearInterval(timer);},[]);
  async function mutate(payload:unknown,message:string):Promise<boolean>{
    if(lock.current)return false;
    lock.current=true;setBusy(true);setError("");setNotice("");
    try{const response=await fetch("/api/preparation",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw new Error(data.error);setState(data);setNotice(message);return true;}
    catch(e){setError(e instanceof Error?e.message:"Unable to save. Please try again.");return false;}
    finally{lock.current=false;setBusy(false);}
  }
  async function createPlan(event:React.FormEvent){event.preventDefault();planRequest.current??=crypto.randomUUID();if(await mutate({action:"create_plan",requestId:planRequest.current,startDate:start,days},"Your plan is ready. Previous plans are archived."))planRequest.current=null;}
  const completed=state?.tasks.filter(t=>t.status==="done").length??0;
  return <>
    <div className="prep-heading"><p className="eyebrow">A little more prepared, every day</p><h1>Make room for<br/>your next milestone.</h1><p className="muted">Build a realistic plan, keep your commitments in view, and let your study buddy remember what helps you learn.</p></div>
    {loading&&<p role="status">Loading your preparation…</p>}{error&&<p className="chat-notice" role="alert">{error}</p>}{notice&&<p className="prep-success" role="status">{notice}</p>}
    {state?.metrics&&<section className="prep-metrics" aria-label="Your preparation metrics">
      {[{value:`${state.metrics.revised_questions} / ${state.metrics.published_questions}`,label:"Questions marked revised",note:"Revision record, not a mastery score"},{value:`${Math.round(state.metrics.active_app_seconds_28d/60)} min`,label:"Active app time · 28 days",note:"Foreground activity estimate"},{value:state.metrics.mock_attempts,label:"Mock attempts recorded",note:"Your practice history"},{value:`${state.metrics.completed_task_minutes} / ${state.metrics.planned_minutes} min`,label:"Completed / planned task time",note:"Planned duration, not timed study"},{value:state.metrics.unique_questions_viewed_28d,label:"Different questions viewed · 28 days",note:"Viewing does not mark revision"},{value:state.metrics.ai_answers_28d,label:"AI answers saved · 28 days",note:"Across chat and Explain deeper"}].map(m=><div key={m.label}><strong>{m.value}</strong><span>{m.label}</span><small>{m.note}</small></div>)}
    </section>}
    <div className="prep-grid">
      <section className="prep-card"><p className="eyebrow">01 · Your starting point</p><h2>A plan that fits your week.</h2><form onSubmit={async e=>{e.preventDefault();await mutate({action:"save_profile",profile},"Preparation profile saved.");}}><fieldset disabled={busy||loading}>
        <div className="prep-fields"><label>Target exam date<input type="date" value={profile.exam_date??""} onChange={e=>setProfile(p=>({...p,exam_date:e.target.value||null}))}/></label><label>Time zone<input required maxLength={80} value={profile.time_zone} placeholder="Asia/Kolkata" onChange={e=>setProfile(p=>({...p,time_zone:e.target.value}))}/></label></div>
        <label>Your preparation goal<textarea maxLength={1000} rows={2} value={profile.goal} placeholder="For example: finish the first revision before my leave starts." onChange={e=>setProfile(p=>({...p,goal:e.target.value}))}/></label>
        <p className="prep-label">Available study minutes each day</p><div className="prep-week">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((day,i)=><label key={day}>{day}<input type="number" min={0} max={720} required value={profile.weekly_minutes[i]} onChange={e=>setProfile(p=>({...p,weekly_minutes:p.weekly_minutes.map((m,j)=>j===i?Number(e.target.value):m)}))}/></label>)}</div>
        <details><summary>Prioritise focus areas</summary><div className="prep-focus">{modules.map(m=><label key={m.slug}><input type="checkbox" checked={profile.focus_topics.includes(m.slug)} onChange={e=>setProfile(p=>({...p,focus_topics:e.target.checked?[...p.focus_topics,m.slug]:p.focus_topics.filter(s=>s!==m.slug)}))}/>{m.title}</label>)}</div></details>
        <label className="prep-check"><input type="checkbox" checked={profile.memory_enabled} onChange={e=>setProfile(p=>({...p,memory_enabled:e.target.checked}))}/><span>Let my AI buddy use my saved preparation profile, facts and progress to personalise answers.</span></label><button className="btn btn-primary">Save preparation profile</button>
      </fieldset></form></section>
      <section className="prep-card"><p className="eyebrow">02 · A manageable next step</p><h2>Your rolling study plan.</h2><p className="muted">A first pass, active recall and viva practice, paced around the minutes you have. These are our revision modules; the original <Link href="/syllabus">NBEMS syllabus is here ↗</Link>.</p>
        <form onSubmit={createPlan}><fieldset disabled={busy||loading||!state?.profile}><div className="prep-fields"><label>Start date<input required type="date" value={start} onChange={e=>{setStart(e.target.value);planRequest.current=null;}}/></label><label>Days ahead<select value={days} onChange={e=>{setDays(Number(e.target.value));planRequest.current=null;}}>{[7,14,28,56,84].map(n=><option key={n} value={n}>{n} days</option>)}</select></label></div><button className="btn btn-primary">{state?.plan?"Replace active plan":"Build my plan"}</button></fieldset></form><p className="prep-caption">Save your profile first. A new plan archives the previous plan. Tasks stop before your target exam date.</p>
        {state?.plan&&<div className="prep-progress"><strong>{completed} / {state.tasks.length}</strong><span>tasks completed</span><progress value={completed} max={state.tasks.length||1} aria-label="Plan completion"/></div>}
      </section>
      <section className="prep-card"><p className="eyebrow">03 · Useful things to remember</p><h2>Your buddy’s notebook.</h2><p className="muted">Save study preferences in your own words. Personalisation is {state?.profile?.memory_enabled?"on":"off"}; you control what stays here.</p><form onSubmit={async e=>{e.preventDefault();if(await mutate({action:"save_memory",key,value},"Memory saved.")){setKey("");setValue("");}}}><fieldset disabled={busy||loading}><label>What should I remember?<input required maxLength={80} value={key} onChange={e=>setKey(e.target.value)} placeholder="How I like to revise"/></label><label>Your preference<textarea required maxLength={500} rows={2} value={value} onChange={e=>setValue(e.target.value)} placeholder="Use comparison tables, then ask me a short viva question."/></label><button className="btn btn-ghost">Save memory</button></fieldset></form>
        <ul className="prep-list">{state?.memories.map(m=><li key={m.id}><div><strong>{m.key}</strong><p>{m.value}</p></div><button disabled={busy} className="btn btn-ghost btn-sm" onClick={()=>mutate({action:"delete_memory",id:m.id},"Memory deleted.")}>Forget</button></li>)}</ul>
      </section>
      <section className="prep-card"><p className="eyebrow">04 · Keep it in view</p><h2>A nudge for later.</h2><p className="muted">In-app reminders appear here while this workspace is open. Email and phone notifications are not enabled yet.</p><form onSubmit={async e=>{e.preventDefault();if(await mutate({action:"add_reminder",title:reminder,dueAt:new Date(due).toISOString()},"In-app reminder saved.")){setReminder("");setDue("");}}}><fieldset disabled={busy||loading}><label>Reminder<input required maxLength={150} value={reminder} onChange={e=>setReminder(e.target.value)} placeholder="Revisit neonatal intestinal obstruction"/></label><label>When (this device’s local time)<input required type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label><button className="btn btn-ghost">Add reminder</button></fieldset></form>
        <ul className="prep-list">{state?.reminders.map(r=><li key={r.id}><div><strong>{r.title}</strong><p>{new Date(r.due_at)<=new Date(state.serverTime)?"Due now · ":""}{new Date(r.due_at).toLocaleString()}</p></div><button disabled={busy} className="btn btn-ghost btn-sm" onClick={()=>mutate({action:"dismiss_reminder",id:r.id},"Reminder dismissed.")}>Dismiss</button></li>)}</ul>
      </section>
    </div>
    {state?.metrics&&<section className="prep-card prep-activity"><p className="eyebrow">Your preparation record</p><h2>Small sessions add up.</h2><p className="muted">{state.metrics.active_days_28d} active days and {state.metrics.revision_events_28d} revision marks in the last 28 days. Tracking starts when this feature is used; earlier activity is not reconstructed.</p><div className="prep-daily">{state.metrics.daily_activity.map(d=><div key={d.day} title={`${d.day}: ${d.events} activities, ${Math.round(d.active_seconds/60)} active minutes`}><span style={{height:`${Math.min(90,12+Math.round(d.active_seconds/60))}px`}}/><small>{d.day.slice(5)}</small></div>)}</div><p className="prep-caption">Mock self-ratings: {Object.entries(state.metrics.mock_self_ratings).map(([k,v])=>`${k}: ${v}`).join(" · ")||"No ratings recorded yet"}. These are your own ratings, not examiner scores.</p><details><summary>Recent activity</summary><ul className="prep-list">{state.activity.map(a=><li key={a.event_id}><div><strong>{a.kind.replaceAll("_"," ")}</strong>{a.resource_ref&&<p>{a.resource_ref}</p>}</div><small>{new Date(a.occurred_at).toLocaleString()}</small></li>)}</ul></details></section>}
    {state?.plan&&<section className="prep-card prep-tasks"><div className="prep-task-heading"><div><p className="eyebrow">Your next study sessions</p><h2>{state.plan.title}</h2></div><Link className="btn btn-ghost" href="/chat">Ask your study buddy ↗</Link></div><ul className="prep-list">{state.tasks.map(t=><li key={t.id}><label className="prep-task-label"><input type="checkbox" disabled={busy} checked={t.status==="done"} onChange={e=>mutate({action:"update_task",id:t.id,status:e.target.checked?"done":"todo"},"Task updated.")}/><span><Link href={`/learn/${t.topic_slug}`}>{t.title}</Link><small>{t.scheduled_date} · {t.minutes} minutes{t.status==="skipped"?" · skipped":""}</small></span></label><button disabled={busy} className="btn btn-ghost btn-sm" onClick={()=>mutate({action:"update_task",id:t.id,status:t.status==="skipped"?"todo":"skipped"},"Task updated.")}>{t.status==="skipped"?"Restore":"Skip"}</button></li>)}</ul></section>}
  </>;
}
