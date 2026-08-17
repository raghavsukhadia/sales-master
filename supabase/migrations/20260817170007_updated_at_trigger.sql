create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.salesmen
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.distributors
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.dealers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.dealer_contacts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.dealer_distributors
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.visits
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.opportunities
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.followups
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.whatsapp_sessions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.whatsapp_messages
  for each row execute function public.set_updated_at();
