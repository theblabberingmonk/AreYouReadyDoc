"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
type Event={event_id:string;kind:"page_view"|"question_view"|"active_app_time";resource_ref:string;duration_seconds:number};
export default function PreparationTracker(){
  const pathname=usePathname();const {isSignedIn}=useAuth();
  useEffect(()=>{
    if(!isSignedIn||!/^\/(library|papers|learn|topics|search|bookmarks|chat|preparation|syllabus)(\/|$)/.test(pathname))return;
    let queue:Event[]=[];let sending=false;let lastInteraction=Date.now();let lastTick=Date.now();let disposed=false;
    const add=(kind:Event["kind"],ref:string,seconds=0)=>{if(queue.length<100)queue.push({event_id:crypto.randomUUID(),kind,resource_ref:ref,duration_seconds:seconds});};
    async function flush(){if(sending||!queue.length)return;sending=true;const batch=queue.splice(0,20);try{const response=await fetch("/api/preparation/events",{method:"POST",keepalive:true,headers:{"Content-Type":"application/json"},body:JSON.stringify({events:batch})});if(!response.ok&&!disposed)queue=[...batch,...queue].slice(0,100);}catch{if(!disposed)queue=[...batch,...queue].slice(0,100);}finally{sending=false;}}
    const interact=()=>{lastInteraction=Date.now();};
    const tick=()=>{const now=Date.now();const seconds=Math.min(30,Math.floor((now-lastTick)/1000));lastTick=now;if(document.visibilityState==="visible"&&now-lastInteraction<120000&&seconds>0)add("active_app_time",pathname,seconds);void flush();};
    add("page_view",pathname);void flush();
    const seen=new Set<string>();
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;const li=entry.target.closest('li.question');const match=li?.id.match(/^q(\d+)$/);const paper=pathname.match(/^\/papers\/(\d{2})$/)?.[1];if(match&&paper&&!seen.has(match[1])){seen.add(match[1]);add("question_view",`${paper}:${match[1]}`);}}},{threshold:0.6});
    document.querySelectorAll('.question__title').forEach(el=>observer.observe(el));
    const timer=setInterval(tick,30000);
    const hidden=()=>{if(document.visibilityState==="hidden")void flush();lastTick=Date.now();};
    for(const name of ["pointerdown","keydown","scroll"])window.addEventListener(name,interact,{passive:true});
    document.addEventListener("visibilitychange",hidden);
    return()=>{disposed=true;clearInterval(timer);observer.disconnect();document.removeEventListener("visibilitychange",hidden);for(const name of ["pointerdown","keydown","scroll"])window.removeEventListener(name,interact);void flush();};
  },[pathname,isSignedIn]);
  return null;
}
