/** Publish repository text snapshots to Supabase during deployment. Never prints credentials/content. */
require('@next/env').loadEnvConfig(process.cwd());
const {createClient}=require('@supabase/supabase-js');
const fs=require('node:fs');const path=require('node:path');const {createHash}=require('node:crypto');
(async()=>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key){console.log('Content database sync skipped: server database credentials are not configured.');return;}
  const db=createClient(url,key,{auth:{persistSession:false}});
  const rows=[];
  function add(ref,kind,title,body_md,payload){const content_hash=createHash('sha256').update(JSON.stringify({title,body_md,payload})).digest('hex');rows.push({ref,kind,title,body_md,payload,content_hash});}
  for(const name of fs.readdirSync('data/papers').filter(n=>n.endsWith('.json'))){const p=JSON.parse(fs.readFileSync(path.join('data/papers',name),'utf8'));for(const q of p.questions)add(`question:${p.id}:${q.n}`,'question',q.title,q.body_md,{paper_id:p.id,question_n:q.n,prompt:q.prompt,topics:q.topics,marks:q.marks,session:p.session,track:p.track,source:p.source});}
  for(const name of fs.readdirSync('data/lessons').filter(n=>n.endsWith('.json'))){const l=JSON.parse(fs.readFileSync(path.join('data/lessons',name),'utf8'));const {body_md,...payload}=l;add(`lesson:${l.slug}`,'lesson',l.title,body_md,payload);}
  for(let i=0;i<rows.length;i+=20){const batch=rows.slice(i,i+20);const versions=await db.from('study_content_versions').upsert(batch,{onConflict:'ref,content_hash',ignoreDuplicates:true});if(versions.error)throw new Error('Version snapshot sync failed');const current=await db.from('study_content').upsert(batch.map(row=>({...row,updated_at:new Date().toISOString()})),{onConflict:'ref'});if(current.error)throw new Error('Published content sync failed');}
  console.log(`Content database synced: ${rows.filter(r=>r.kind==='question').length} questions and ${rows.filter(r=>r.kind==='lesson').length} lessons; version history retained.`);
})().catch(()=>{console.error('Content database sync failed. Check server database configuration and migrations.');process.exitCode=1;});
