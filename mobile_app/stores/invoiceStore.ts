import { create } from 'zustand';
import { Invoice, Quote, Receipt } from '../shared/types';
import { fetchInvoices, fetchQuotes, fetchReceipts, markInvoicePaid } from '../shared/db';
import { supabase } from '../lib/supabase';

interface InvoiceState {
  invoices: Invoice[];
  quotes: Quote[];
  receipts: Receipt[];
  loading: boolean;
  loadAll: (userId: string) => Promise<void>;
  markPaid: (invoiceId: string, method: string, userId: string) => Promise<Receipt | null>;
  subscribeRealtime: (userId: string) => () => void;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  quotes: [],
  receipts: [],
  loading: false,

  loadAll: async (userId) => {
    set({ loading: true });
    const [invoices, quotes, receipts] = await Promise.all([
      fetchInvoices(userId),
      fetchQuotes(userId),
      fetchReceipts(userId),
    ]);
    set({ invoices, quotes, receipts, loading: false });
  },

  markPaid: async (invoiceId, method, userId) => {
    const inv = get().invoices.find(i => i.id === invoiceId);
    if (!inv) return null;
    const receipt = await markInvoicePaid(invoiceId, method, userId, inv.invoiceNumber, inv.client, inv.amount);
    if (receipt) {
      set(state => ({
        invoices: state.invoices.map(i => i.id === invoiceId ? { ...i, status: 'Paid', statusPt: 'Pago' } : i),
        receipts: [receipt, ...state.receipts],
      }));
    }
    return receipt;
  },

  subscribeRealtime: (userId) => {
    const channel = supabase
      .channel('documents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices', filter: `user_id=eq.${userId}` },
        () => get().loadAll(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes', filter: `user_id=eq.${userId}` },
        () => get().loadAll(userId))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'receipts', filter: `user_id=eq.${userId}` },
        () => get().loadAll(userId))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
}));
