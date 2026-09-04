-- Call follow-up outcome tracking (distinct from followup_status workflow state).

create type public.followup_outcome as enum (
  'interested',
  'call_again',
  'send_quotation',
  'no_answer',
  'not_interested'
);

alter table public.followups
  add column outcome public.followup_outcome,
  add column parent_followup_id uuid references public.followups (id) on delete set null;

comment on column public.followups.outcome is
  'Call/dealer interaction outcome when status = completed. Distinct from followup_status.';

comment on column public.followups.parent_followup_id is
  'When set, this follow-up was created as the next action after completing the parent follow-up.';

create index followups_parent_followup_id_idx on public.followups (parent_followup_id);

-- Idempotency: at most one "next" follow-up per completed call.
create unique index followups_one_child_per_parent_uidx
  on public.followups (parent_followup_id)
  where parent_followup_id is not null;
