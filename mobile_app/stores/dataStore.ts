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

export const useDataStore = create<DataState>((set) => ({
  invoices: [],
  quotes: [],
  receipts: [],
  stockItems: [],
  expenses: [],
  contacts: [],
  debtClients: [],
  generalSales: [],
  loading: false,

  loadAll: async (userId) => {
    set({ loading: true });
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
      set({ invoices, quotes, receipts, stockItems, expenses, contacts, debtClients, generalSales, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadInvoices: async (userId) => {
    const invoices = await db.getInvoices(userId);
    set({ invoices });
  },
  loadQuotes: async (userId) => {
    const quotes = await db.getQuotes(userId);
    set({ quotes });
  },
  loadReceipts: async (userId) => {
    const receipts = await db.getReceipts(userId);
    set({ receipts });
  },
  loadStock: async (userId) => {
    const stockItems = await db.getStockItems(userId);
    set({ stockItems });
  },
  loadExpenses: async (userId) => {
    const expenses = await db.getExpenses(userId);
    set({ expenses });
  },
  loadContacts: async (userId) => {
    const contacts = await db.getContacts(userId);
    set({ contacts });
  },
  loadClients: async (userId) => {
    const debtClients = await db.getDebtClients(userId);
    set({ debtClients });
  },
  loadGeneralSales: async (userId) => {
    const generalSales = await db.getGeneralSales(userId);
    set({ generalSales });
  },
}));
