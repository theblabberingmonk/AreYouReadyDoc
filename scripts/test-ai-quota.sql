begin;
do $$
declare
  u text := 'quota-test-' || gen_random_uuid()::text;
  stranger text := 'quota-test-other-' || gen_random_uuid()::text;
  req uuid := gen_random_uuid();
  conv uuid;
  result jsonb;
  n integer;
begin
  if has_table_privilege('anon','public.ai_requests','SELECT') or has_table_privilege('authenticated','public.ai_requests','INSERT') then raise exception 'Public ledger access'; end if;
  if has_function_privilege('anon','public.reserve_ai_request(text,uuid,uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','public.finish_ai_request(text,uuid,text,jsonb)','EXECUTE') then raise exception 'Public quota RPC access'; end if;
  result := public.reserve_ai_request(u,req,null,'chat','Explain malrotation');
  if result->>'code' <> 'reserved' then raise exception 'First reservation failed: %',result; end if;
  conv := (result->>'conversation_id')::uuid;
  result := public.reserve_ai_request(u,gen_random_uuid(),conv,'chat','A parallel request');
  if result->>'code' <> 'busy' then raise exception 'Parallel request was allowed'; end if;
  result := public.reserve_ai_request(stranger,gen_random_uuid(),conv,'chat','Read another user');
  if result->>'code' <> 'missing' then raise exception 'Ownership bypass'; end if;
  if public.delete_ai_conversation(stranger,conv) then raise exception 'Foreign delete'; end if;
  if public.delete_ai_conversation(u,conv) then raise exception 'Deleted an in-flight request'; end if;
  if public.finish_ai_request(stranger,req,'Stolen answer','[]') then raise exception 'Foreign completion'; end if;
  if not public.finish_ai_request(u,req,'A saved answer','[]') then raise exception 'Completion failed'; end if;
  result := public.reserve_ai_request(u,req,null,'chat','Explain malrotation');
  if result->>'code' <> 'completed' or result->>'reply' <> 'A saved answer' then raise exception 'Idempotent replay failed'; end if;
  if public.finish_ai_request(u,req,'Second answer','[]') then raise exception 'Double completion'; end if;
  -- Seed nine other completed questions in both features to exercise the shared quota.
  for n in 1..9 loop
    insert into public.ai_requests(id,user_id,conversation_id,feature,prompt,reply,status)
    values(gen_random_uuid(),u,conv,case when n%2=0 then 'chat' else 'explain' end,'Test','Answer','completed');
  end loop;
  result := public.reserve_ai_request(u,gen_random_uuid(),null,'explain','Eleventh question');
  if result->>'code' <> 'quota' then raise exception 'Eleventh question allowed: %',result; end if;
  if not public.delete_ai_conversation(u,conv) then raise exception 'Deletion failed'; end if;
  select count(*) into n from public.ai_requests where user_id=u and status='completed';
  if n<>10 then raise exception 'Deletion refunded quota'; end if;
  if exists(select 1 from public.ai_requests where user_id=u and (reply is not null or prompt<>'[deleted]' or conversation_id is not null)) then raise exception 'Deletion left content'; end if;
  result := public.reserve_ai_request(u,gen_random_uuid(),null,'chat','New conversation bypass');
  if result->>'code'<>'quota' then raise exception 'New conversation bypassed quota'; end if;
  -- Failed and expired calls refund usage, and late results cannot commit.
  req := gen_random_uuid();
  result := public.reserve_ai_request(stranger,req,null,'explain','Failure test');
  if result->>'code'<>'reserved' then raise exception 'Independent user blocked'; end if;
  update public.ai_requests set created_at=now()-interval '3 minutes' where id=req;
  if public.finish_ai_request(stranger,req,'Late reply','[]') then raise exception 'Expired request completed'; end if;
  result := public.reserve_ai_request(stranger,gen_random_uuid(),null,'explain','After expiry');
  if result->>'code'<>'reserved' then raise exception 'Expired request not refunded'; end if;
  raise notice 'PASS: ownership, RPC privileges, single-flight, idempotency, shared ten-question quota, deletion and expiry';
end;
$$;
rollback;
