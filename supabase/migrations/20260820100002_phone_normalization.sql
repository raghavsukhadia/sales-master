-- Phone normalization for matching (canonical: 91 + 10-digit mobile).
-- Raw phone_number / whatsapp_number remain the display source of truth.
-- Matching uses *_normalized columns. Invalid are not rewritten.

create or replace function public.normalize_indian_mobile(input text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  digits text;
  local_part text;
begin
  if input is null then
    return null;
  end if;

  digits := regexp_replace(trim(input), '[+\s().\-]', '', 'g');

  if digits = '' or digits !~ '^\d+$' then
    return null;
  end if;

  -- 0091XXXXXXXXXX
  if left(digits, 4) = '0091' and length(digits) = 14 then
    digits := substring(digits from 3);
  end if;

  -- 0XXXXXXXXXX trunk prefix
  if length(digits) = 11 and left(digits, 1) = '0' then
    digits := substring(digits from 2);
  end if;

  -- Bare 10-digit mobile (must start 6-9)
  if length(digits) = 10 then
    if digits !~ '^[6-9]\d{9}$' then
      return null;
    end if;
    return '91' || digits;
  end if;

  -- 91 + 10-digit mobile
  if length(digits) = 12 and left(digits, 2) = '91' then
    local_part := substring(digits from 3);
    if local_part !~ '^[6-9]\d{9}$' then
      return null;
    end if;
    return digits;
  end if;

  return null;
end;
$$;

comment on function public.normalize_indian_mobile(text) is
  'Canonical Indian mobile: 91XXXXXXXXXX. Returns null for invalid input — never invents a number.';

alter table public.salesmen
  add column if not exists phone_number_normalized text;

alter table public.dealers
  add column if not exists phone_number_normalized text,
  add column if not exists whatsapp_number_normalized text;

comment on column public.salesmen.phone_number_normalized is
  'Canonical form of phone_number for WhatsApp salesman lookup. Display uses phone_number.';

comment on column public.dealers.phone_number_normalized is
  'Canonical form of phone_number for dealer matching. Display uses phone_number.';

comment on column public.dealers.whatsapp_number_normalized is
  'Canonical form of whatsapp_number for dealer matching. Display uses whatsapp_number.';

-- Backfill from existing raw values (only fills normalized; raw unchanged).
update public.salesmen
set phone_number_normalized = public.normalize_indian_mobile(phone_number)
where phone_number_normalized is null;

update public.dealers
set
  phone_number_normalized = public.normalize_indian_mobile(phone_number),
  whatsapp_number_normalized = public.normalize_indian_mobile(whatsapp_number)
where phone_number_normalized is null
   or (whatsapp_number is not null and whatsapp_number_normalized is null);

create unique index if not exists salesmen_phone_number_normalized_uidx
  on public.salesmen (phone_number_normalized)
  where phone_number_normalized is not null;

create index if not exists dealers_phone_number_normalized_idx
  on public.dealers (phone_number_normalized)
  where phone_number_normalized is not null;

create index if not exists dealers_whatsapp_number_normalized_idx
  on public.dealers (whatsapp_number_normalized)
  where whatsapp_number_normalized is not null;

-- Keep EXECUTE off public API roles; app uses TS normalize or service-role SQL.
revoke all on function public.normalize_indian_mobile(text) from public;
revoke all on function public.normalize_indian_mobile(text) from anon, authenticated;
grant execute on function public.normalize_indian_mobile(text) to service_role;
