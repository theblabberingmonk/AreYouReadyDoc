create table public.preparation_profiles (
  user_id text primary key,
  exam_date date,
  time_zone text not null default 'Asia/Kolkata' check(char_length(time_zone) between 1 and 80),
  weekly_minutes integer[] not null default '{60,60,60,60,60,60,60}' check(cardinality(weekly_minutes)=7 and 0<=all(weekly_minutes) and 720>=all(weekly_minutes) and array_position(weekly_minutes,null) is null),
  focus_topics text[] not null default '{}' check(cardinality(focus_topics)<=14),
  goal text not null default '' check(char_length(goal)<=1000),
  memory_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.preparation_memories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  key text not null check(char_length(key) between 1 and 80),
  value text not null check(char_length(value) between 1 and 500),
  source text not null default 'candidate' check(source='candidate'),
  updated_at timestamptz not null default now(),
  unique(user_id,key)
);
create table public.preparation_plans (
  id uuid primary key,
  user_id text not null,
  title text not null check(char_length(title) between 1 and 150),
  status text not null default 'active' check(status in ('active','archived')),
  created_at timestamptz not null default now(),
  unique(id,user_id)
);
create unique index preparation_one_active_plan on public.preparation_plans(user_id) where status='active';
create table public.preparation_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  plan_id uuid not null,
  title text not null check(char_length(title) between 1 and 200),
  topic_slug text not null check(char_length(topic_slug) between 1 and 100),
  kind text not null check(kind in ('study','revision','viva')),
  scheduled_date date not null,
  minutes integer not null check(minutes between 1 and 720),
  status text not null default 'todo' check(status in ('todo','done','skipped')),
  completed_at timestamptz,
  unique(id,user_id),
  foreign key(plan_id,user_id) references public.preparation_plans(id,user_id) on delete cascade,
  check((status='done')=(completed_at is not null))
);
create index preparation_tasks_plan_owner on public.preparation_tasks(user_id,plan_id,scheduled_date);
create table public.preparation_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  task_id uuid,
  title text not null check(char_length(title) between 1 and 150),
  due_at timestamptz not null,
  channel text not null default 'in_app' check(channel='in_app'),
  status text not null default 'scheduled' check(status in ('scheduled','dismissed')),
  created_at timestamptz not null default now(),
  foreign key(task_id,user_id) references public.preparation_tasks(id,user_id)
);
create index preparation_reminders_owner_due on public.preparation_reminders(user_id,due_at) where status='scheduled';

alter table public.preparation_profiles enable row level security;
alter table public.preparation_memories enable row level security;
alter table public.preparation_plans enable row level security;
alter table public.preparation_tasks enable row level security;
alter table public.preparation_reminders enable row level security;
revoke all on public.preparation_profiles, public.preparation_memories, public.preparation_plans, public.preparation_tasks, public.preparation_reminders from public,anon,authenticated;
grant select,insert,update,delete on public.preparation_profiles, public.preparation_memories, public.preparation_plans, public.preparation_tasks, public.preparation_reminders to service_role;

create function public.create_preparation_plan(p_user_id text,p_id uuid,p_title text,p_tasks jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare t jsonb;
begin
  if p_user_id is null or char_length(p_user_id)<1 or p_id is null or jsonb_typeof(p_tasks) is distinct from 'array' or jsonb_array_length(p_tasks) not between 1 and 252 then raise exception 'Invalid plan'; end if;
  perform pg_advisory_xact_lock(hashtextextended('preparation:'||p_user_id,0));
  if exists(select 1 from public.preparation_plans where id=p_id and user_id=p_user_id) then return p_id; end if;
  update public.preparation_plans set status='archived' where user_id=p_user_id and status='active';
  insert into public.preparation_plans(id,user_id,title) values(p_id,p_user_id,p_title);
  for t in select value from jsonb_array_elements(p_tasks) loop
    insert into public.preparation_tasks(user_id,plan_id,title,topic_slug,kind,scheduled_date,minutes)
    values(p_user_id,p_id,t->>'title',t->>'topic_slug',t->>'kind',(t->>'scheduled_date')::date,(t->>'minutes')::integer);
  end loop;
  return p_id;
end;
$$;
create function public.save_preparation_memory(p_user_id text,p_key text,p_value text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended('preparation:'||p_user_id,0));
  select id into v_id from public.preparation_memories where user_id=p_user_id and key=p_key;
  if v_id is null and (select count(*) from public.preparation_memories where user_id=p_user_id)>=20 then raise exception 'Memory limit reached'; end if;
  insert into public.preparation_memories(user_id,key,value) values(p_user_id,p_key,p_value)
    on conflict(user_id,key) do update set value=excluded.value,updated_at=now() returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.create_preparation_plan(text,uuid,text,jsonb),public.save_preparation_memory(text,text,text) from public,anon,authenticated;
grant execute on function public.create_preparation_plan(text,uuid,text,jsonb),public.save_preparation_memory(text,text,text) to service_role;
