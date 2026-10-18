alter table public.orders
  add column delivery_person_id uuid references auth.users(id) on delete set null;

create index orders_delivery_person_status_created_idx
  on public.orders(delivery_person_id, status, created_at desc)
  where delivery_person_id is not null;

create index orders_available_delivery_created_idx
  on public.orders(created_at)
  where mode = 'livraison' and status = 'prete' and delivery_person_id is null;
