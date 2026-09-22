import { create } from 'zustand';
import type { Invoice, Quote, Receipt, StockItem, Expense, Contact, DebtClient, GeneralSale } from '../shared/types';
import * as db from '../lib/db';

interface DataState {
  invoices: Invoice[];
  quotes: Quote[];
  receipts: Receipt[];
  stockItems: StockItem[];
  expenses: Expense[];
  contacts: Contact[];
  debtClients: DebtClient[];
  generalSales: GeneralSale[];
  loading: boolean;
  ready: boolean;
  error: string | null;
  ownerId: string | null;
  reset: () => void;

  loadAll: (userId: string) => Promise<void>;
  loadInvoices: (userId: string) => Promise<void>;
  loadQuotes: (userId: string) => Promise<void>;
  loadReceipts: (userId: string) => Promise<void>;
  loadStock: (userId: string) => Promise<void>;
  loadExpenses: (userId: string) => Promise<void>;
  loadContacts: (userId: string) => Promise<void>;
  loadClients: (userId: string) => Promise<void>;
  loadGeneralSales: (userId: string) => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  invoices: [],
  quotes: [],
  receipts: [],
  stockItems: [],
  expenses: [],
  contacts: [],
  debtClients: [],
  generalSales: [],
  loading: false,
  ready: false,
  error: null,
  ownerId: null,
  reset: () => set({ invoices: [], quotes: [], receipts: [], stockItems: [], expenses: [], contacts: [], debtClients: [], generalSales: [], ready: false, error: null, ownerId: null }),

  loadAll: async (userId) => {
    set({ loading: true, error: null, ownerId: userId });
    try {
      const [invoices, quotes, receipts, stockItems, expenses, contacts, debtClients, generalSales] =
        await Promise.all([
          db.getInvoices(userId),
          db.getQuotes(userId),
          db.getReceipts(userId),
          db.getStockItems(userId),
          db.getExpenses(userId),
          db.getContacts(userId),
          db.getDebtClients(userId),
          db.getGeneralSales(userId),
        ]);
      if (get().ownerId === userId) set({ invoices, quotes, receipts, stockItems, expenses, contacts, debtClients, generalSales, loading: false, ready: true });
    } catch {
      if (get().ownerId === userId) set({ loading: false, error: 'Não foi possível carregar os dados completos. Tente novamente.' });
    }
  },

  loadInvoices: async (userId) => {
    try {
    const invoices = await db.getInvoices(userId);
    if (get().ownerId === userId) set({ invoices });
    } catch {
      if (get().ownerId === userId) set({ error: 'Dados desactualizados. Recarregue para continuar.' });
    }
  },
  loadQuotes: async (userId) => {
    try {
    const quotes = await db.getQuotes(userId);
    if (get().ownerId === userId) set({ quotes });
    } catch {
      if (get().ownerId === userId) set({ error: 'Dados desactualizados. Recarregue para continuar.' });
    }
  },
  loadReceipts: async (userId) => {
    try {
    const receipts = await db.getReceipts(userId);
    if (get().ownerId === userId) set({ receipts });
    } catch {
      if (get().ownerId === userId) set({ error: 'Dados desactualizados. Recarregue para continuar.' });
    }
  },
  loadStock: async (userId) => {
    try {
    const stockItems = await db.getStockItems(userId);
    if (get().ownerId === userId) set({ stockItems });
    } catch {
      if (get().ownerId === userId) set({ error: 'Dados desactualizados. Recarregue para continuar.' });
    }
  },
  loadExpenses: async (userId) => {
    try {
    const expenses = await db.getExpenses(userId);
    if (get().ownerId === userId) set({ expenses });
    } catch {
      if (get().ownerId === userId) set({ error: 'Dados desactualizados. Recarregue para continuar.' });
    }
  },
  loadContacts: async (userId) => {
    try {
    const contacts = await db.getContacts(userId);
    if (get().ownerId === userId) set({ contacts });
    } catch {
      if (get().ownerId === userId) set({ error: 'Dados desactualizados. Recarregue para continuar.' });
    }
  },
  loadClients: async (userId) => {
    try {
    const debtClients = await db.getDebtClients(userId);
    if (get().ownerId === userId) set({ debtClients });
    } catch {
      if (get().ownerId === userId) set({ error: 'Dados desactualizados. Recarregue para continuar.' });
    }
  },
  loadGeneralSales: async (userId) => {
    try {
    const generalSales = await db.getGeneralSales(userId);
    if (get().ownerId === userId) set({ generalSales });
    } catch {
      if (get().ownerId === userId) set({ error: 'Dados desactualizados. Recarregue para continuar.' });
    }
  },
}));
