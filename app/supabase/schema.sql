create table if not exists public.card_collections (
  trainer_id text not null,
  card_id text not null,
  card jsonb not null,
  quantity integer not null default 1 check (quantity > 0),
  added_at timestamptz not null default now(),
  primary key (trainer_id, card_id)
);

alter table public.card_collections drop constraint if exists card_collections_trainer_id_check;

create table if not exists public.collection_definitions (
  id text primary key,
  name text not null,
  title text not null default 'Pokémon Collector',
  badge text not null default '📘',
  photo text,
  theme text,
  button text,
  accent text,
  partner_pokemon text,
  ability text,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_collections (
  admin_email text not null,
  collection_id text not null references public.collection_definitions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (admin_email, collection_id)
);

create table if not exists public.admins (
  email text primary key,
  is_superuser boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_wishlist (
  admin_email text not null,
  card_id text not null,
  card jsonb not null,
  added_at timestamptz not null default now(),
  primary key (admin_email, card_id)
);

insert into public.collection_definitions (id, name, title, badge, photo, theme, button, accent, partner_pokemon, ability) values
  ('papa', 'Papa', 'Master Collector', '🏆', '/trainers/papa.jpg', 'from-slate-950 via-blue-950 to-slate-900 border-amber-300 text-white', 'bg-amber-300 text-slate-950', 'text-amber-300', 'Charizard', 'Legendary Finds'),
  ('leo', 'Leo', 'Adventure Trainer', '⚡', '/trainers/leo.jpg', 'from-yellow-300 via-amber-200 to-blue-500 border-blue-700 text-slate-950', 'bg-blue-700 text-white', 'text-blue-800', 'Pikachu', 'Card Hunter'),
  ('remy', 'Remy', 'Lucky Trainer', '🌱', '/trainers/remy.jpg', 'from-emerald-400 via-lime-200 to-red-400 border-emerald-800 text-slate-950', 'bg-emerald-800 text-white', 'text-emerald-900', 'Bulbasaur', 'Lucky Pulls')
on conflict (id) do nothing;

insert into public.admin_collections (admin_email, collection_id) values
  ('leoramchandani@gmail.com', 'leo'), ('leoramchandani@gmail.com', 'remy')
on conflict do nothing;

delete from public.admin_collections where admin_email = 'leoramchandani@gmail.com' and collection_id = 'papa';

insert into public.admins (email, is_superuser) values
  ('rahilramchandani@gmail.com', true),
  ('leoramchandani@gmail.com', false),
  ('its.sidd@gmail.com', false)
on conflict (email) do update set is_superuser = excluded.is_superuser;

insert into storage.buckets (id, name, public) values ('trainer-photos', 'trainer-photos', true)
on conflict (id) do update set public = true;

alter table public.card_collections enable row level security;
alter table public.collection_definitions enable row level security;
alter table public.admin_collections enable row level security;
alter table public.admins enable row level security;
alter table public.admin_wishlist enable row level security;

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
revoke all on public.collection_definitions from anon, authenticated;
revoke all on public.admin_collections from anon, authenticated;
revoke all on public.admins from anon, authenticated;
revoke all on public.admin_wishlist from anon, authenticated;
revoke all on function public.add_collection_card(text, text, jsonb) from public;
revoke all on function public.remove_collection_card(text, text) from public;
grant execute on function public.add_collection_card(text, text, jsonb) to service_role;
grant execute on function public.remove_collection_card(text, text) to service_role;
