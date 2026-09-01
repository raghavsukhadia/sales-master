-- Claim WhatsApp messages for asynchronous processing (FOR UPDATE SKIP LOCKED).
-- Only service_role may execute. Raw payload is never deleted by status changes.

create or replace function public.claim_whatsapp_messages(batch_size integer default 10)
returns setof public.whatsapp_messages
language plpgsql
security definer
set search_path = public
as $$
begin
  if batch_size is null or batch_size < 1 then
    raise exception 'claim_whatsapp_messages: batch_size must be >= 1';
  end if;

  return query
  with picked as (
    select m.id
    from public.whatsapp_messages m
    where m.processing_status = 'received'
    order by m.message_timestamp asc
    limit batch_size
    for update skip locked
  )
  update public.whatsapp_messages w
  set
    processing_status = 'processing',
    processing_error = null
  from picked
  where w.id = picked.id
  returning w.*;
end;
$$;

comment on function public.claim_whatsapp_messages(integer) is
  'Atomically claim a batch of received WhatsApp messages for processing (received → processing). Concurrent-safe via SKIP LOCKED.';

revoke all on function public.claim_whatsapp_messages(integer) from public;
revoke all on function public.claim_whatsapp_messages(integer) from anon, authenticated;
grant execute on function public.claim_whatsapp_messages(integer) to service_role;
