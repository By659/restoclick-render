
create type public.app_role as enum ('admin','responsable_restaurant','cuisinier','livreur','client');
create type public.order_status as enum ('en_attente','acceptee','en_preparation','prete','en_livraison','livree','annulee');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  default_address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create policy "own roles read" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.raw_user_meta_data->>'phone');
  insert into public.user_roles (user_id, role) values (new.id, 'client');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Restaurants
create table public.restaurants (
  id text primary key,
  name text not null,
  type text not null,
  cuisine text not null,
  image_key text not null,
  rating numeric(2,1) not null default 0,
  reviews integer not null default 0,
  delivery_min integer not null,
  delivery_max integer not null,
  delivery_fee integer not null check (delivery_fee >= 0),
  quartiers text[] not null default '{}',
  promo text,
  is_open boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.restaurants to anon, authenticated;
grant all on public.restaurants to service_role;
alter table public.restaurants enable row level security;
create policy "public read restaurants" on public.restaurants for select to anon, authenticated using (true);

create table public.restaurant_members (
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  user_id uuid not null,
  role public.app_role not null,
  primary key (restaurant_id, user_id)
);
grant select on public.restaurant_members to authenticated;
grant all on public.restaurant_members to service_role;
alter table public.restaurant_members enable row level security;
create policy "members read own" on public.restaurant_members for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage members" on public.restaurant_members for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.dishes (
  id text primary key,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  image_key text not null,
  category text not null,
  is_available boolean not null default true,
  sort integer not null default 0
);
create index on public.dishes(restaurant_id);
grant select on public.dishes to anon, authenticated;
grant all on public.dishes to service_role;
alter table public.dishes enable row level security;
create policy "public read dishes" on public.dishes for select to anon, authenticated using (true);

create table public.dish_options (
  id uuid primary key default gen_random_uuid(),
  dish_id text not null references public.dishes(id) on delete cascade,
  label text not null,
  price integer not null default 0 check (price >= 0),
  unique (dish_id, label)
);
grant select on public.dish_options to anon, authenticated;
grant all on public.dish_options to service_role;
alter table public.dish_options enable row level security;
create policy "public read options" on public.dish_options for select to anon, authenticated using (true);

-- Orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('RC-' || upper(substr(md5(random()::text),1,6))),
  user_id uuid not null,
  restaurant_id text not null references public.restaurants(id),
  delivery_person_id uuid references auth.users(id) on delete set null,
  restaurant_name text not null,
  status public.order_status not null default 'en_attente',
  mode text not null check (mode in ('livraison','emporter')),
  payment_method text not null check (payment_method in ('cash','wave')),
  customer_name text not null,
  customer_phone text not null,
  address text,
  subtotal integer not null,
  delivery_fee integer not null,
  total integer not null,
  commission integer not null,
  created_at timestamptz not null default now()
);
create index on public.orders(user_id, created_at desc);
create index on public.orders(restaurant_id, created_at desc);
create index on public.orders(delivery_person_id, status, created_at desc)
  where delivery_person_id is not null;
create index on public.orders(created_at)
  where mode = 'livraison' and status = 'prete' and delivery_person_id is null;
grant select on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "client reads own orders" on public.orders for select to authenticated using (
  user_id = auth.uid() or public.has_role(auth.uid(),'admin')
  or exists (select 1 from public.restaurant_members m where m.restaurant_id = orders.restaurant_id and m.user_id = auth.uid())
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  dish_id text not null,
  name text not null,
  unit_price integer not null,
  quantity integer not null check (quantity > 0),
  options text[] not null default '{}',
  note text
);
create index on public.order_items(order_id);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "read items of visible orders" on public.order_items for select to authenticated using (
  exists (select 1 from public.orders o where o.id = order_items.order_id)
);

-- Server-side priced order placement
create or replace function public.place_order(
  _restaurant_id text, _mode text, _payment text, _name text, _phone text, _address text, _items jsonb
) returns table(id uuid, code text, total integer)
language plpgsql security definer set search_path = public as $$
declare
  r public.restaurants;
  it jsonb;
  d public.dishes;
  opt_total integer;
  opts text[];
  sub integer := 0;
  fee integer;
  oid uuid;
  ocode text;
  otot integer;
begin
  if auth.uid() is null then raise exception 'Connexion requise'; end if;
  select * into r from public.restaurants where restaurants.id = _restaurant_id;
  if not found then raise exception 'Restaurant introuvable'; end if;
  if not r.is_open then raise exception 'Restaurant fermé'; end if;
  if _mode not in ('livraison','emporter') or _payment not in ('cash','wave') then raise exception 'Paramètres invalides'; end if;
  if length(trim(coalesce(_name,''))) < 2 or _phone !~ '^(\+221)?\s?7[05678][0-9]{7}$' then raise exception 'Coordonnées invalides'; end if;
  if _mode = 'livraison' and not (split_part(coalesce(_address,''), ',', 1) = any(r.quartiers)) then raise exception 'Quartier non desservi'; end if;
  if jsonb_array_length(_items) = 0 or jsonb_array_length(_items) > 50 then raise exception 'Panier invalide'; end if;

  fee := case when _mode = 'livraison' then r.delivery_fee else 0 end;
  insert into public.orders (user_id, restaurant_id, restaurant_name, mode, payment_method, customer_name, customer_phone, address, subtotal, delivery_fee, total, commission)
  values (auth.uid(), r.id, r.name, _mode, _payment, trim(_name), _phone, case when _mode='livraison' then _address end, 0, fee, 0, 0)
  returning orders.id into oid;

  for it in select * from jsonb_array_elements(_items) loop
    select * into d from public.dishes where dishes.id = it->>'dish_id' and restaurant_id = r.id and is_available;
    if not found then raise exception 'Plat indisponible'; end if;
    select coalesce(array_agg(o.label), '{}'), coalesce(sum(o.price),0) into opts, opt_total
      from public.dish_options o where o.dish_id = d.id and o.label in (select jsonb_array_elements_text(coalesce(it->'options','[]'::jsonb)));
    if (it->>'quantity')::int < 1 or (it->>'quantity')::int > 99 then raise exception 'Quantité invalide'; end if;
    insert into public.order_items (order_id, dish_id, name, unit_price, quantity, options, note)
    values (oid, d.id, d.name, d.price + opt_total, (it->>'quantity')::int, opts, left(it->>'note', 200));
    sub := sub + (d.price + opt_total) * (it->>'quantity')::int;
  end loop;

  update public.orders set subtotal = sub, total = sub + fee, commission = round(sub * 0.08)
    where orders.id = oid returning orders.code, orders.total into ocode, otot;
  return query select oid, ocode, otot;
end $$;
revoke all on function public.place_order(text,text,text,text,text,text,jsonb) from public, anon;
grant execute on function public.place_order(text,text,text,text,text,text,jsonb) to authenticated;

-- Applications (partner / driver)
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('partenaire','livreur')),
  user_id uuid,
  name text not null check (length(name) between 2 and 80),
  phone text not null check (length(phone) between 9 and 20),
  detail text not null check (length(detail) between 2 and 120),
  status text not null default 'en_attente',
  created_at timestamptz not null default now()
);
grant insert on public.applications to anon, authenticated;
grant select on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create policy "anyone can apply" on public.applications for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
create policy "admin or owner read" on public.applications for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- Demo data (is_demo = true; remove with: delete from public.restaurants where is_demo;)
insert into public.restaurants (id,name,type,cuisine,image_key,rating,reviews,delivery_min,delivery_max,delivery_fee,quartiers,promo,is_open,is_demo) values
('chez-awa','Chez Awa','Restaurant','Sénégalaise','hero',4.8,214,25,40,500,'{Escale,Boucotte,Santhiaba,Peyrissac,Boudody}','-20 % sur le thiéb',true,true),
('dibiterie-teranga','Dibiterie Teranga','Dibiterie','Grillades','dibi',4.7,389,20,35,700,'{Lyndiane,Tilène,Kandé,Néma,Escale}',null,true,true),
('casa-burger','Casa Burger','Fast-food','Burgers','burger',4.5,156,15,30,500,'{Escale,Boucotte,Belfort,Colobane,Kenya}','Livraison offerte dès 10 000 F',true,true),
('le-kassa','Le Kassa','Restaurant','Casamançaise','yassa',4.9,98,30,45,800,'{Diabir,"Grand Dakar",Néma,Kandé,Lyndiane}',null,false,true);

insert into public.dishes (id,restaurant_id,name,description,price,image_key,category,sort) values
('thieb','chez-awa','Thiéboudienne','Riz rouge, poisson frais et légumes du marché.',3000,'hero','Plats',1),
('yassa-awa','chez-awa','Yassa poulet','Poulet mariné citron-oignons, riz blanc.',2500,'yassa','Plats',2),
('mafe-awa','chez-awa','Mafé bœuf','Sauce arachide onctueuse, riz blanc.',2500,'hero','Plats',3),
('bissap','chez-awa','Jus de bissap','Bouteille 50 cl, fait maison.',500,'bissap','Boissons',4),
('dibi-mouton','dibiterie-teranga','Dibi mouton (500 g)','Agneau grillé au feu de bois, oignons, moutarde.',4000,'dibi','Grillades',1),
('dibi-poulet','dibiterie-teranga','Poulet braisé','Demi-poulet braisé, frites ou attiéké.',3500,'dibi','Grillades',2),
('poisson-braise','dibiterie-teranga','Poisson braisé','Capitaine grillé, attiéké et sauce oignon.',4500,'dibi','Grillades',3),
('classic','casa-burger','Burger classique','Bœuf, cheddar, crudités, frites.',3500,'burger','Burgers',1),
('double','casa-burger','Double cheese','Double steak, double cheddar, frites.',5000,'burger','Burgers',2),
('shawarma','casa-burger','Sandwich shawarma','Poulet mariné, crudités, sauce blanche.',2000,'burger','Sandwichs',3),
('thiakry','casa-burger','Thiakry','Dessert de mil au lait caillé.',1000,'thiakry','Desserts',4),
('kaldou','le-kassa','Kaldou','Poisson au citron, spécialité de Casamance.',3000,'yassa','Plats',1);

insert into public.dish_options (dish_id,label,price)
select d.id, o.label, o.price from public.dishes d
cross join (values ('Sauce piment',200),('Portion supplémentaire',1000),('Boisson bissap',500)) as o(label,price)
where d.category in ('Plats','Grillades','Burgers');
