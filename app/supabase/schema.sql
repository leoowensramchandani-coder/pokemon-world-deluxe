create table if not exists public.card_collections (
  trainer_id text not null check (trainer_id in ('papa', 'leo', 'remy')),
  card_id text not null,
  card jsonb not null,
  quantity integer not null default 1 check (quantity > 0),
  added_at timestamptz not null default now(),
  primary key (trainer_id, card_id)
);

alter table public.card_collections enable row level security;

create or replace function public.add_collection_card(p_trainer_id text, p_card_id text, p_card jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.card_collections (trainer_id, card_id, card, quantity)
  values (p_trainer_id, p_card_id, p_card, 1)
  on conflict (trainer_id, card_id) do update set quantity = card_collections.quantity + 1, card = excluded.card;
end;
$$;

create or replace function public.remove_collection_card(p_trainer_id text, p_card_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.card_collections set quantity = quantity - 1 where trainer_id = p_trainer_id and card_id = p_card_id and quantity > 1;
  if not found then delete from public.card_collections where trainer_id = p_trainer_id and card_id = p_card_id; end if;
end;
$$;

revoke all on public.card_collections from anon, authenticated;
revoke all on function public.add_collection_card(text, text, jsonb) from public;
revoke all on function public.remove_collection_card(text, text) from public;
grant execute on function public.add_collection_card(text, text, jsonb) to service_role;
grant execute on function public.remove_collection_card(text, text) to service_role;
