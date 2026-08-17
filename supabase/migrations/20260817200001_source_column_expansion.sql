-- ADR-005 (Revised, voice-note update): the web form and WhatsApp now
-- both write to dealers/followups/whatsapp_messages (not just visits),
-- so all three need the same 'whatsapp' | 'web' distinction visits
-- already has. Reusing the existing visit_source enum rather than
-- inventing a per-table type.

alter table public.dealers
  add column source public.visit_source not null default 'whatsapp';
create index dealers_source_idx on public.dealers (source);

alter table public.followups
  add column source public.visit_source not null default 'whatsapp';
create index followups_source_idx on public.followups (source);

alter table public.whatsapp_messages
  add column source public.visit_source not null default 'whatsapp';

comment on column public.whatsapp_messages.source is
  'Real WhatsApp webhook events stay ''whatsapp'' (the default). ''web'' marks synthetic ingestion records created by the salesman web form (e.g. voice notes) so Phase 2 processing can scan one queue regardless of origin -- see CLAUDE.md §55 ADR-005 (Revised).';

-- attachments already has a free-text `source` column (Phase 0); no
-- migration needed there, just using 'web'/'whatsapp' as its values now.
