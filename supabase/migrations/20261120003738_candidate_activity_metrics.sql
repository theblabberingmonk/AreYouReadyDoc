create table public.study_content (
  ref text primary key,
  kind text not null check(kind in ('question','lesson')),
  title text not null,
  body_md text not null,
  payload jsonb not null default '{}'::jsonb,
  content_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.study_content enable row level security;
revoke all on public.study_content from public,anon,authenticated;
grant select,insert,update,delete on public.study_content to service_role;
create table public.study_events (
  id bigint generated always as identity primary key,
  event_id uuid not null default gen_random_uuid(),
  user_id text not null,
  kind text not null,
  resource_ref text,
  duration_seconds integer not null default 0 check(duration_seconds between 0 and 120),
  metadata jsonb not null default '{}'::jsonb check(octet_length(metadata::text)<=8000),
  source text not null check(source in ('browser','server')),
  occurred_at timestamptz not null default now(),
  unique(user_id,event_id)
);
create index study_events_owner_time on public.study_events(user_id,occurred_at desc);
alter table public.study_events enable row level security;
revoke all on public.study_events from public,anon,authenticated;
grant select,insert on public.study_events to service_role;
grant usage,select on sequence public.study_events_id_seq to service_role;

create function public.append_study_events(p_user_id text,p_events jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare item jsonb; v_count integer; v_added integer:=0; v_rows integer;
begin
  if p_user_id is null or char_length(p_user_id)<1 or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events) not between 1 and 20 then raise exception 'Invalid events'; end if;
  perform pg_advisory_xact_lock(hashtextextended('telemetry:'||p_user_id,0));
  select count(*) into v_count from public.study_events where user_id=p_user_id and source='browser' and occurred_at>now()-interval '5 minutes';
  if v_count+jsonb_array_length(p_events)>120 then raise exception 'Activity rate limit'; end if;
  for item in select value from jsonb_array_elements(p_events) loop
    if item->>'kind' is null or item->>'kind' not in ('page_view','question_view','active_app_time') or char_length(coalesce(item->>'resource_ref',''))>150 then raise exception 'Invalid event type'; end if;
    insert into public.study_events(event_id,user_id,kind,resource_ref,duration_seconds,source)
      values((item->>'event_id')::uuid,p_user_id,item->>'kind',item->>'resource_ref',case when item->>'kind'='active_app_time' then (item->>'duration_seconds')::integer else 0 end,'browser')
      on conflict(user_id,event_id) do nothing;
    get diagnostics v_rows=row_count; v_added:=v_added+v_rows;
  end loop;
  return v_added;
end;
$$;

-- Committed state changes are recorded server-side, including older app flows.
create function public.record_preparation_event()
returns trigger language plpgsql security invoker set search_path='' as $$
declare row_data jsonb; event_kind text; ref text; meta jsonb:='{}'::jsonb;
begin
  if tg_op='DELETE' then row_data:=to_jsonb(old); else row_data:=to_jsonb(new); end if;
  if tg_table_name='ai_requests' then
    if new.status<>'completed' or old.status='completed' then return new; end if;
    event_kind:='ai_answer';meta:=jsonb_build_object('feature',new.feature);
  elsif tg_table_name='question_progress' then
    if tg_op='UPDATE' and old.revised is not distinct from new.revised then return new; end if;
    event_kind:=case when tg_op='DELETE' then 'revision_cleared' else 'revision_marked' end;
    ref:=(row_data->>'paper_id')||':'||(row_data->>'question_n');
  elsif tg_table_name='exam_attempts' then
    event_kind:='mock_attempt';ref:=row_data->>'paper_id';
  elsif tg_table_name='preparation_tasks' then
    if old.status=new.status then return new; end if;
    event_kind:='task_'||new.status;ref:=new.topic_slug;meta:=jsonb_build_object('minutes',new.minutes,'scheduled_date',new.scheduled_date);
  elsif tg_table_name='preparation_plans' then event_kind:='plan_created';
  elsif tg_table_name='bookmarks' then event_kind:=case when tg_op='DELETE' then 'bookmark_removed' else 'bookmark_added' end;ref:=(row_data->>'paper_id')||':'||(row_data->>'question_n');
  elsif tg_table_name='notes' then event_kind:=case when tg_op='DELETE' then 'note_deleted' else 'note_saved' end;ref:=(row_data->>'paper_id')||':'||(row_data->>'question_n');
  elsif tg_table_name='preparation_profiles' then event_kind:='profile_saved';
  elsif tg_table_name='preparation_memories' then event_kind:=case when tg_op='DELETE' then 'memory_deleted' else 'memory_saved' end;
  elsif tg_table_name='preparation_reminders' then event_kind:=case when tg_op='INSERT' then 'reminder_created' else 'reminder_dismissed' end;
  else return new;
  end if;
  insert into public.study_events(user_id,kind,resource_ref,metadata,source) values(row_data->>'user_id',event_kind,ref,meta,'server');
  if tg_op='DELETE' then return old; else return new; end if;
end;
$$;
create trigger track_ai_answer after update of status on public.ai_requests for each row execute function public.record_preparation_event();
create trigger track_revision after insert or update or delete on public.question_progress for each row execute function public.record_preparation_event();
create trigger track_mock after insert on public.exam_attempts for each row execute function public.record_preparation_event();
create trigger track_task after update of status on public.preparation_tasks for each row execute function public.record_preparation_event();
create trigger track_plan after insert on public.preparation_plans for each row execute function public.record_preparation_event();
create trigger track_bookmark after insert or delete on public.bookmarks for each row execute function public.record_preparation_event();
create trigger track_note after insert or update or delete on public.notes for each row execute function public.record_preparation_event();
create trigger track_profile after insert or update on public.preparation_profiles for each row execute function public.record_preparation_event();
create trigger track_memory after insert or update or delete on public.preparation_memories for each row execute function public.record_preparation_event();
create trigger track_reminder after insert or update on public.preparation_reminders for each row execute function public.record_preparation_event();

create function public.preparation_metrics(p_user_id text)
returns jsonb language sql stable security invoker set search_path='' as $$
with zone as (select coalesce((select p.time_zone from public.preparation_profiles p where p.user_id=p_user_id and exists(select 1 from pg_timezone_names z where z.name=p.time_zone)),'UTC') tz),
recent as (select * from public.study_events where user_id=p_user_id and occurred_at>=now()-interval '28 days'),
daily as (select (occurred_at at time zone (select tz from zone))::date as day,count(*) as events,coalesce(sum(duration_seconds),0) as active_seconds from recent group by 1),
ratings as (select r.value as rating,count(*) as count from public.exam_attempts a cross join lateral jsonb_each_text(case when jsonb_typeof(a.ratings)='object' then a.ratings else '{}'::jsonb end) r where a.user_id=p_user_id group by r.value)
select jsonb_build_object(
  'window_days',28,'time_zone',(select tz from zone),
  'published_questions',(select count(*) from public.study_content where kind='question'),
  'revised_questions',(select count(*) from public.question_progress where user_id=p_user_id and revised),
  'bookmarks',(select count(*) from public.bookmarks where user_id=p_user_id),
  'notes',(select count(*) from public.notes where user_id=p_user_id),
  'mock_attempts',(select count(*) from public.exam_attempts where user_id=p_user_id),
  'completed_mock_attempts',(select count(*) from public.exam_attempts where user_id=p_user_id and ended_at is not null),
  'mock_self_ratings',coalesce((select jsonb_object_agg(rating,count) from ratings),'{}'::jsonb),
  'active_app_seconds_28d',(select coalesce(sum(duration_seconds),0) from recent),
  'unique_questions_viewed_28d',(select count(distinct resource_ref) from recent where kind='question_view'),
  'revision_events_28d',(select count(*) from recent where kind='revision_marked'),
  'ai_answers_28d',(select count(*) from public.ai_requests where user_id=p_user_id and status='completed' and created_at>=now()-interval '28 days'),
  'active_days_28d',(select count(*) from daily),
  'plan_tasks',(select count(*) from public.preparation_tasks t join public.preparation_plans p on p.id=t.plan_id and p.user_id=t.user_id where t.user_id=p_user_id and p.status='active'),
  'completed_plan_tasks',(select count(*) from public.preparation_tasks t join public.preparation_plans p on p.id=t.plan_id and p.user_id=t.user_id where t.user_id=p_user_id and p.status='active' and t.status='done'),
  'planned_minutes',(select coalesce(sum(t.minutes),0) from public.preparation_tasks t join public.preparation_plans p on p.id=t.plan_id and p.user_id=t.user_id where t.user_id=p_user_id and p.status='active'),
  'completed_task_minutes',(select coalesce(sum(t.minutes),0) from public.preparation_tasks t join public.preparation_plans p on p.id=t.plan_id and p.user_id=t.user_id where t.user_id=p_user_id and p.status='active' and t.status='done'),
  'daily_activity',coalesce((select jsonb_agg(to_jsonb(daily) order by day) from daily),'[]'::jsonb),
  'tracking_started_at',(select min(occurred_at) from public.study_events where user_id=p_user_id)
);
$$;
revoke execute on function public.append_study_events(text,jsonb),public.record_preparation_event(),public.preparation_metrics(text) from public,anon,authenticated;
grant execute on function public.append_study_events(text,jsonb),public.record_preparation_event(),public.preparation_metrics(text) to service_role;

create table public.study_content_versions (
  ref text not null,
  content_hash text not null,
  kind text not null,
  title text not null,
  body_md text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key(ref,content_hash)
);
alter table public.study_content_versions enable row level security;
revoke all on public.study_content_versions from public,anon,authenticated;
grant select,insert on public.study_content_versions to service_role;
revoke update,delete on public.study_events from service_role;
