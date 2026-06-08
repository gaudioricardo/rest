import { supabase } from '../lib/supabase';
import {
  Invoice, Quote, Receipt, Expense, StockItem, Contact,
  DocumentItem, CompanySettings, DebtClient,
} from './types';

export function formatDocNumber(prefix: string, seqNumber: number): string {
  return `${prefix}-${String(seqNumber).padStart(4, '0')}`;
}

function formatDateEn(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDatePt(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}

export function mapInvoice(row: Record<string, unknown>): Invoice {
  const seqNumber = row.seq_number as number;
  const issueDate = (row.issue_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    invoiceNumber: formatDocNumber('INV', seqNumber),
    client: row.client as string,
    clientNuit: (row.client_nuit as string) ?? undefined,
    clientPhone: (row.client_phone as string) ?? undefined,
    clientEmail: (row.client_email as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    initials: getInitials(row.client as string),
    issueDate,
    dueDate: (row.due_date as string) ?? undefined,
    date: formatDateEn(issueDate),
    datePt: formatDatePt(issueDate),
    amount: parseFloat(String(row.amount)),
    status: row.status as Invoice['status'],
    statusPt:
      row.status === 'Paid' ? 'Pago' :
      row.status === 'Pending' ? 'Pendente' : 'Vencido',
    logoBg: (row.logo_bg as string) ?? '',
    companyProfileId: (row.company_profile_id as string) === 'secondary' ? 'secondary' : 'primary',
    notes: (row.notes as string) ?? undefined,
  };
}

export function mapQuote(row: Record<string, unknown>): Quote {
  const seqNumber = row.seq_number as number;
  const issueDate = (row.issue_date as string) ?? todayIso();
  const statusRaw = row.status as string;
  return {
    id: row.id as string,
    seqNumber,
    quoteNumber: formatDocNumber('QT', seqNumber),
    client: row.client as string,
    clientNuit: (row.client_nuit as string) ?? undefined,
    clientPhone: (row.client_phone as string) ?? undefined,
    clientEmail: (row.client_email as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    initials: getInitials(row.client as string),
    issueDate,
    validityDays: (row.validity_days as number) ?? 15,
    date: formatDateEn(issueDate),
    datePt: formatDatePt(issueDate),
    amount: parseFloat(String(row.amount)),
    status: statusRaw as Quote['status'],
    statusPt:
      statusRaw === 'Approved' ? 'Aprovado' :
      statusRaw === 'Rejected' ? 'Rejeitado' :
      statusRaw === 'Liquidado' ? 'Liquidado' : 'Pendente',
    logoBg: (row.logo_bg as string) ?? '',
    companyProfileId: (row.company_profile_id as string) === 'secondary' ? 'secondary' : 'primary',
    notes: (row.notes as string) ?? undefined,
  };
}

export function mapReceipt(row: Record<string, unknown>): Receipt {
  const seqNumber = row.seq_number as number;
  const paymentDate = (row.payment_date as string) ?? todayIso();
  const method = (row.payment_method as string) ?? 'Cash';
  const methodMap: Record<string, string> = {
    Cash: 'Dinheiro', 'Bank Transfer': 'Transferência', 'M-Pesa': 'M-Pesa',
    'E-Mola': 'E-Mola', Movitel: 'Movitel', Vodacom: 'Vodacom',
  };
  return {
    id: row.id as string,
    seqNumber,
    receiptNumber: formatDocNumber('REC', seqNumber),
    invoiceId: (row.invoice_id as string) ?? undefined,
    client: row.client as string,
    initials: getInitials(row.client as string),
    paymentDate,
    date: formatDateEn(paymentDate),
    datePt: formatDatePt(paymentDate),
    amount: parseFloat(String(row.amount)),
    method,
    methodPt: methodMap[method] ?? method,
    invoiceRef: (row.invoice_ref as string) ?? '',
    companyProfileId: (row.company_profile_id as string) === 'secondary' ? 'secondary' : 'primary',
    notes: (row.notes as string) ?? undefined,
  };
}

export function mapExpense(row: Record<string, unknown>): Expense {
  const seqNumber = row.seq_number as number;
  const expenseDate = (row.expense_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    ref: formatDocNumber('EXP', seqNumber),
    merchant: row.merchant as string,
    category: row.category as string,
    categoryPt: (row.category_pt as string) ?? row.category as string,
    amount: parseFloat(String(row.amount)),
    expenseDate,
    date: formatDateEn(expenseDate),
    datePt: formatDatePt(expenseDate),
    status: row.status as Expense['status'],
    statusPt:
      row.status === 'Approved' ? 'Aprovado' :
      row.status === 'Rejected' ? 'Rejeitado' : 'Pendente',
    notes: (row.notes as string) ?? undefined,
  };
}

export function mapStock(row: Record<string, unknown>): StockItem {
  const stockLevel = row.stock_level as number;
  const maxStock = (row.max_stock as number) ?? 100;
  let status: StockItem['status'] = 'In Stock';
  let statusPt: StockItem['statusPt'] = 'Em Stock';
  if (stockLevel === 0) { status = 'Out of Stock'; statusPt = 'Sem Stock'; }
  else if (stockLevel < maxStock * 0.2) { status = 'Low Stock'; statusPt = 'Stock Baixo'; }
  return {
    id: row.id as string,
    name: row.name as string,
    sku: row.sku as string,
    category: row.category as string,
    categoryPt: (row.category_pt as string) ?? row.category as string,
    stockLevel,
    maxStock,
    price: parseFloat(String(row.price)),
    status, statusPt,
    warehouse: (row.warehouse as string) ?? '',
    warehousePt: (row.warehouse_pt as string) ?? (row.warehouse as string) ?? '',
  };
}

export function mapDebtClient(row: Record<string, unknown>): DebtClient {
  return {
    id: row.id as string,
    fullName: row.full_name as string,
    movitelNumber: (row.movitel_number as string) ?? '',
    vodacomNumber: (row.vodacom_number as string) ?? '',
    email: (row.email as string) ?? undefined,
    address: (row.address as string) ?? '',
    status: row.status as DebtClient['status'],
    createdAt: (row.created_at as string) ?? undefined,
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function fetchInvoices(userId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('user_id', userId)
    .order('seq_number', { ascending: false });
  if (error || !data) return [];
  return data.map(row => {
    const inv = mapInvoice(row as Record<string, unknown>);
    inv.items = ((row.invoice_items as unknown[]) ?? []).map((item) => item as DocumentItem);
    return inv;
  });
}

export async function fetchQuotes(userId: string): Promise<Quote[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, quote_items(*)')
    .eq('user_id', userId)
    .order('seq_number', { ascending: false });
  if (error || !data) return [];
  return data.map(row => {
    const q = mapQuote(row as Record<string, unknown>);
    q.items = ((row.quote_items as unknown[]) ?? []).map((item) => item as DocumentItem);
    return q;
  });
}

export async function fetchReceipts(userId: string): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('user_id', userId)
    .order('seq_number', { ascending: false });
  if (error || !data) return [];
  return data.map(row => mapReceipt(row as Record<string, unknown>));
}

export async function fetchExpenses(userId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .order('seq_number', { ascending: false });
  if (error || !data) return [];
  return data.map(row => mapExpense(row as Record<string, unknown>));
}

export async function fetchStock(userId: string): Promise<StockItem[]> {
  const { data, error } = await supabase
    .from('stock_items')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });
  if (error || !data) return [];
  return data.map(row => mapStock(row as Record<string, unknown>));
}

export async function fetchDebtClients(userId: string): Promise<DebtClient[]> {
  const { data, error } = await supabase
    .from('debt_clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(row => mapDebtClient(row as Record<string, unknown>));
}

export async function fetchCompanySettings(userId: string): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    userId: row.user_id as string,
    companyName: (row.company_name as string) ?? '',
    nuit: (row.nuit as string) ?? '',
    address: (row.address as string) ?? '',
    city: (row.city as string) ?? '',
    phone: (row.phone as string) ?? '',
    email: (row.email as string) ?? '',
    logoBase64: (row.logo_base64 as string) ?? undefined,
    stampBase64: (row.stamp_base64 as string) ?? undefined,
    bankAccounts: JSON.parse(String(row.bank_accounts ?? '[]')),
    mobileContacts: JSON.parse(String(row.mobile_contacts ?? '[]')),
    setupComplete: Boolean(row.setup_complete),
    secondaryCompany: row.secondary_company
      ? (typeof row.secondary_company === 'string'
        ? JSON.parse(row.secondary_company)
        : row.secondary_company)
      : null,
  };
}

export async function getNextSeqNumber(table: string, userId: string): Promise<number> {
  const { data } = await supabase
    .from(table)
    .select('seq_number')
    .eq('user_id', userId)
    .order('seq_number', { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return 1;
  return (data[0].seq_number as number) + 1;
}

export async function markInvoicePaid(
  invoiceId: string,
  method: string,
  userId: string,
  invoiceNumber: string,
  client: string,
  amount: number,
): Promise<Receipt | null> {
  const { error: upErr } = await supabase
    .from('invoices')
    .update({ status: 'Paid' })
    .eq('id', invoiceId);
  if (upErr) return null;

  const seq = await getNextSeqNumber('receipts', userId);
  const methodMap: Record<string, string> = {
    Cash: 'Dinheiro', 'Bank Transfer': 'Transferência',
    'M-Pesa': 'M-Pesa', 'E-Mola': 'E-Mola', Movitel: 'Movitel', Vodacom: 'Vodacom',
  };
  const today = todayIso();
  const { data: recData, error: recErr } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      seq_number: seq,
      invoice_id: invoiceId,
      invoice_ref: invoiceNumber,
      client,
      amount,
      payment_method: method,
      payment_date: today,
    })
    .select()
    .single();
  if (recErr || !recData) return null;

  await supabase
    .from('debt_clients')
    .update({ status: 'Liquidado' })
    .eq('user_id', userId)
    .ilike('full_name', client);

  return mapReceipt(recData as Record<string, unknown>);
}
