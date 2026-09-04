-- One root follow-up per visit (MVP next-action from Record Visit).
-- Outcome-created children keep parent_followup_id set and remain allowed.
create unique index followups_one_root_per_visit_uidx
  on public.followups (created_from_visit_id)
  where created_from_visit_id is not null
    and parent_followup_id is null;
