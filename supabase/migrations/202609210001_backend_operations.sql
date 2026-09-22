-- Apply to a staging copy first: the original schema is not versioned in this repository.
begin;

create table if not exists public.rest_requests (
  user_id uuid not null default auth.uid(), request_id text not null,
  operation text not null, payload jsonb not null, result jsonb,
  created_at timestamptz not null default now(), primary key(user_id, request_id)
);
alter table public.rest_requests enable row level security;
create policy rest_requests_owner on public.rest_requests to authenticated
  using(user_id = auth.uid()) with check(user_id = auth.uid());
grant select, insert, update on public.rest_requests to authenticated;
create index rest_requests_created on public.rest_requests(created_at);

create or replace function public.rest_begin_request(p_id text, p_operation text, p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare request public.rest_requests;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_id is null or length(p_id) not between 1 and 128 then raise exception 'Request ID required'; end if;
  insert into public.rest_requests(user_id,request_id,operation,payload)
    values(auth.uid(),p_id,p_operation,p_payload) on conflict do nothing;
  select * into request from public.rest_requests where user_id = auth.uid() and request_id = p_id for update;
  if request.operation <> p_operation or request.payload <> p_payload then raise exception 'Request ID already used'; end if;
  return request.result;
end;
$$;

alter table public.invoices add column if not exists stock_deducted boolean not null default false;
-- Legacy paid invoices must not have their inventory deducted again.
update public.invoices set stock_deducted = true where status = 'Paid';

create index if not exists rest_invoices_user_seq on public.invoices(user_id, seq_number desc, id);
create index if not exists rest_quotes_user_seq on public.quotes(user_id, seq_number desc, id);
create index if not exists rest_receipts_user_seq on public.receipts(user_id, seq_number desc, id);
create index if not exists rest_expenses_user_seq on public.expenses(user_id, seq_number desc, id);
create index if not exists rest_sales_user_date on public.general_sales(user_id, sale_date desc, seq_number desc, id);
create index if not exists rest_stock_user_created on public.stock_items(user_id, created_at desc, id);
create index if not exists rest_contacts_user_created on public.contacts(user_id, created_at desc, id);
create index if not exists rest_clients_user_created on public.debt_clients(user_id, created_at desc, id);
create index if not exists rest_receipts_invoice on public.receipts(invoice_id);
create index if not exists rest_invoice_items_parent on public.invoice_items(invoice_id);
create index if not exists rest_quote_items_parent on public.quote_items(quote_id);

create or replace function public.rest_apply_invoice_stock(p_invoice_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  inv public.invoices;
  item record;
  product public.stock_items;
  matches integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into inv from public.invoices where id = p_invoice_id and user_id = auth.uid() for update;
  if not found then raise exception 'Invoice not found'; end if;
  if inv.stock_deducted then return; end if;
  if inv.status <> 'Paid' then raise exception 'Invoice must be paid'; end if;
  -- Lock products in a stable order. Legacy items reference product names, not IDs.
  for product in
    select s.* from public.stock_items s
    where s.user_id = auth.uid() and exists (
      select 1 from public.invoice_items i where i.invoice_id = inv.id
      and lower(btrim(i.description)) = lower(btrim(s.name)))
    order by s.id for update
  loop
    select count(*) into matches from public.stock_items s
      where s.user_id = auth.uid() and lower(btrim(s.name)) = lower(btrim(product.name));
    if matches > 1 then raise exception 'Ambiguous stock name: %', product.name; end if;
    select sum(quantity) as quantity into item from public.invoice_items
      where invoice_id = inv.id and lower(btrim(description)) = lower(btrim(product.name));
    if item.quantity <= 0 or product.stock_level < item.quantity then
      raise exception 'Insufficient stock: %', product.name;
    end if;
    update public.stock_items set stock_level = stock_level - item.quantity where id = product.id;
  end loop;
  update public.invoices set stock_deducted = true where id = inv.id;
end;
$$;

create or replace function public.rest_save_document(
  p_kind text, p_document jsonb, p_items jsonb, p_id uuid default null, p_request_id text default null
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  table_name text;
  item_table text;
  parent_column text;
  columns text[];
  column_list text;
  record_list text;
  assignments text;
  doc jsonb;
  saved jsonb;
  item jsonb;
  total numeric := 0;
  previous jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  saved := public.rest_begin_request(p_request_id, 'document', jsonb_build_object('kind',p_kind,'document',p_document,'items',p_items,'id',p_id));
  if saved is not null then return saved; end if;
  if p_kind not in ('invoice', 'quote') or p_kind is null then raise exception 'Invalid document kind'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'At least one document item is required';
  end if;
  if jsonb_array_length(p_items) > 500 then raise exception 'Too many document items'; end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if nullif(btrim(item->>'description'), '') is null
      or coalesce((item->>'quantity')::numeric, 0) <= 0
      or coalesce((item->>'unitPrice')::numeric, -1) < 0
      or (item->>'quantity')::numeric::text in ('NaN','Infinity','-Infinity')
      or (item->>'unitPrice')::numeric::text in ('NaN','Infinity','-Infinity') then
      raise exception 'Invalid document item';
    end if;
    total := total + (item->>'quantity')::numeric * (item->>'unitPrice')::numeric;
  end loop;
  if nullif(btrim(p_document->>'client'), '') is null then raise exception 'Client required'; end if;
  table_name := case p_kind when 'invoice' then 'invoices' else 'quotes' end;
  item_table := case p_kind when 'invoice' then 'invoice_items' else 'quote_items' end;
  parent_column := p_kind || '_id';
  if p_id is not null then
    execute format('select to_jsonb(t) from public.%I t where id = $1 and user_id = $2 for update', table_name)
      into previous using p_id, auth.uid();
    if previous is null then raise exception 'Document not found'; end if;
    if p_kind = 'invoice' and ((previous->>'status') = 'Paid' or exists (
      select 1 from public.receipts where invoice_id = p_id)) then
      raise exception 'Cannot edit an invoice with payments';
    end if;
  end if;
  doc := coalesce(previous, '{}'::jsonb) || p_document || jsonb_build_object(
    'user_id', auth.uid(), 'amount', round(total, 2),
    'client', btrim(p_document->>'client'),
    'status', coalesce(previous->>'status', p_document->>'status', 'Pending'),
    'company_profile_id', coalesce(p_document->>'company_profile_id', previous->>'company_profile_id', 'primary'),
    'issue_date', coalesce(p_document->>'issue_date', previous->>'issue_date', current_date::text),
    'validity_days', coalesce(p_document->>'validity_days', previous->>'validity_days', '15')
  );
  columns := array['user_id','client','client_nuit','client_phone','client_email','description','amount','status',
    'issue_date','logo_bg','company_profile_id','notes',case p_kind when 'invoice' then 'due_date' else 'validity_days' end];
  select string_agg(format('%I', c), ','), string_agg(format('r.%I', c), ','),
    string_agg(format('%I = r.%I', c, c), ',') into column_list, record_list, assignments from unnest(columns) c;
  if p_id is null then
    execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I, $1) r returning to_jsonb(%I.*)',
      table_name, column_list, record_list, table_name, table_name) into saved using doc;
  else
    execute format('update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) r where t.id = $2 and t.user_id = $3 returning to_jsonb(t.*)',
      table_name, assignments, table_name) into saved using doc, p_id, auth.uid();
    execute format('delete from public.%I where %I = $1', item_table, parent_column) using p_id;
  end if;
  execute format('insert into public.%I (%I, description, quantity, unit_price, sort_order)
    select $1, value->>''description'', (value->>''quantity'')::numeric,
    (value->>''unitPrice'')::numeric, ordinality - 1 from jsonb_array_elements($2) with ordinality', item_table, parent_column)
    using (saved->>'id')::uuid, p_items;
  -- Serialise registration by owner/name without needing to merge existing duplicate clients.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text || lower(doc->>'client'), 0));
  if not exists (select 1 from public.debt_clients where user_id = auth.uid() and lower(full_name) = lower(doc->>'client')) then
    insert into public.debt_clients(user_id, full_name, movitel_number, vodacom_number, email, address, status)
      values(auth.uid(), doc->>'client', coalesce(doc->>'client_phone',''), '', doc->>'client_email', '', 'Pendente');
  else
    update public.debt_clients set
      movitel_number = coalesce(nullif(doc->>'client_phone',''), movitel_number),
      email = coalesce(nullif(doc->>'client_email',''), email)
      where user_id = auth.uid() and lower(full_name) = lower(doc->>'client');
  end if;
  if p_kind = 'invoice' then
    update public.quotes set status = 'Approved' where user_id = auth.uid()
      and lower(client) = lower(doc->>'client') and status = 'Pending';
    if nullif(p_document->>'source_quote_id','') is not null then
      update public.quotes set status = 'Liquidado'
        where id = (p_document->>'source_quote_id')::uuid and user_id = auth.uid();
      if not found then raise exception 'Source quote not found'; end if;
    end if;
    if saved->>'status' = 'Paid' then perform public.rest_apply_invoice_stock((saved->>'id')::uuid); end if;
  end if;
  update public.rest_requests set result = saved where user_id = auth.uid() and request_id = p_request_id;
  return saved;
end;
$$;

create or replace function public.rest_create_sale(p_sale jsonb, p_request_id text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare s public.general_sales; saved public.general_sales; product public.stock_items; cached jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  cached := public.rest_begin_request(p_request_id, 'sale', p_sale);
  if cached is not null then return cached; end if;
  s := jsonb_populate_record(null::public.general_sales, p_sale || jsonb_build_object('user_id',auth.uid()));
  if s.quantity is null or s.quantity <= 0 or s.unit_price is null or s.unit_price < 0
    or s.quantity::text in ('NaN','Infinity','-Infinity') or s.unit_price::text in ('NaN','Infinity','-Infinity') then
    raise exception 'Invalid quantity or price';
  end if;
  if s.product_id is not null then
    select * into product from public.stock_items where id = s.product_id and user_id = auth.uid() for update;
    if not found then raise exception 'Product not found'; end if;
    if product.stock_level < s.quantity then raise exception 'Insufficient stock'; end if;
    update public.stock_items set stock_level = stock_level - s.quantity where id = product.id;
  end if;
  insert into public.general_sales(user_id,product_id,product_name,sku,quantity,unit_price,total_amount,sale_date,payment_method,notes)
    values(auth.uid(),s.product_id,s.product_name,s.sku,s.quantity,s.unit_price,round(s.quantity*s.unit_price,2),s.sale_date,s.payment_method,s.notes)
    returning * into saved;
  update public.rest_requests set result = to_jsonb(saved) where user_id = auth.uid() and request_id = p_request_id;
  return to_jsonb(saved);
end;
$$;

create or replace function public.rest_create_receipt(p_receipt jsonb, p_request_id text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.receipts; saved public.receipts; inv public.invoices; paid numeric; linked uuid; settle boolean := false; cached jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  cached := public.rest_begin_request(p_request_id, 'receipt', p_receipt);
  if cached is not null then return cached; end if;
  r := jsonb_populate_record(null::public.receipts, p_receipt || jsonb_build_object('user_id',auth.uid()));
  r.amount := round(r.amount, 2);
  if r.amount is null or r.amount <= 0 or r.amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid payment amount'; end if;
  linked := r.invoice_id;
  if linked is null and r.invoice_ref ~ '^FAC-[0-9]+$' then
    select id into linked from public.invoices where user_id = auth.uid()
      and seq_number = substring(r.invoice_ref from 5)::bigint;
    if linked is null then raise exception 'Invoice reference not found'; end if;
  end if;
  if linked is not null then
    select * into inv from public.invoices where id = linked and user_id = auth.uid() for update;
    if not found then raise exception 'Invoice not found'; end if;
    if inv.status = 'Paid' then raise exception 'Invoice already paid'; end if;
    select coalesce(sum(amount),0) into paid from public.receipts where invoice_id = inv.id and user_id = auth.uid();
    if paid + r.amount > inv.amount then raise exception 'Payment exceeds outstanding amount'; end if;
    settle := paid + r.amount >= inv.amount;
    r.client := inv.client;
    r.company_profile_id := inv.company_profile_id;
    r.invoice_ref := 'FAC-' || lpad(inv.seq_number::text, greatest(4,length(inv.seq_number::text)), '0');
  end if;
  insert into public.receipts(user_id,invoice_id,invoice_ref,client,amount,method,method_pt,payment_date,company_profile_id,notes)
    values(auth.uid(),linked,r.invoice_ref,r.client,r.amount,r.method,r.method_pt,r.payment_date,coalesce(r.company_profile_id,'primary'),r.notes)
    returning * into saved;
  if settle then
    update public.invoices set status = 'Paid' where id = inv.id;
    perform public.rest_apply_invoice_stock(inv.id);
    if not exists (select 1 from public.invoices where user_id = auth.uid() and lower(client) = lower(inv.client) and status <> 'Paid') then
      update public.debt_clients set status = 'Liquidado' where user_id = auth.uid() and lower(full_name) = lower(inv.client);
      update public.quotes set status = 'Liquidado' where user_id = auth.uid() and lower(client) = lower(inv.client) and status in ('Pending','Approved');
    end if;
  end if;
  update public.rest_requests set result = to_jsonb(saved) where user_id = auth.uid() and request_id = p_request_id;
  return to_jsonb(saved);
end;
$$;

revoke all on function public.rest_apply_invoice_stock(uuid) from public, anon;
revoke all on function public.rest_begin_request(text,text,jsonb) from public, anon;
revoke all on function public.rest_save_document(text,jsonb,jsonb,uuid,text) from public, anon;
revoke all on function public.rest_create_sale(jsonb,text) from public, anon;
revoke all on function public.rest_create_receipt(jsonb,text) from public, anon;
grant execute on function public.rest_apply_invoice_stock(uuid) to authenticated;
grant execute on function public.rest_begin_request(text,text,jsonb) to authenticated;
grant execute on function public.rest_save_document(text,jsonb,jsonb,uuid,text) to authenticated;
grant execute on function public.rest_create_sale(jsonb,text) to authenticated;
grant execute on function public.rest_create_receipt(jsonb,text) to authenticated;
notify pgrst, 'reload schema';
commit;
