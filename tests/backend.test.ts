import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { AwsV4Signer } from 'aws4fetch';
import { collectPages, cachedRead, invalidateReads, databaseFetch } from '../shared/pagination.ts';
import { validateReceipt, requireOwnedKey, MAX_RECEIPT_BYTES } from '../shared/receipts.ts';
import { mutate } from '../shared/mutations.ts';

test('pagination reads past 1000 rows and respects a smaller server cap', async () => {
  const source = Array.from({length: 1207}, (_, id) => ({id}));
  let calls = 0;
  const data = await collectPages(async (from,to) => {
    calls++; assert.ok(to-from < 100);
    return { data: source.slice(from, Math.min(from+37,to+1)), count: source.length, error: null };
  });
  assert.deepEqual(data,source); assert.equal(calls,33);
});
test('pagination never silently returns a partial report after an error', async () => {
  await assert.rejects(collectPages(async from => ({data: from ? [] : Array(100).fill(1), count: 200, error: from ? new Error('offline') : null})), /offline/);
});
test('pagination refuses a duplicate row after concurrent ordering changes',async()=> {
  await assert.rejects(collectPages(async () => ({data:[{id:'same'}],count:2,error:null})),/dados mudaram/);
});
test('ambiguous network errors reuse operation IDs; successful writes start a new operation', async()=> {
  const ids:string[]=[];
  const client={rpc:async (_name:string,args:any)=>{
    ids.push(args.p_request_id);
    return ids.length === 1 ? {data:null,error:{message:'Failed to fetch',code:''}} : {data:{id:'saved'},error:null};
  }};
  await mutate(client,'test_operation',{user_id:'u'});
  await mutate(client,'test_operation',{user_id:'u'});
  await mutate(client,'test_operation',{user_id:'u'});
  assert.equal(ids[0],ids[1]); assert.notEqual(ids[1],ids[2]);
});
test('reads deduplicate and writes invalidate cached data', async () => {
  invalidateReads(); let calls=0;
  const read = async () => [++calls];
  await Promise.all([cachedRead('u/table',read),cachedRead('u/table',read)]);
  assert.equal(calls,1);
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('{}');
  try { await databaseFetch('https://example.test/rest/v1/invoices',{method:'POST'}); }
  finally { globalThis.fetch = original; }
  assert.deepEqual(await cachedRead('u/table',read),[2]);
});
test('receipt authorisation rejects other owners, traversal and oversize uploads', () => {
  assert.equal(requireOwnedKey('https://f001.backblazeb2.com/file/bucket/expenses/u/a.jpg','u'),'expenses/u/a.jpg');
  assert.throws(()=>requireOwnedKey('expenses/other/a.jpg','u'));
  assert.throws(()=>requireOwnedKey('expenses/u/../other/a.jpg','u'));
  assert.throws(()=>requireOwnedKey('https://evil.test/file/b/expenses/u/a.jpg','u'));
  assert.throws(()=>validateReceipt('image/jpeg',MAX_RECEIPT_BYTES+1));
  assert.throws(()=>validateReceipt('text/html',1));
  validateReceipt('image/jpeg',MAX_RECEIPT_BYTES);
});
test('upload signatures bind object, length, content type and expiration', async () => {
  const signed=await new AwsV4Signer({url:'https://s3.us-west-004.backblazeb2.com/bucket/expenses/u/file.jpg?X-Amz-Expires=120',method:'PUT',
    headers:{'Content-Length':'123','Content-Type':'image/jpeg'},accessKeyId:'test',secretAccessKey:'test-secret',service:'s3',region:'us-west-004',signQuery:true,allHeaders:true}).sign();
  assert.equal(signed.url.searchParams.get('X-Amz-SignedHeaders'),'content-length;content-type;host');
  assert.equal(signed.url.searchParams.get('X-Amz-Expires'),'120');
  assert.ok(signed.url.searchParams.get('X-Amz-Signature'));
});

const owner='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
test('PostgreSQL transaction, authorisation, rollback and idempotency integration', async t => {
  const db=new PGlite();
  await db.exec(await readFile(new URL('./fixtures/schema.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/202609210001_backend_operations.sql',import.meta.url),'utf8'));
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${owner}',false);`);
  const call=async (sql:string,params:unknown[]=[]) => (await db.query<{result:any}>(sql,params)).rows[0]?.result;
  const scalar=async (sql:string) => (await db.query<any>(sql)).rows[0];
  const product=await call(`insert into stock_items(user_id,name,stock_level) values(auth.uid(),'Cable',10) returning id as result`);
  let inv:any;
  await t.test('document total is computed on server and lines are saved atomically', async()=> {
    inv=await call(`select rest_save_document('invoice',$1,$2,null,'invoice1') as result`,[
      {client:'Customer',amount:99999,issue_date:'2026-09-21'},[{description:'Cable',quantity:2,unitPrice:50}]]);
    assert.equal(inv.amount,100);
    assert.equal((await scalar('select count(*)::int as n from invoice_items')).n,1);
    await assert.rejects(call(`select rest_save_document('invoice',$1,$2,null,'bad-doc') as result`,[
      {client:'Bad'},[{description:'Cable',quantity:-2,unitPrice:50}]]),/Invalid document item/);
    assert.equal((await scalar('select count(*)::int as n from invoices')).n,1);
    await assert.rejects(call(`select rest_save_document('invoice',$1,$2,null,'line-failure') as result`,[
      {client:'Rollback'},[{description:'FAIL-LINE',quantity:1,unitPrice:1}]]),/check constraint/);
    assert.equal((await scalar('select count(*)::int as n from invoices')).n,1);
    assert.equal((await scalar("select count(*)::int as n from debt_clients where full_name='Rollback'")).n,0);
  });
  await t.test('partial payment leaves stock intact; final payment deducts exactly once',async()=> {
    const receipt=(amount:number)=>({invoice_id:inv.id,client:'spoofed',amount,method:'Cash',method_pt:'Dinheiro',payment_date:'2026-09-21'});
    await call(`select rest_create_receipt($1,'partial') as result`,[receipt(30)]);
    assert.equal(Number((await scalar('select stock_level from stock_items')).stock_level),10);
    assert.equal((await scalar('select status from invoices')).status,'Pending');
    const final=await call(`select rest_create_receipt($1,'final') as result`,[receipt(70)]);
    assert.equal(final.client,'Customer');
    const retry=await call(`select rest_create_receipt($1,'final') as result`,[receipt(70)]);
    assert.equal(final.id,retry.id);
    await call('select rest_apply_invoice_stock($1) as result',[inv.id]);
    assert.equal(Number((await scalar('select stock_level from stock_items')).stock_level),8);
    assert.equal((await scalar('select count(*)::int as n from receipts')).n,2);
    await assert.rejects(call(`select rest_create_receipt($1,'again') as result`,[receipt(100)]),/already paid/);
  });
  await t.test('stock failure rolls back receipt, invoice status and operation ID',async()=> {
    const large=await call(`select rest_save_document('invoice',$1,$2,null,'large') as result`,[
      {client:'Large'},[{description:'Cable',quantity:20,unitPrice:1}]]);
    await assert.rejects(call(`select rest_create_receipt($1,'no-stock') as result`,[
      {invoice_id:large.id,amount:20,method:'Cash',payment_date:'2026-09-21'}]),/Insufficient stock/);
    assert.equal((await scalar('select count(*)::int as n from receipts')).n,2);
    assert.equal((await scalar("select count(*)::int as n from rest_requests where request_id='no-stock'")).n,0);
  });
  await t.test('sales cannot oversell and replay is idempotent',async()=> {
    const sale={product_id:product,product_name:'Cable',sku:'C',quantity:3,unit_price:2,sale_date:'2026-09-21',payment_method:'Cash'};
    const a=await call(`select rest_create_sale($1,'sale1') as result`,[sale]);
    const b=await call(`select rest_create_sale($1,'sale1') as result`,[sale]);
    assert.equal(a.id,b.id);
    assert.equal(Number((await scalar('select stock_level from stock_items')).stock_level),5);
    await assert.rejects(call(`select rest_create_sale($1,'sale2') as result`,[{...sale,quantity:6}]),/Insufficient stock/);
    assert.equal((await scalar('select count(*)::int as n from general_sales')).n,1);
  });
  await t.test('editing replaces lines transactionally and prevents editing paid invoices',async()=> {
    const quote=await call(`select rest_save_document('quote',$1,$2,null,'quote') as result`,[{client:'Quote'},[{description:'Service',quantity:1,unitPrice:5}]]);
    const edited=await call(`select rest_save_document('quote',$1,$2,$3,'edit') as result`,[{client:'Quote'},[{description:'Service',quantity:2,unitPrice:6}],quote.id]);
    assert.equal(edited.amount,12);
    assert.equal((await scalar('select count(*)::int as n from quote_items')).n,1);
    await assert.rejects(call(`select rest_save_document('quote',$1,$2,$3,'bad-edit') as result`,[
      {client:'Quote'},[{description:'FAIL-LINE',quantity:1,unitPrice:999}],quote.id]),/check constraint/);
    assert.equal(Number((await scalar('select amount from quotes')).amount),12);
    assert.equal((await scalar('select description from quote_items')).description,'Service');
    await assert.rejects(call(`select rest_save_document('invoice',$1,$2,$3,'edit-paid') as result`,[{client:'Customer'},[{description:'Cable',quantity:1,unitPrice:1}],inv.id]),/Cannot edit/);
  });
  await t.test('other users cannot debit stock, pay or edit documents they do not own',async()=> {
    await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);
    await assert.rejects(call(`select rest_create_sale($1,'foreign') as result`,[{product_id:product,quantity:1,unit_price:1}]),/Product not found/);
    await assert.rejects(call(`select rest_create_receipt($1,'foreign-rec') as result`,[{invoice_id:inv.id,amount:1}]),/Invoice not found/);
    assert.equal((await scalar('select count(*)::int as n from rest_requests')).n,0);
  });
  await t.test('anonymous callers cannot execute business operations',async()=> {
    await db.exec('reset role; set role anon');
    await assert.rejects(call(`select rest_create_sale('{}','anon') as result`),/permission denied/);
  });
  await db.close();
});
