-- Clerk identity is verified by Next.js; these tables/RPCs are service-role only.
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null check (char_length(title) <= 100),
  updated_at timestamptz not null default now()
);
create index ai_conversations_owner on public.ai_conversations(user_id, updated_at desc);
create table public.ai_requests (
  id uuid primary key,
  user_id text not null,
  conversation_id uuid references public.ai_conversations(id) on delete cascade,
  feature text not null check (feature in ('chat','explain')),
  prompt text not null check (char_length(prompt) between 1 and 3000),
  reply text check (char_length(reply) <= 20000),
  sources jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);
create index ai_requests_owner_week on public.ai_requests(user_id, created_at desc);
create index ai_requests_history on public.ai_requests(conversation_id, created_at desc);
create index ai_requests_global_week on public.ai_requests(created_at desc);
alter table public.ai_conversations enable row level security;
alter table public.ai_requests enable row level security;
revoke all on public.ai_conversations, public.ai_requests from public, anon, authenticated;
grant select, insert, update, delete on public.ai_conversations, public.ai_requests to service_role;

create function public.reserve_ai_request(p_user_id text, p_request_id uuid, p_conversation_id uuid, p_feature text, p_prompt text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_existing public.ai_requests;
  v_conversation uuid := p_conversation_id;
  v_week timestamptz := date_trunc('week', now() at time zone 'UTC') at time zone 'UTC';
  v_count integer;
begin
  if p_user_id is null or char_length(p_user_id) < 1 or p_request_id is null or p_feature not in ('chat','explain') or p_feature is null or p_prompt is null or char_length(trim(p_prompt)) not between 1 and 3000 then
    raise exception 'Invalid AI request';
  end if;
  -- A shared DB lock serializes reservations across serverless instances.
  -- Short transactions only: no provider/network work inside this lock.
  perform pg_advisory_xact_lock(721904620031::bigint);
  select * into v_existing from public.ai_requests where id = p_request_id;
  if found then
    if v_existing.user_id <> p_user_id then return jsonb_build_object('code','missing'); end if;
    if v_existing.prompt <> p_prompt or v_existing.feature <> p_feature or (p_conversation_id is not null and v_existing.conversation_id is distinct from p_conversation_id) then return jsonb_build_object('code','conflict'); end if;
    if v_existing.status = 'completed' then return jsonb_build_object('code','completed','reply',v_existing.reply,'conversation_id',v_existing.conversation_id); end if;
    return jsonb_build_object('code', case when v_existing.status = 'pending' and v_existing.created_at > now() - interval '2 minutes' then 'busy' else 'conflict' end);
  end if;
  if v_conversation is not null and (p_feature <> 'chat' or not exists(select 1 from public.ai_conversations where id=v_conversation and user_id=p_user_id)) then return jsonb_build_object('code','missing'); end if;
  -- Expired reservations cannot subsequently complete; provider timeout is 45s.
  update public.ai_requests set status='failed' where user_id=p_user_id and status='pending' and created_at < now()-interval '2 minutes';
  if exists(select 1 from public.ai_requests where user_id=p_user_id and status='pending') then return jsonb_build_object('code','busy'); end if;
  select count(*) into v_count from public.ai_requests where user_id=p_user_id and created_at >= v_week and status in ('pending','completed');
  if v_count >= 10 then return jsonb_build_object('code','quota'); end if;
  select count(*) into v_count from public.ai_requests where user_id=p_user_id and created_at > now()-interval '1 minute';
  if v_count >= 5 then return jsonb_build_object('code','rate'); end if;
  -- Shared safety cap: 1,000 successful/in-flight generations per UTC week.
  select count(*) into v_count from public.ai_requests where created_at >= v_week and (status='completed' or (status='pending' and created_at > now()-interval '2 minutes'));
  if v_count >= 1000 then return jsonb_build_object('code','unavailable'); end if;
  if p_feature='chat' and v_conversation is null then
    insert into public.ai_conversations(user_id,title) values(p_user_id,left(p_prompt,100)) returning id into v_conversation;
  end if;
  insert into public.ai_requests(id,user_id,conversation_id,feature,prompt) values(p_request_id,p_user_id,v_conversation,p_feature,p_prompt);
  return jsonb_build_object('code','reserved','conversation_id',v_conversation);
end;
$$;

create function public.finish_ai_request(p_user_id text, p_request_id uuid, p_reply text, p_sources jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_conversation uuid;
begin
  if p_reply is null or char_length(trim(p_reply)) not between 1 and 20000 or jsonb_typeof(p_sources) <> 'array' then raise exception 'Invalid AI response'; end if;
  update public.ai_requests set reply=p_reply, sources=p_sources, status='completed'
    where id=p_request_id and user_id=p_user_id and status='pending' and created_at > now()-interval '2 minutes'
    returning conversation_id into v_conversation;
  if not found then return false; end if;
  update public.ai_conversations set updated_at=now() where id=v_conversation and user_id=p_user_id;
  return true;
end;
$$;
revoke execute on function public.reserve_ai_request(text,uuid,uuid,text,text), public.finish_ai_request(text,uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.reserve_ai_request(text,uuid,uuid,text,text), public.finish_ai_request(text,uuid,text,jsonb) to service_role;
-- Existing platform trigger should not be exposed through the public RPC API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

create function public.delete_ai_conversation(p_user_id text, p_conversation_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(721904620031::bigint);
  if not exists(select 1 from public.ai_conversations where id=p_conversation_id and user_id=p_user_id) then return false; end if;
  update public.ai_requests set status='failed' where conversation_id=p_conversation_id and user_id=p_user_id and status='pending' and created_at < now()-interval '2 minutes';
  if exists(select 1 from public.ai_requests where conversation_id=p_conversation_id and user_id=p_user_id and status='pending') then return false; end if;
  -- Redact content while preserving timestamps/status for the weekly quota.
  update public.ai_requests set prompt='[deleted]', reply=null, sources='[]'::jsonb, conversation_id=null where conversation_id=p_conversation_id and user_id=p_user_id;
  delete from public.ai_conversations where id=p_conversation_id and user_id=p_user_id;
  return true;
end;
$$;
revoke execute on function public.delete_ai_conversation(text,uuid) from public, anon, authenticated;
grant execute on function public.delete_ai_conversation(text,uuid) to service_role;
