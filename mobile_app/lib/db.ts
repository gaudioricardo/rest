import { supabase } from './supabase';
import type {
  StockItem, Invoice, Quote, Receipt, Expense,
  Contact, DebtClient, CompanySettings, DocumentItem,
} from '../shared/types';
import { getInitials, getAvatarColor } from '../shared/theme';

// ─── HELPERS ────────────────────────────────────────────────────────────────

const fmt = (n: number) => String(n).padStart(4, '0');

const toDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
const toDatePt = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: 'numeric' });

const calcStockStatus = (level: number, max: number) => {
  if (level === 0) return { status: 'Out of Stock' as const, statusPt: 'Sem Stock' as const };
  if (level / max <= 0.35) return { status: 'Low Stock' as const, statusPt: 'Stock Baixo' as const };
  return { status: 'In Stock' as const, statusPt: 'Em Stock' as const };
};

// ─── COMPANY SETTINGS ───────────────────────────────────────────────────────

export const getCompanySettings = async (userId: string): Promise<CompanySettings | null> => {
  const { data } = await supabase
    .from('company_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    userId: data.user_id,
    companyName: data.company_name ?? '',
    nuit: data.nuit ?? '',
    address: data.address ?? '',
    city: data.city ?? '',
    phone: data.phone ?? '',
    email: data.email ?? '',
    logoBase64: data.logo_base64 ?? undefined,
    stampBase64: data.stamp_base64 ?? undefined,
    bankAccounts: data.bank_accounts ?? [],
    mobileContacts: data.mobile_contacts ?? [],
    setupComplete: data.setup_complete ?? false,
    secondaryCompany: data.secondary_company ?? null,
  };
};

export const saveCompanySettings = async (userId: string, settings: Partial<CompanySettings>) => {
  const payload: Record<string, unknown> = { user_id: userId };
  if (settings.companyName !== undefined) payload.company_name = settings.companyName;
  if (settings.nuit !== undefined) payload.nuit = settings.nuit;
  if (settings.address !== undefined) payload.address = settings.address;
  if (settings.city !== undefined) payload.city = settings.city;
  if (settings.phone !== undefined) payload.phone = settings.phone;
  if (settings.email !== undefined) payload.email = settings.email;
  if (settings.logoBase64 !== undefined) payload.logo_base64 = settings.logoBase64;
  if (settings.stampBase64 !== undefined) payload.stamp_base64 = settings.stampBase64;
  if (settings.bankAccounts !== undefined) payload.bank_accounts = settings.bankAccounts;
  if (settings.mobileContacts !== undefined) payload.mobile_contacts = settings.mobileContacts;
  if (settings.setupComplete !== undefined) payload.setup_complete = settings.setupComplete;
  if ('secondaryCompany' in settings) payload.secondary_company = settings.secondaryCompany ?? null;
  return supabase.from('company_settings').upsert(payload, { onConflict: 'user_id' });
};

// ─── INVOICES ────────────────────────────────────────────────────────────────

const mapInvoice = (row: any): Invoice => ({
  id: row.id,
  seqNumber: row.seq_number,
  invoiceNumber: `FAC-${fmt(row.seq_number)}`,
  client: row.client ?? '',
  clientNuit: row.client_nuit,
  clientPhone: row.client_phone,
  clientEmail: row.client_email,
  description: row.description,
  initials: getInitials(row.client ?? ''),
  issueDate: row.issue_date ?? '',
  dueDate: row.due_date,
  date: toDate(row.issue_date),
  datePt: toDatePt(row.issue_date),
  amount: parseFloat(row.amount) || 0,
  status: row.status,
  statusPt: row.status === 'Paid' ? 'Pago' : row.status === 'Overdue' ? 'Vencido' : 'Pendente',
  logoBg: row.logo_bg ?? getAvatarColor(row.client ?? ''),
  items: (row.invoice_items ?? []).map((it: any) => ({
    description: it.description ?? '',
    quantity: Number(it.quantity) || 0,
    unitPrice: parseFloat(it.unit_price) || 0,
  })),
  companyProfileId: row.company_profile_id ?? 'primary',
  notes: row.notes,
});

export const getInvoices = async (userId: string): Promise<Invoice[]> => {
  const { data } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('user_id', userId)
    .order('seq_number', { ascending: false });
  return (data ?? []).map(mapInvoice);
};

export const createInvoice = async (
  userId: string,
  inv: Omit<Invoice, 'id' | 'seqNumber' | 'invoiceNumber' | 'initials' | 'date' | 'datePt' | 'logoBg' | 'statusPt'>,
  items: DocumentItem[]
) => {
  const { data: invData, error } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      client: inv.client,
      client_nuit: inv.clientNuit,
      client_phone: inv.clientPhone,
      client_email: inv.clientEmail,
      description: inv.description,
      amount: inv.amount,
      status: inv.status,
      issue_date: inv.issueDate,
      due_date: inv.dueDate,
      logo_bg: getAvatarColor(inv.client),
      company_profile_id: inv.companyProfileId ?? 'primary',
      notes: inv.notes,
    })
    .select()
    .single();
  if (error || !invData) throw error;

  if (items.length > 0) {
    await supabase.from('invoice_items').insert(
      items.map((item, i) => ({
        invoice_id: invData.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        sort_order: i,
      }))
    );
  }

  await upsertDebtClient(userId, inv.client, inv.clientPhone ?? '', inv.clientEmail ?? '');
  return invData;
};

export const updateInvoiceStatus = async (id: string, status: Invoice['status']) => {
  return supabase.from('invoices').update({ status }).eq('id', id);
};

export const updateInvoice = async (
  id: string,
  inv: Pick<Invoice, 'client' | 'clientNuit' | 'clientPhone' | 'clientEmail' | 'issueDate' | 'dueDate' | 'amount' | 'notes' | 'companyProfileId'>,
  items: DocumentItem[]
) => {
  const { error } = await supabase.from('invoices').update({
    client: inv.client,
    client_nuit: inv.clientNuit ?? null,
    client_phone: inv.clientPhone ?? null,
    client_email: inv.clientEmail ?? null,
    issue_date: inv.issueDate,
    due_date: inv.dueDate ?? null,
    amount: inv.amount,
    company_profile_id: inv.companyProfileId ?? 'primary',
    notes: inv.notes ?? null,
  }).eq('id', id);
  if (error) throw error;
  await supabase.from('invoice_items').delete().eq('invoice_id', id);
  if (items.length > 0) {
    await supabase.from('invoice_items').insert(
      items.map((item, i) => ({
        invoice_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        sort_order: i,
      }))
    );
  }
};

export const deleteInvoice = async (id: string) => {
  return supabase.from('invoices').delete().eq('id', id);
};

// ─── QUOTES ─────────────────────────────────────────────────────────────────

const mapQuote = (row: any): Quote => ({
  id: row.id,
  seqNumber: row.seq_number,
  quoteNumber: `COT-${fmt(row.seq_number)}`,
  client: row.client ?? '',
  clientNuit: row.client_nuit,
  clientPhone: row.client_phone,
  clientEmail: row.client_email,
  description: row.description,
  initials: getInitials(row.client ?? ''),
  issueDate: row.issue_date ?? '',
  validityDays: row.validity_days ?? 15,
  date: toDate(row.issue_date),
  datePt: toDatePt(row.issue_date),
  amount: parseFloat(row.amount) || 0,
  status: row.status,
  statusPt:
    row.status === 'Approved' ? 'Aprovado' :
    row.status === 'Rejected' ? 'Rejeitado' :
    row.status === 'Liquidado' ? 'Liquidado' : 'Pendente',
  logoBg: row.logo_bg ?? getAvatarColor(row.client ?? ''),
  items: (row.quote_items ?? []).map((it: any) => ({
    description: it.description ?? '',
    quantity: Number(it.quantity) || 0,
    unitPrice: parseFloat(it.unit_price) || 0,
  })),
  companyProfileId: row.company_profile_id ?? 'primary',
  notes: row.notes,
});

export const getQuotes = async (userId: string): Promise<Quote[]> => {
  const { data } = await supabase
    .from('quotes')
    .select('*, quote_items(*)')
    .eq('user_id', userId)
    .order('seq_number', { ascending: false });
  return (data ?? []).map(mapQuote);
};

export const createQuote = async (
  userId: string,
  qt: Omit<Quote, 'id' | 'seqNumber' | 'quoteNumber' | 'initials' | 'date' | 'datePt' | 'logoBg' | 'statusPt'>,
  items: DocumentItem[]
) => {
  const { data: qtData, error } = await supabase
    .from('quotes')
    .insert({
      user_id: userId,
      client: qt.client,
      client_nuit: qt.clientNuit,
      client_phone: qt.clientPhone,
      client_email: qt.clientEmail,
      description: qt.description,
      amount: qt.amount,
      status: qt.status,
      issue_date: qt.issueDate,
      validity_days: qt.validityDays,
      logo_bg: getAvatarColor(qt.client),
      company_profile_id: qt.companyProfileId ?? 'primary',
      notes: qt.notes,
    })
    .select()
    .single();
  if (error || !qtData) throw error;

  if (items.length > 0) {
    await supabase.from('quote_items').insert(
      items.map((item, i) => ({
        quote_id: qtData.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        sort_order: i,
      }))
    );
  }

  await upsertDebtClient(userId, qt.client, qt.clientPhone ?? '', qt.clientEmail ?? '');
  return qtData;
};

export const updateQuoteStatus = async (id: string, status: Quote['status']) => {
  return supabase.from('quotes').update({ status }).eq('id', id);
};

export const updateQuote = async (
  id: string,
  qt: Pick<Quote, 'client' | 'clientNuit' | 'clientPhone' | 'clientEmail' | 'issueDate' | 'validityDays' | 'amount' | 'notes' | 'companyProfileId'>,
  items: DocumentItem[]
) => {
  const { error } = await supabase.from('quotes').update({
    client: qt.client,
    client_nuit: qt.clientNuit ?? null,
    client_phone: qt.clientPhone ?? null,
    client_email: qt.clientEmail ?? null,
    issue_date: qt.issueDate,
    validity_days: qt.validityDays,
    amount: qt.amount,
    company_profile_id: qt.companyProfileId ?? 'primary',
    notes: qt.notes ?? null,
  }).eq('id', id);
  if (error) throw error;
  await supabase.from('quote_items').delete().eq('quote_id', id);
  if (items.length > 0) {
    await supabase.from('quote_items').insert(
      items.map((item, i) => ({
        quote_id: id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        sort_order: i,
      }))
    );
  }
};

export const deleteQuote = async (id: string) => {
  return supabase.from('quotes').delete().eq('id', id);
};

// ─── RECEIPTS ────────────────────────────────────────────────────────────────

const mapReceipt = (row: any): Receipt => ({
  id: row.id,
  seqNumber: row.seq_number,
  receiptNumber: `REC-${fmt(row.seq_number)}`,
  invoiceId: row.invoice_id,
  client: row.client ?? '',
  initials: getInitials(row.client ?? ''),
  paymentDate: row.payment_date ?? '',
  date: toDate(row.payment_date),
  datePt: toDatePt(row.payment_date),
  amount: parseFloat(row.amount) || 0,
  method: row.method ?? '',
  methodPt: row.method_pt ?? row.method ?? '',
  invoiceRef: row.invoice_ref ?? '',
  companyProfileId: row.company_profile_id ?? 'primary',
  notes: row.notes,
});

export const getReceipts = async (userId: string): Promise<Receipt[]> => {
  const { data } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .order('seq_number', { ascending: false });
  return (data ?? []).map(mapReceipt);
};

export const createReceipt = async (
  userId: string,
  rec: Pick<Receipt, 'client' | 'amount' | 'method' | 'methodPt' | 'paymentDate' | 'invoiceRef' | 'invoiceId' | 'companyProfileId' | 'notes'>
) => {
  const { data, error } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      invoice_id: rec.invoiceId,
      invoice_ref: rec.invoiceRef,
      client: rec.client,
      amount: rec.amount,
      method: rec.method,
      method_pt: rec.methodPt,
      payment_date: rec.paymentDate,
      company_profile_id: rec.companyProfileId ?? 'primary',
      notes: rec.notes,
    })
    .select()
    .single();
  if (error) throw error;

  if (rec.invoiceId) {
    await updateInvoiceStatus(rec.invoiceId, 'Paid');
    await decrementStockForInvoice(userId, rec.invoiceId);
    // cascade: settle client
    await supabase
      .from('debt_clients')
      .update({ status: 'Liquidado' })
      .eq('user_id', userId)
      .ilike('full_name', rec.client);
  }
  return data;
};

export const deleteReceipt = async (id: string) => {
  return supabase.from('receipts').delete().eq('id', id);
};

export const decrementStockForInvoice = async (userId: string, invoiceId: string): Promise<void> => {
  const { data: items } = await supabase
    .from('invoice_items')
    .select('description, quantity')
    .eq('invoice_id', invoiceId);
  if (!items || items.length === 0) return;
  for (const item of items) {
    if (!item.description || !(item.quantity > 0)) continue;
    const { data: stock } = await supabase
      .from('stock_items')
      .select('id, stock_level')
      .eq('user_id', userId)
      .ilike('name', item.description)
      .maybeSingle();
    if (stock) {
      await supabase
        .from('stock_items')
        .update({ stock_level: Math.max(0, (stock.stock_level ?? 0) - item.quantity) })
        .eq('id', stock.id);
    }
  }
};

// ─── STOCK ───────────────────────────────────────────────────────────────────

const mapStock = (row: any): StockItem => {
  const { status, statusPt } = calcStockStatus(row.stock_level, row.max_stock);
  return {
    id: row.id,
    name: row.name ?? '',
    sku: row.sku ?? '',
    category: row.category ?? '',
    categoryPt: row.category_pt ?? '',
    stockLevel: row.stock_level ?? 0,
    maxStock: row.max_stock ?? 0,
    price: parseFloat(row.price) || 0,
    status,
    statusPt,
    warehouse: row.warehouse ?? '',
    warehousePt: row.warehouse_pt ?? '',
  };
};

export const getStockItems = async (userId: string): Promise<StockItem[]> => {
  const { data } = await supabase
    .from('stock_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapStock);
};

export const createStockItem = async (userId: string, item: Omit<StockItem, 'id' | 'status' | 'statusPt'>) => {
  const { error } = await supabase.from('stock_items').insert({
    user_id: userId,
    name: item.name,
    sku: item.sku,
    category: item.category,
    category_pt: item.categoryPt,
    stock_level: item.stockLevel,
    max_stock: item.maxStock,
    price: item.price,
    warehouse: item.warehouse,
    warehouse_pt: item.warehousePt,
  });
  if (error) throw error;
};

export const updateStockItem = async (id: string, updates: Partial<Omit<StockItem, 'id' | 'status' | 'statusPt'>>) => {
  return supabase.from('stock_items').update({
    name: updates.name,
    sku: updates.sku,
    category: updates.category,
    category_pt: updates.categoryPt,
    stock_level: updates.stockLevel,
    max_stock: updates.maxStock,
    price: updates.price,
    warehouse: updates.warehouse,
    warehouse_pt: updates.warehousePt,
  }).eq('id', id);
};

export const deleteStockItem = async (id: string) => {
  return supabase.from('stock_items').delete().eq('id', id);
};

// ─── EXPENSES ────────────────────────────────────────────────────────────────

const mapExpense = (row: any): Expense => ({
  id: row.id,
  seqNumber: row.seq_number,
  ref: `EXP-${fmt(row.seq_number)}`,
  merchant: row.merchant ?? '',
  category: row.category ?? '',
  categoryPt: row.category_pt ?? '',
  amount: parseFloat(row.amount) || 0,
  expenseDate: row.expense_date ?? '',
  date: toDate(row.expense_date),
  datePt: toDatePt(row.expense_date),
  status: row.status,
  statusPt:
    row.status === 'Approved' ? 'Aprovado' :
    row.status === 'Rejected' ? 'Rejeitado' : 'Pendente',
  notes: row.notes,
  receiptImageUrl: row.receipt_image_url ?? undefined,
});

export const getExpenses = async (userId: string): Promise<Expense[]> => {
  const { data } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('seq_number', { ascending: false });
  return (data ?? []).map(mapExpense);
};

export const createExpense = async (userId: string, exp: {
  merchant: string; category: string; categoryPt: string;
  amount: number; expenseDate: string; notes?: string; status?: Expense['status'];
  receiptImageUrl?: string;
}) => {
  const { error } = await supabase.from('expenses').insert({
    user_id: userId,
    merchant: exp.merchant,
    category: exp.category,
    category_pt: exp.categoryPt,
    amount: exp.amount,
    expense_date: exp.expenseDate,
    notes: exp.notes,
    status: exp.status ?? 'Pending',
    receipt_image_url: exp.receiptImageUrl ?? null,
  });
  if (error) throw error;
};

export const updateExpenseStatus = async (id: string, status: Expense['status']) => {
  return supabase.from('expenses').update({ status }).eq('id', id);
};

export const deleteExpense = async (id: string) => {
  return supabase.from('expenses').delete().eq('id', id);
};

// ─── CONTACTS ────────────────────────────────────────────────────────────────

const mapContact = (row: any): Contact => ({
  id: row.id,
  name: row.name ?? '',
  email: row.email ?? '',
  phone: row.phone ?? '',
  company: row.company ?? '',
  role: row.role ?? '',
  rolePt: row.role_pt ?? row.role ?? '',
  avatarColor: row.avatar_color ?? getAvatarColor(row.name ?? ''),
});

export const getContacts = async (userId: string): Promise<Contact[]> => {
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapContact);
};

export const createContact = async (userId: string, c: Omit<Contact, 'id'>) => {
  const { error } = await supabase.from('contacts').insert({
    user_id: userId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    role: c.role,
    role_pt: c.rolePt,
    avatar_color: c.avatarColor,
  });
  if (error) throw error;
};

export const deleteContact = async (id: string) => {
  return supabase.from('contacts').delete().eq('id', id);
};

// ─── DEBT CLIENTS ────────────────────────────────────────────────────────────

const mapDebtClient = (row: any): DebtClient => ({
  id: row.id,
  fullName: row.full_name ?? '',
  movitelNumber: row.movitel_number ?? '',
  vodacomNumber: row.vodacom_number ?? '',
  email: row.email ?? '',
  address: row.address ?? '',
  status: row.status ?? 'Pendente',
  createdAt: row.created_at,
});

export const getDebtClients = async (userId: string): Promise<DebtClient[]> => {
  const { data } = await supabase
    .from('debt_clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []).map(mapDebtClient);
};

export const upsertDebtClient = async (
  userId: string, fullName: string, phone?: string, email?: string
) => {
  const { data: existing } = await supabase
    .from('debt_clients')
    .select('id')
    .eq('user_id', userId)
    .ilike('full_name', fullName)
    .maybeSingle();

  if (!existing) {
    await supabase.from('debt_clients').insert({
      user_id: userId,
      full_name: fullName,
      movitel_number: phone ?? '',
      vodacom_number: '',
      address: '',
      status: 'Pendente',
    });
  }
};

export const createDebtClient = async (userId: string, c: Omit<DebtClient, 'id' | 'createdAt'>) => {
  const { error } = await supabase.from('debt_clients').insert({
    user_id: userId,
    full_name: c.fullName,
    movitel_number: c.movitelNumber,
    vodacom_number: c.vodacomNumber,
    email: c.email,
    address: c.address,
    status: c.status,
  });
  if (error) throw error;
};

export const updateDebtClientStatus = async (id: string, status: DebtClient['status']) => {
  return supabase.from('debt_clients').update({ status }).eq('id', id);
};

export const deleteDebtClient = async (id: string) => {
  return supabase.from('debt_clients').delete().eq('id', id);
};

// ─── PROFILE ─────────────────────────────────────────────────────────────────

export const getProfile = async (userId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data;
};
