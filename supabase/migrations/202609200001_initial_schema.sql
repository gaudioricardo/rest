-- Reconstructed from the web/mobile clients. NEW EMPTY SUPABASE PROJECTS ONLY.
-- Supabase already supplies auth.users, auth.uid(), anon, authenticated and service_role.
begin;

create schema if not exists rest_private;
revoke all on schema rest_private from public, anon, authenticated;

create table rest_private.document_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  document_type text not null,
  last_number bigint not null check(last_number > 0),
  primary key(user_id, document_type)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text not null default '', nuit text not null default '',
  address text not null default '', city text not null default '',
  phone text not null default '', email text not null default '',
  logo_base64 text, stamp_base64 text,
  bank_accounts jsonb not null default '[]' check(jsonb_typeof(bank_accounts) = 'array'),
  mobile_contacts jsonb not null default '[]' check(jsonb_typeof(mobile_contacts) = 'array'),
  secondary_company jsonb check(secondary_company is null or jsonb_typeof(secondary_company) in ('object','null')),
  setup_complete boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, sku text not null default '',
  category text not null default '', category_pt text not null default '',
  stock_level numeric(18,4) not null default 0 check(stock_level >= 0 and stock_level <> 'NaN'::numeric),
  max_stock numeric(18,4) not null default 0 check(max_stock >= 0 and max_stock <> 'NaN'::numeric),
  price numeric(18,4) not null default 0 check(price >= 0 and price <> 'NaN'::numeric),
  sale_price numeric(18,4) check(sale_price >= 0 and sale_price <> 'NaN'::numeric),
  warehouse text not null default '', warehouse_pt text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,user_id)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seq_number bigint not null check(seq_number > 0),
  client text not null, client_nuit text, client_phone text, client_email text, description text,
  issue_date date not null default current_date, due_date date,
  amount numeric(18,2) not null default 0 check(amount >= 0 and amount <> 'NaN'::numeric),
  status text not null default 'Pending' check(status in ('Pending','Paid','Overdue')),
  logo_bg text, company_profile_id text not null default 'primary' check(company_profile_id in ('primary','secondary')),
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,seq_number), unique(id,user_id)
);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seq_number bigint not null check(seq_number > 0),
  client text not null, client_nuit text, client_phone text, client_email text, description text,
  issue_date date not null default current_date, validity_days integer not null default 15 check(validity_days > 0),
  amount numeric(18,2) not null default 0 check(amount >= 0 and amount <> 'NaN'::numeric),
  status text not null default 'Pending' check(status in ('Pending','Approved','Rejected','Liquidado')),
  logo_bg text, company_profile_id text not null default 'primary' check(company_profile_id in ('primary','secondary')),
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,seq_number)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(18,4) not null check(quantity > 0 and quantity <> 'NaN'::numeric),
  unit_price numeric(18,4) not null check(unit_price >= 0 and unit_price <> 'NaN'::numeric),
  sort_order integer not null default 0 check(sort_order >= 0)
);
create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric(18,4) not null check(quantity > 0 and quantity <> 'NaN'::numeric),
  unit_price numeric(18,4) not null check(unit_price >= 0 and unit_price <> 'NaN'::numeric),
  sort_order integer not null default 0 check(sort_order >= 0)
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seq_number bigint not null check(seq_number > 0),
  invoice_id uuid, invoice_ref text,
  client text not null,
  amount numeric(18,2) not null check(amount > 0 and amount <> 'NaN'::numeric),
  method text not null default '', method_pt text not null default '',
  payment_date date not null default current_date,
  company_profile_id text not null default 'primary' check(company_profile_id in ('primary','secondary')),
  notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,seq_number),
  foreign key(invoice_id,user_id) references public.invoices(id,user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seq_number bigint not null check(seq_number > 0),
  merchant text not null, category text not null default '', category_pt text not null default '',
  amount numeric(18,2) not null check(amount >= 0 and amount <> 'NaN'::numeric),
  expense_date date not null default current_date,
  status text not null default 'Pending' check(status in ('Pending','Approved','Rejected')),
  notes text, receipt_image_url text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,seq_number)
);

create table public.general_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seq_number bigint not null check(seq_number > 0),
  product_id uuid, product_name text not null, sku text not null default '',
  quantity numeric(18,4) not null check(quantity > 0 and quantity <> 'NaN'::numeric),
  unit_price numeric(18,4) not null check(unit_price >= 0 and unit_price <> 'NaN'::numeric),
  total_amount numeric(18,2) not null check(total_amount >= 0 and total_amount <> 'NaN'::numeric),
  sale_date date not null default current_date, payment_method text not null default '', notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,seq_number),
  foreign key(product_id,user_id) references public.stock_items(id,user_id)
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, email text not null default '', phone text not null default '',
  company text not null default '', role text not null default '', role_pt text not null default '',
  avatar_color text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.debt_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null, movitel_number text not null default '', vodacom_number text not null default '',
  email text, address text not null default '',
  status text not null default 'Pendente' check(status in ('Pendente','Liquidado')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index rest_clients_name on public.debt_clients(user_id, lower(full_name));
create index rest_stock_name on public.stock_items(user_id, lower(btrim(name)));

create table public.oportunidades (
  id uuid primary key default gen_random_uuid(), referencia text not null unique,
  numero_concurso text, regime text, modalidade text, classe text, objeto_geral text, ugea text,
  moeda text not null default 'MZN', valor_estimado numeric(18,2), garantia_provisoria numeric(18,2),
  criterio_adjudicacao text, data_lancamento date, numero_lotes text, entrega_propostas date,
  data_abertura date, hora_entrega text, hora_abertura text, observacoes text, data_publicacao date,
  actualizado_em timestamptz not null default now(), created_at timestamptz not null default now()
);

create function rest_private.assign_document_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_schema <> 'public' or tg_table_name not in ('invoices','quotes','receipts','expenses','general_sales') then
    raise exception 'Unsupported document table';
  end if;
  if auth.uid() is not null and new.user_id <> auth.uid() then raise exception 'Invalid owner'; end if;
  if new.seq_number is not null then raise exception 'Document number is assigned automatically'; end if;
  insert into rest_private.document_counters(user_id,document_type,last_number)
    values(new.user_id,tg_table_name,1)
    on conflict(user_id,document_type) do update set last_number = rest_private.document_counters.last_number + 1
    returning last_number into new.seq_number;
  return new;
end;
$$;
revoke all on function rest_private.assign_document_number() from public, anon, authenticated;

create function rest_private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
revoke all on function rest_private.touch_updated_at() from public, anon, authenticated;

do $$declare t text; begin
  foreach t in array array['invoices','quotes','receipts','expenses','general_sales'] loop
    execute format('create trigger assign_document_number before insert on public.%I for each row execute function rest_private.assign_document_number()',t);
  end loop;
  foreach t in array array['company_settings','stock_items','invoices','quotes','receipts','expenses','general_sales','contacts','debt_clients'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('grant all on public.%I to service_role',t);
    execute format('create policy owner_access on public.%I to authenticated using(user_id = (select auth.uid())) with check(user_id = (select auth.uid()))',t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function rest_private.touch_updated_at()',t);
  end loop;
end$$;

alter table public.invoice_items enable row level security;
alter table public.quote_items enable row level security;
revoke all on public.invoice_items,public.quote_items from anon, authenticated;
grant select,insert,update,delete on public.invoice_items,public.quote_items to authenticated;
grant all on public.invoice_items,public.quote_items to service_role;
create policy owner_access on public.invoice_items to authenticated
  using(exists(select 1 from public.invoices where id = invoice_id and user_id = (select auth.uid())))
  with check(exists(select 1 from public.invoices where id = invoice_id and user_id = (select auth.uid())));
create policy owner_access on public.quote_items to authenticated
  using(exists(select 1 from public.quotes where id = quote_id and user_id = (select auth.uid())))
  with check(exists(select 1 from public.quotes where id = quote_id and user_id = (select auth.uid())));

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select,insert,update,delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy owner_access on public.profiles to authenticated
  using(id = (select auth.uid())) with check(id = (select auth.uid()));
create trigger touch_updated_at before update on public.profiles for each row execute function rest_private.touch_updated_at();

create function rest_private.create_user_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,email,full_name)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''))
  on conflict(id) do nothing;
  return new;
end;
$$;
revoke all on function rest_private.create_user_profile() from public, anon, authenticated;
create trigger rest_create_user_profile after insert on auth.users for each row execute function rest_private.create_user_profile();
insert into public.profiles(id,email,full_name)
select id,email,coalesce(raw_user_meta_data->>'full_name',raw_user_meta_data->>'name','') from auth.users
on conflict(id) do nothing;

alter table public.oportunidades enable row level security;
revoke all on public.oportunidades from anon, authenticated;
grant select on public.oportunidades to authenticated;
grant all on public.oportunidades to service_role;
create policy signed_in_read on public.oportunidades for select to authenticated using(true);
commit;
