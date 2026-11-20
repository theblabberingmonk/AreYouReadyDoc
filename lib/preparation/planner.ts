import type { Profile, PlanTask } from "./contracts";
export type Module = { slug:string; title:string };
function addDays(date:string, n:number) { const d=new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
/** Deterministic capacity-aware first pass + spaced recall; no invented exam weights. */
export function buildPlan(profile:Profile, modules:Module[], start:string, days:number):PlanTask[] {
  const ordered = [...modules].sort((a,b)=>Number(profile.focus_topics.includes(b.slug))-Number(profile.focus_topics.includes(a.slug)));
  if (!ordered.length) return [];
  const tasks:PlanTask[]=[];
  const reviews:{ module:Module; due:string }[]=[];
  let next=0;
  for(let day=0;day<days;day++) {
    const date=addDays(start,day);
    if(profile.exam_date && date>=profile.exam_date) break;
    let available=profile.weekly_minutes[new Date(`${date}T12:00:00Z`).getUTCDay()];
    if(!available) continue;
    const due=reviews.filter(r=>r.due<=date);
    for(const review of due.slice(0,2)) {
      if(available<10) break;
      const minutes=Math.min(20,available);
      tasks.push({ title:`Active recall: ${review.module.title}`, topic_slug:review.module.slug,kind:"revision",scheduled_date:date,minutes });
      available-=minutes; reviews.splice(reviews.indexOf(review),1);
    }
    if(available) {
      const module=ordered[next++ % ordered.length];
      const kind=next>ordered.length ? "viva" : "study";
      tasks.push({ title:`${kind==="viva" ? "Viva practice" : "Study"}: ${module.title}`, topic_slug:module.slug,kind,scheduled_date:date,minutes:available });
      if(kind==="study") for(const gap of [1,7]) reviews.push({ module,due:addDays(date,gap) });
    }
  }
  return tasks;
}
