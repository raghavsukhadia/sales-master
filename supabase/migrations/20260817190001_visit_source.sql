-- ADR-005 (Revised): visits can now originate from the salesman web
-- form as well as WhatsApp. A fixed, us-controlled two-value set (not an
-- external vendor enum), so a Postgres enum is appropriate here, unlike
-- item_type/direction.
create type public.visit_source as enum ('web', 'whatsapp');

alter table public.visits
  add column source public.visit_source not null default 'whatsapp';

comment on column public.visits.source is
  'Which channel the visit was logged through. Web-submitted visits skip AI extraction (CLAUDE.md §55 ADR-005 Revised) since form data is already structured.';

create index visits_source_idx on public.visits (source);
