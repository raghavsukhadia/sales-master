-- Fixed, low-churn value sets. Business-configurable vocabularies (dealer
-- status, opportunity stage) are lookup tables instead -- see
-- 20260817170002_lookup_tables.sql.

create type public.user_role as enum ('admin', 'manager', 'salesman');

create type public.interest_level as enum ('low', 'medium', 'high');

create type public.priority_level as enum ('low', 'medium', 'high');

-- Stored state machine only. "Due Today" / "Overdue" (CLAUDE.md §12) are
-- derived at query time from due_date, not persisted states.
create type public.followup_status as enum ('pending', 'completed', 'cancelled');

create type public.location_source as enum ('whatsapp_location', 'browser_location', 'manual', 'geocoded');

create type public.message_direction as enum ('inbound', 'outbound');

create type public.message_processing_status as enum ('received', 'processing', 'processed', 'failed', 'ignored');

create type public.whatsapp_session_status as enum ('open', 'closed');

create type public.extraction_status as enum ('pending', 'applied', 'rejected', 'needs_review');

create type public.actor_type as enum ('user', 'system', 'ai');
