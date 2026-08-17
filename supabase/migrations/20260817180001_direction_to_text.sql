-- MessageAutoSender's confirmed webhook schema shows boundType as a string
-- enum, but only "in" has been observed in a real sample -- the full value
-- list (docs' collapsed Swagger "Enum" dropdown) hasn't been confirmed.
-- Same reasoning as item_type (see whatsapp_tables migration): a strict
-- Postgres enum would make the insert fail outright on any unanticipated
-- value, which would violate CLAUDE.md §49 ("must never lose raw webhook
-- data"). Store the raw string as-is; direction-dependent behavior
-- (salesman-processing vs. skip) is decided in application code against
-- the one confirmed value ("in"), not enforced by the column type.

alter table public.whatsapp_messages
  alter column direction type text using direction::text;

drop type public.message_direction;

comment on column public.whatsapp_messages.direction is
  'Raw boundType string from MessageAutoSender ("in" confirmed inbound; other values unconfirmed -- see CLAUDE.md §20/§49 reasoning above). Not constrained to an enum.';
