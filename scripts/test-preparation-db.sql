begin;
set local role service_role;
do $$
declare u text:='prep-test-'||gen_random_uuid()::text; other_user text:='prep-other-'||gen_random_uuid()::text; plan uuid:=gen_random_uuid(); task uuid; memory uuid; m jsonb; event uuid:=gen_random_uuid(); n integer;
begin
  if has_table_privilege('anon','public.preparation_profiles','SELECT') or has_table_privilege('authenticated','public.study_events','SELECT') or has_function_privilege('anon','public.preparation_metrics(text)','EXECUTE') then raise exception 'Public preparation access'; end if;
  insert into public.preparation_profiles(user_id,exam_date,time_zone) values(u,'2027-01-01','Asia/Kolkata');
  perform public.create_preparation_plan(u,plan,'Test plan','[{"title":"Revise","topic_slug":"test","kind":"study","scheduled_date":"2026-12-01","minutes":30}]');
  perform public.create_preparation_plan(u,plan,'Idempotent replay','[{"title":"Duplicate","topic_slug":"test","kind":"study","scheduled_date":"2026-12-01","minutes":30}]');
  select count(*) into n from public.preparation_tasks where user_id=u;
  if n<>1 then raise exception 'Plan retry duplicated tasks'; end if;
  select id into task from public.preparation_tasks where user_id=u;
  begin
    insert into public.preparation_reminders(user_id,task_id,title,due_at) values(other_user,task,'Foreign task',now());
    raise exception 'Cross-user reminder allowed';
  exception when foreign_key_violation then null; end;
  update public.preparation_tasks set status='done',completed_at=now() where id=task and user_id=u;
  memory:=public.save_preparation_memory(u,'Study style','Tables first');
  if public.save_preparation_memory(u,'Study style','Viva first')<>memory then raise exception 'Memory update duplicated'; end if;
  for n in 1..19 loop perform public.save_preparation_memory(u,'Fact '||n,'Preference'); end loop;
  begin
    perform public.save_preparation_memory(u,'Fact 21','Over limit');raise exception 'Memory cap bypassed';
  exception when raise_exception then if sqlerrm<>'Memory limit reached' then raise; end if; end;
  if public.append_study_events(u,jsonb_build_array(jsonb_build_object('event_id',event,'kind','active_app_time','resource_ref','/preparation','duration_seconds',30)))<>1 then raise exception 'Event missing'; end if;
  if public.append_study_events(u,jsonb_build_array(jsonb_build_object('event_id',event,'kind','active_app_time','resource_ref','/preparation','duration_seconds',30)))<>0 then raise exception 'Duplicate event counted'; end if;
  m:=public.preparation_metrics(u);
  if (m->>'completed_plan_tasks')::integer<>1 or (m->>'completed_task_minutes')::integer<>30 or (m->>'active_app_seconds_28d')::integer<>30 then raise exception 'Wrong aggregate metrics: %',m; end if;
  m:=public.preparation_metrics(other_user);
  if (m->>'completed_plan_tasks')::integer<>0 or (m->>'active_app_seconds_28d')::integer<>0 then raise exception 'Cross-user metrics leak'; end if;
  if not exists(select 1 from public.study_events where user_id=u and kind='task_done') then raise exception 'Committed completion not tracked'; end if;
  raise notice 'PASS: service-role permissions, plan idempotency, owner-aware foreign keys, memory limit, event deduplication, committed-state tracking and candidate-only aggregate metrics';
end;
$$;
rollback;
