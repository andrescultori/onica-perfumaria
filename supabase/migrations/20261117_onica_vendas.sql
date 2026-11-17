-- Ônica Perfumaria: registro de vendas (só admins), catálogo de produtos e vendedoras.
-- Depende de 20261014_onica_identidade_olfativa.sql (onica_admins / onica_is_admin / onica_touch_updated_at).

-- Catálogo -----------------------------------------------------------------
create table public.onica_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  line text not null default 'Outros' check (length(trim(line)) between 1 and 60),
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  sort int not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index onica_products_name_uidx on public.onica_products (lower(name));
comment on table public.onica_products is 'Catálogo da Ônica (vendas; reaproveitável pela loja).';

-- Vendedoras ---------------------------------------------------------------
create table public.onica_sellers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 80),
  commission_pct numeric(5,2) not null default 0 check (commission_pct between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index onica_sellers_name_uidx on public.onica_sellers (lower(name));

-- Vendas -------------------------------------------------------------------
create table public.onica_sales (
  id uuid primary key default gen_random_uuid(),
  sold_on date not null default (now() at time zone 'America/Sao_Paulo')::date,
  seller_id uuid not null references public.onica_sellers(id),
  seller_name text not null,                    -- snapshot
  payment_method text not null check (payment_method in
    ('Pix','Dinheiro','Cartão de crédito','Cartão de débito','Transferência','Outro')),
  customer text,
  notes text check (notes is null or length(notes) <= 2000),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount_type text check (discount_type in ('valor','percentual')),
  discount_value numeric(10,2) not null default 0 check (discount_value >= 0),
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  total numeric(10,2) not null check (total >= 0),
  commission_pct numeric(5,2) not null default 0, -- snapshot da vendedora no momento da venda
  commission_amount numeric(10,2) not null default 0, -- sobre o total (após desconto)
  status text not null default 'ativa' check (status in ('ativa','cancelada')),
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index onica_sales_sold_on_idx on public.onica_sales (sold_on desc);
create index onica_sales_seller_idx on public.onica_sales (seller_id);

create table public.onica_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.onica_sales(id) on delete cascade,
  product_id uuid references public.onica_products(id) on delete set null,
  product_name text not null,                   -- snapshot
  product_line text not null,                   -- snapshot
  unit_price numeric(10,2) not null check (unit_price >= 0),
  qty int not null check (qty between 1 and 999),
  line_total numeric(10,2) not null check (line_total >= 0)
);
create index onica_sale_items_sale_idx on public.onica_sale_items (sale_id);

create trigger onica_products_touch before update on public.onica_products
  for each row execute function public.onica_touch_updated_at();
create trigger onica_sellers_touch before update on public.onica_sellers
  for each row execute function public.onica_touch_updated_at();
create trigger onica_sales_touch before update on public.onica_sales
  for each row execute function public.onica_touch_updated_at();

-- RLS: tudo só para admins da Ônica ----------------------------------------
alter table public.onica_products enable row level security;
alter table public.onica_sellers enable row level security;
alter table public.onica_sales enable row level security;
alter table public.onica_sale_items enable row level security;

create policy onica_products_admin_all on public.onica_products
  for all to authenticated using (public.onica_is_admin()) with check (public.onica_is_admin());
create policy onica_sellers_admin_all on public.onica_sellers
  for all to authenticated using (public.onica_is_admin()) with check (public.onica_is_admin());
-- vendas: leitura e alteração de status; inserção só pela função onica_create_sale
create policy onica_sales_admin_select on public.onica_sales
  for select to authenticated using (public.onica_is_admin());
create policy onica_sales_admin_update on public.onica_sales
  for update to authenticated using (public.onica_is_admin()) with check (public.onica_is_admin());
create policy onica_sale_items_admin_select on public.onica_sale_items
  for select to authenticated using (public.onica_is_admin());

-- Registrar venda: totais e comissão calculados no banco, tudo numa transação.
-- p_items: [{"product_id": "<uuid>", "qty": 2}, ...]
create or replace function public.onica_create_sale(
  p_sold_on date,
  p_seller_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_customer text default null,
  p_notes text default null,
  p_discount_type text default null,
  p_discount_value numeric default 0
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_seller public.onica_sellers;
  v_sale_id uuid;
  v_subtotal numeric(10,2);
  v_discount numeric(10,2) := 0;
  v_total numeric(10,2);
  v_n int;
begin
  if not public.onica_is_admin() then
    raise exception 'Sem permissão' using errcode = '42501';
  end if;

  select * into v_seller from public.onica_sellers where id = p_seller_id;
  if not found then raise exception 'Vendedora não encontrada'; end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Inclua ao menos um produto';
  end if;

  drop table if exists _items;
  create temp table _items on commit drop as
  select p.id as product_id, p.name, p.line, p.price, (i->>'qty')::int as qty
  from jsonb_array_elements(p_items) i
  join public.onica_products p on p.id = (i->>'product_id')::uuid;

  select count(*), coalesce(sum(price * qty), 0) into v_n, v_subtotal from _items;
  if v_n <> jsonb_array_length(p_items) then raise exception 'Produto inválido na venda'; end if;
  if exists (select 1 from _items where qty is null or qty < 1 or qty > 999) then
    raise exception 'Quantidade inválida';
  end if;

  p_discount_value := coalesce(p_discount_value, 0);
  if p_discount_value < 0 then raise exception 'Desconto inválido'; end if;
  if p_discount_type = 'valor' then
    v_discount := least(p_discount_value, v_subtotal);
  elsif p_discount_type = 'percentual' then
    if p_discount_value > 100 then raise exception 'Desconto acima de 100%%'; end if;
    v_discount := round(v_subtotal * p_discount_value / 100, 2);
  elsif p_discount_type is not null then
    raise exception 'Tipo de desconto inválido';
  else
    p_discount_value := 0;
  end if;
  v_total := v_subtotal - v_discount;

  insert into public.onica_sales (sold_on, seller_id, seller_name, payment_method, customer, notes,
    subtotal, discount_type, discount_value, discount_amount, total, commission_pct, commission_amount,
    created_by, created_by_email)
  values (coalesce(p_sold_on, (now() at time zone 'America/Sao_Paulo')::date), v_seller.id, v_seller.name,
    p_payment_method, nullif(trim(p_customer), ''), nullif(trim(p_notes), ''),
    v_subtotal, case when v_discount > 0 then p_discount_type end, case when v_discount > 0 then p_discount_value else 0 end,
    v_discount, v_total, v_seller.commission_pct, round(v_total * v_seller.commission_pct / 100, 2),
    auth.uid(), (select email from auth.users where id = auth.uid()))
  returning id into v_sale_id;

  insert into public.onica_sale_items (sale_id, product_id, product_name, product_line, unit_price, qty, line_total)
  select v_sale_id, product_id, name, line, price, qty, price * qty from _items;

  return v_sale_id;
end $$;
revoke all on function public.onica_create_sale(date, uuid, text, jsonb, text, text, text, numeric) from public, anon;
grant execute on function public.onica_create_sale(date, uuid, text, jsonb, text, text, text, numeric) to authenticated;

-- Catálogo inicial ---------------------------------------------------------
insert into public.onica_products (name, line, price, sort) values
  ('Body Splash Mônaco',               'Body Splash',          79.90, 10),
  ('Body Splash Istambul',             'Body Splash',          79.90, 11),
  ('Body Splash Indonésia',            'Body Splash',          79.90, 12),
  ('Body Splash New York',             'Body Splash',          79.90, 13),
  ('Body Splash Zurique Vanilla',      'Body Splash',          79.90, 14),
  ('Body Splash Jardin de Grasse',     'Body Splash',          79.90, 15),
  ('Body Splash Marraquesh',           'Body Splash',          79.90, 16),
  ('Body Splash Sicília Lemon',        'Body Splash',          79.90, 17),
  ('Body Splash Bordeaux',             'Body Splash',          79.90, 18),
  ('Body Splash Infantil Bambolê',         'Body Splash Infantil', 59.90, 20),
  ('Body Splash Infantil Soltando Pipa',   'Body Splash Infantil', 59.90, 21),
  ('Body Splash Infantil Amarelinha',      'Body Splash Infantil', 59.90, 22),
  ('Body Splash Infantil Pique Esconde',   'Body Splash Infantil', 59.90, 23),
  ('Home Spray',                       'Casa',                 79.00, 30),
  ('Água Perfumada',                   'Casa',                 59.00, 31),
  ('Creme Hidratante 100 ml',          'Corpo',                49.90, 40)
on conflict do nothing;
