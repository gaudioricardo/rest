/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase } from './supabase';
import { Invoice, Quote, Receipt, Expense, StockItem, Contact, DocumentItem, CompanySettings, BankAccount, MobileContact } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Format a sequential number into document reference, e.g. "INV-0001" */
export function formatDocNumber(prefix: string, seqNumber: number): string {
  return `${prefix}-${String(seqNumber).padStart(4, '0')}`;
}

/** Check whether a document with the given seq_number already exists for a user */
export async function checkDocumentExists(
  table: string,
  seqNumber: number,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('seq_number', seqNumber)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return false;
    return data !== null;
  } catch {
    return false;
  }
}

// ─── Locale helpers ─────────────────────────────────────────────────────────

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

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
}

// ─── Mapper functions ────────────────────────────────────────────────────────

export function mapInvoice(row: Record<string, unknown>): Invoice {
  const seqNumber = row.seq_number as number;
  const issueDate = (row.issue_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    invoiceNumber: formatDocNumber('INV', seqNumber),
    client: row.client as string,
    clientNuit: (row.client_nuit as string | undefined) ?? undefined,
    description: (row.description as string | undefined) ?? undefined,
    initials: getInitials(row.client as string),
    issueDate,
    dueDate: (row.due_date as string | undefined) ?? undefined,
    date: formatDateEn(issueDate),
    datePt: formatDatePt(issueDate),
    amount: parseFloat(String(row.amount)),
    status: row.status as Invoice['status'],
    statusPt:
      row.status === 'Paid' ? 'Pago' :
      row.status === 'Pending' ? 'Pendente' : 'Vencido',
    logoBg: (row.logo_bg as string) ?? 'bg-emerald-50 text-emerald-800 border border-emerald-500',
  };
}

export function mapQuote(row: Record<string, unknown>): Quote {
  const seqNumber = row.seq_number as number;
  const issueDate = (row.issue_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    quoteNumber: formatDocNumber('QT', seqNumber),
    client: row.client as string,
    clientNuit: (row.client_nuit as string | undefined) ?? undefined,
    description: (row.description as string | undefined) ?? undefined,
    initials: getInitials(row.client as string),
    issueDate,
    validityDays: (row.validity_days as number) ?? 15,
    date: formatDateEn(issueDate),
    datePt: formatDatePt(issueDate),
    amount: parseFloat(String(row.amount)),
    status: row.status as Quote['status'],
    statusPt:
      row.status === 'Approved' ? 'Aprovado' :
      row.status === 'Pending' ? 'Pendente' : 'Rejeitado',
    logoBg: (row.logo_bg as string) ?? 'bg-amber-100 text-amber-800',
  };
}

export function mapReceipt(row: Record<string, unknown>): Receipt {
  const seqNumber = row.seq_number as number;
  const paymentDate = (row.payment_date as string) ?? todayIso();
  return {
    id: row.id as string,
    seqNumber,
    receiptNumber: formatDocNumber('REC', seqNumber),
    invoiceId: (row.invoice_id as string | undefined) ?? undefined,
    client: row.client as string,
    initials: getInitials(row.client as string),
    paymentDate,
    date: formatDateEn(paymentDate),
    datePt: formatDatePt(paymentDate),
    amount: parseFloat(String(row.amount)),
    method: row.method as string,
    methodPt: row.method_pt as string,
    invoiceRef: (row.invoice_ref as string) ?? '',
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
    categoryPt: row.category_pt as string,
    amount: parseFloat(String(row.amount)),
    expenseDate,
    date: formatDateEn(expenseDate),
    datePt: formatDatePt(expenseDate),
    status: row.status as Expense['status'],
    statusPt:
      row.status === 'Approved' ? 'Aprovado' :
      row.status === 'Pending' ? 'Pendente' : 'Rejeitado',
    notes: (row.notes as string | undefined) ?? undefined,
  };
}

export function mapStockItem(row: Record<string, unknown>): StockItem {
  const level = row.stock_level as number;
  const max = row.max_stock as number;
  let status: StockItem['status'] = 'In Stock';
  let statusPt: StockItem['statusPt'] = 'Em Stock';
  if (level === 0) { status = 'Out of Stock'; statusPt = 'Sem Stock'; }
  else if (level <= max * 0.35) { status = 'Low Stock'; statusPt = 'Stock Baixo'; }
  return {
    id: row.id as string,
    name: row.name as string,
    sku: row.sku as string,
    category: row.category as string,
    categoryPt: row.category_pt as string,
    stockLevel: level,
    maxStock: max,
    price: parseFloat(String(row.price)),
    status,
    statusPt,
    warehouse: row.warehouse as string,
    warehousePt: row.warehouse_pt as string,
  };
}

export function mapContact(row: Record<string, unknown>): Contact {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    phone: (row.phone as string) ?? '',
    company: row.company as string,
    role: row.role as string,
    rolePt: (row.role_pt as string) ?? (row.role as string),
    avatarColor: (row.avatar_color as string) ?? 'bg-indigo-600',
  };
}

// ─── Invoice CRUD ────────────────────────────────────────────────────────────

export async function fetchInvoices(userId: string): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('seq_number', { ascending: false });
    if (error || !data) return [];
    return data.map(mapInvoice);
  } catch {
    return [];
  }
}

export async function createInvoice(payload: {
  userId: string;
  client: string;
  clientNuit?: string;
  description?: string;
  amount: number;
  status: Invoice['status'];
  issueDate: string;
  dueDate?: string;
  logoBg?: string;
}): Promise<Invoice | null> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        user_id: payload.userId,
        client: payload.client,
        client_nuit: payload.clientNuit ?? null,
        description: payload.description ?? null,
        amount: payload.amount,
        status: payload.status,
        issue_date: payload.issueDate,
        due_date: payload.dueDate ?? null,
        logo_bg: payload.logoBg ?? 'bg-emerald-50 text-emerald-800 border border-emerald-500',
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapInvoice(data);
  } catch {
    return null;
  }
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ status })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteInvoice(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── Quote CRUD ──────────────────────────────────────────────────────────────

export async function fetchQuotes(userId: string): Promise<Quote[]> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('user_id', userId)
      .order('seq_number', { ascending: false });
    if (error || !data) return [];
    return data.map(mapQuote);
  } catch {
    return [];
  }
}

export async function createQuote(payload: {
  userId: string;
  client: string;
  clientNuit?: string;
  description?: string;
  amount: number;
  issueDate: string;
  validityDays?: number;
  logoBg?: string;
}): Promise<Quote | null> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .insert({
        user_id: payload.userId,
        client: payload.client,
        client_nuit: payload.clientNuit ?? null,
        description: payload.description ?? null,
        amount: payload.amount,
        status: 'Pending',
        issue_date: payload.issueDate,
        validity_days: payload.validityDays ?? 15,
        logo_bg: payload.logoBg ?? 'bg-amber-100 text-amber-800',
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapQuote(data);
  } catch {
    return null;
  }
}

export async function updateQuoteStatus(id: string, status: Quote['status']): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('quotes')
      .update({ status })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── Receipt CRUD ────────────────────────────────────────────────────────────

export async function fetchReceipts(userId: string): Promise<Receipt[]> {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .select('*')
      .eq('user_id', userId)
      .order('seq_number', { ascending: false });
    if (error || !data) return [];
    return data.map(mapReceipt);
  } catch {
    return [];
  }
}

export async function createReceipt(payload: {
  userId: string;
  invoiceId?: string;
  invoiceRef: string;
  client: string;
  amount: number;
  method: string;
  methodPt: string;
  paymentDate: string;
}): Promise<Receipt | null> {
  try {
    const { data, error } = await supabase
      .from('receipts')
      .insert({
        user_id: payload.userId,
        invoice_id: payload.invoiceId ?? null,
        invoice_ref: payload.invoiceRef,
        client: payload.client,
        amount: payload.amount,
        method: payload.method,
        method_pt: payload.methodPt,
        payment_date: payload.paymentDate,
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapReceipt(data);
  } catch {
    return null;
  }
}

// ─── Expense CRUD ────────────────────────────────────────────────────────────

export async function fetchExpenses(userId: string): Promise<Expense[]> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('seq_number', { ascending: false });
    if (error || !data) return [];
    return data.map(mapExpense);
  } catch {
    return [];
  }
}

export async function createExpense(payload: {
  userId: string;
  merchant: string;
  category: string;
  categoryPt: string;
  amount: number;
  expenseDate: string;
  notes?: string;
}): Promise<Expense | null> {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: payload.userId,
        merchant: payload.merchant,
        category: payload.category,
        category_pt: payload.categoryPt,
        amount: payload.amount,
        expense_date: payload.expenseDate,
        status: 'Pending',
        notes: payload.notes ?? null,
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapExpense(data);
  } catch {
    return null;
  }
}

export async function updateExpenseStatus(id: string, status: Expense['status']): Promise<boolean> {
  try {
    const { error } = await supabase.from('expenses').update({ status }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── StockItem CRUD ──────────────────────────────────────────────────────────

export async function fetchStockItems(userId: string): Promise<StockItem[]> {
  try {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapStockItem);
  } catch {
    return [];
  }
}

export async function createStockItem(payload: {
  userId: string;
  name: string;
  sku: string;
  category: string;
  categoryPt: string;
  stockLevel: number;
  maxStock: number;
  price: number;
  warehouse: string;
  warehousePt: string;
}): Promise<StockItem | null> {
  try {
    const { data, error } = await supabase
      .from('stock_items')
      .insert({
        user_id: payload.userId,
        name: payload.name,
        sku: payload.sku.toUpperCase(),
        category: payload.category,
        category_pt: payload.categoryPt,
        stock_level: payload.stockLevel,
        max_stock: payload.maxStock,
        price: payload.price,
        warehouse: payload.warehouse,
        warehouse_pt: payload.warehousePt,
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapStockItem(data);
  } catch {
    return null;
  }
}

export async function updateStockLevel(id: string, stockLevel: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('stock_items')
      .update({ stock_level: stockLevel })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── Contact CRUD ────────────────────────────────────────────────────────────

export async function fetchContacts(userId: string): Promise<Contact[]> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data.map(mapContact);
  } catch {
    return [];
  }
}

export async function createContact(payload: {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  role: string;
  rolePt?: string;
  avatarColor?: string;
}): Promise<Contact | null> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        user_id: payload.userId,
        name: payload.name,
        email: payload.email,
        phone: payload.phone ?? '',
        company: payload.company,
        role: payload.role,
        role_pt: payload.rolePt ?? payload.role,
        avatar_color: payload.avatarColor ?? 'bg-indigo-600',
      })
      .select()
      .single();
    if (error || !data) return null;
    return mapContact(data);
  } catch {
    return null;
  }
}

export async function deleteContact(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// ─── DocumentItem CRUD ───────────────────────────────────────────────────────

export async function createInvoiceItems(invoiceId: string, items: DocumentItem[]): Promise<boolean> {
  try {
    const rows = items.map((it, i) => ({
      invoice_id: invoiceId,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      sort_order: i,
    }));
    const { error } = await supabase.from('invoice_items').insert(rows);
    return !error;
  } catch { return false; }
}

export async function fetchInvoiceItems(invoiceId: string): Promise<DocumentItem[]> {
  try {
    const { data, error } = await supabase
      .from('invoice_items').select('*').eq('invoice_id', invoiceId).order('sort_order');
    if (error || !data) return [];
    return data.map(r => ({ id: r.id, description: r.description, quantity: Number(r.quantity), unitPrice: Number(r.unit_price) }));
  } catch { return []; }
}

export async function createQuoteItems(quoteId: string, items: DocumentItem[]): Promise<boolean> {
  try {
    const rows = items.map((it, i) => ({
      quote_id: quoteId,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      sort_order: i,
    }));
    const { error } = await supabase.from('quote_items').insert(rows);
    return !error;
  } catch { return false; }
}

export async function fetchQuoteItems(quoteId: string): Promise<DocumentItem[]> {
  try {
    const { data, error } = await supabase
      .from('quote_items').select('*').eq('quote_id', quoteId).order('sort_order');
    if (error || !data) return [];
    return data.map(r => ({ id: r.id, description: r.description, quantity: Number(r.quantity), unitPrice: Number(r.unit_price) }));
  } catch { return []; }
}

// ─── CompanySettings CRUD ────────────────────────────────────────────────────

export function mapSettings(row: Record<string, unknown>): CompanySettings {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    companyName: (row.company_name as string) ?? '',
    nuit: (row.nuit as string) ?? '',
    address: (row.address as string) ?? '',
    city: (row.city as string) ?? '',
    phone: (row.phone as string) ?? '',
    email: (row.email as string) ?? '',
    logoBase64: row.logo_base64 as string | undefined,
    stampBase64: row.stamp_base64 as string | undefined,
    bankAccounts: (row.bank_accounts as BankAccount[]) ?? [],
    mobileContacts: (row.mobile_contacts as MobileContact[]) ?? [],
    setupComplete: (row.setup_complete as boolean) ?? false,
  };
}

export async function fetchCompanySettings(userId: string): Promise<CompanySettings | null> {
  try {
    const { data, error } = await supabase
      .from('company_settings').select('*').eq('user_id', userId).maybeSingle();
    if (error || !data) return null;
    return mapSettings(data);
  } catch { return null; }
}

export async function upsertCompanySettings(userId: string, settings: Partial<CompanySettings>): Promise<CompanySettings | null> {
  try {
    const payload: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };
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

    const { data, error } = await supabase
      .from('company_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select().single();
    if (error || !data) return null;
    return mapSettings(data);
  } catch { return null; }
}
