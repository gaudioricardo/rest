import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('complete schema installs on an empty database and supports all application modules', async t => {
  const db = new PGlite();
  // Supabase supplies these objects. This emulation is ONLY for local tests.
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,service_role;
  `);
  await db.exec(await readFile(new URL('../supabase/schema.sql',import.meta.url),'utf8'));
  const a='11111111-1111-4111-8111-111111111111';
  const b='22222222-2222-4222-8222-222222222222';
  const rows=async(sql:string,params:unknown[]=[]) => (await db.query<any>(sql,params)).rows;
  const rpc=async(sql:string,args:unknown[]) => (await rows(sql,args))[0].result;
  await t.test('new Auth accounts create profiles with both name metadata conventions',async()=> {
    await db.query(`insert into auth.users(id,email,raw_user_meta_data) values($1,'a@example.test','{"name":"Web"}'),($2,'b@example.test','{"full_name":"Mobile"}')`,[a,b]);
    assert.deepEqual((await rows('select full_name from profiles order by id')).map(r=>r.full_name),['Web','Mobile']);
  });
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${a}',false)`);
  let product:string, invoice:any;
  await t.test('company settings, stock, expenses, contacts and clients accept application fields',async()=> {
    await db.exec(`
      insert into company_settings(user_id,company_name,bank_accounts,mobile_contacts,secondary_company,setup_complete)
      values(auth.uid(),'REST','[{"bank":"Bank","iban":"MZ"}]','[]','{"companyName":"Branch"}',true)
      on conflict(user_id) do update set company_name=excluded.company_name;
      insert into contacts(user_id,name,email,phone,company,role,role_pt,avatar_color)
      values(auth.uid(),'Contact','mail@example.test','84','Company','Manager','Gestor','blue');
      insert into debt_clients(user_id,full_name,movitel_number,vodacom_number,email,address,status)
      values(auth.uid(),'Customer','86','84','client@example.test','Maputo','Pendente');
      insert into expenses(user_id,merchant,category,category_pt,amount,expense_date,status,notes,receipt_image_url)
      values(auth.uid(),'Shop','Other','Outros',10,current_date,'Pending','Receipt','expenses/user/file.jpg');
    `);
    product=(await rows(`insert into stock_items(user_id,name,sku,stock_level,max_stock,price,sale_price,warehouse,warehouse_pt)
      values(auth.uid(),'Cable','C-1',10,100,2,5,'Main','Principal') returning id`))[0].id;
    assert.equal((await rows('select seq_number from expenses'))[0].seq_number,1);
    assert.equal((await rows('select count(*)::int as n from profiles'))[0].n,1);
  });
  await t.test('document RPCs work with real constraints, counters and line relationships',async()=> {
    const quote=await rpc(`select rest_save_document('quote',$1,$2,null,'q1') as result`,[
      {client:'Customer',client_phone:'87',issue_date:'2026-09-22'},[{description:'Cable',quantity:2,unitPrice:5}]]);
    invoice=await rpc(`select rest_save_document('invoice',$1,$2,null,'i1') as result`,[
      {client:'Customer',source_quote_id:quote.id,issue_date:'2026-09-22'},[{description:'Cable',quantity:2,unitPrice:5}]]);
    assert.equal(quote.seq_number,1); assert.equal(invoice.seq_number,1); assert.equal(invoice.amount,10);
    assert.equal((await rows('select status from quotes'))[0].status,'Liquidado');
    assert.equal((await rows('select movitel_number from debt_clients'))[0].movitel_number,'87');
    assert.equal((await rows('select count(*)::int as n from invoice_items'))[0].n,1);
  });
  await t.test('receipts and sales are atomic and idempotent on the reconstructed schema',async()=> {
    const payment={invoice_id:invoice.id,amount:10,method:'Cash',method_pt:'Dinheiro',payment_date:'2026-09-22'};
    const receipt=await rpc(`select rest_create_receipt($1,'r1') as result`,[payment]);
    const replay=await rpc(`select rest_create_receipt($1,'r1') as result`,[payment]);
    assert.equal(receipt.id,replay.id);
    assert.equal(Number((await rows('select stock_level from stock_items'))[0].stock_level),8);
    const sale={product_id:product,product_name:'Cable',sku:'C-1',quantity:1,unit_price:5,sale_date:'2026-09-22',payment_method:'Banco'};
    const saved=await rpc(`select rest_create_sale($1,'s1') as result`,[sale]);
    assert.equal(saved.seq_number,1);
    assert.equal(Number((await rows('select stock_level from stock_items'))[0].stock_level),7);
    await assert.rejects(rpc(`select rest_create_sale($1,'bad-sale') as result`,[{...sale,quantity:100}]),/Insufficient stock/);
    assert.equal((await rows('select count(*)::int as n from general_sales'))[0].n,1);
  });
  await t.test('RLS and foreign keys prevent cross-owner data references; numbering is per user',async()=> {
    await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`);
    for (const table of ['company_settings','stock_items','invoices','invoice_items','quotes','quote_items','receipts','expenses','contacts','debt_clients','general_sales','rest_requests']) {
      assert.equal((await rows(`select count(*)::int as n from ${table}`))[0].n,0,table);
    }
    const own=await rpc(`select rest_save_document('invoice',$1,$2,null,'i1') as result`,[
      {client:'Another'},[{description:'Service',quantity:1,unitPrice:10}]]);
    assert.equal(own.seq_number,1);
    await assert.rejects(db.query(`insert into receipts(user_id,invoice_id,client,amount) values(auth.uid(),$1,'Other',1)`,[invoice.id]),/foreign key constraint/);
    await assert.rejects(db.query('select * from rest_private.document_counters'),/permission denied/);
    await assert.rejects(db.exec(`insert into oportunidades(referencia) values('forged')`),/permission denied/);
  });
  await t.test('service role can populate UFSA and anonymous users cannot read business data',async()=> {
    await db.exec(`reset role; set role service_role; insert into oportunidades(referencia,numero_concurso,modalidade,classe,objeto_geral,ugea,moeda,data_lancamento,numero_lotes,hora_abertura,actualizado_em)
      values('UFSA-1','UFSA-1','Public','Services','Service','UGEA','MZN',current_date,'1','10H00',now());
      reset role; set role anon;`);
    await assert.rejects(db.exec('select * from invoices'),/permission denied/);
  });
  await db.close();
});
