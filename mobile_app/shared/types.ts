export interface StockItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  categoryPt: string;
  stockLevel: number;
  maxStock: number;
  price: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  statusPt: 'Em Stock' | 'Stock Baixo' | 'Sem Stock';
  warehouse: string;
  warehousePt: string;
}

export interface DocumentItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  seqNumber: number;
  invoiceNumber: string;
  client: string;
  clientNuit?: string;
  clientPhone?: string;
  clientEmail?: string;
  description?: string;
  initials: string;
  issueDate: string;
  dueDate?: string;
  date: string;
  datePt: string;
  amount: number;
  status: 'Paid' | 'Pending' | 'Overdue';
  statusPt: 'Pago' | 'Pendente' | 'Vencido';
  logoBg: string;
  items?: DocumentItem[];
  companyProfileId?: 'primary' | 'secondary';
  notes?: string;
}

export interface Quote {
  id: string;
  seqNumber: number;
  quoteNumber: string;
  client: string;
  clientNuit?: string;
  clientPhone?: string;
  clientEmail?: string;
  description?: string;
  initials: string;
  issueDate: string;
  validityDays: number;
  date: string;
  datePt: string;
  amount: number;
  status: 'Approved' | 'Pending' | 'Rejected' | 'Liquidado';
  statusPt: 'Aprovado' | 'Pendente' | 'Rejeitado' | 'Liquidado';
  logoBg: string;
  items?: DocumentItem[];
  companyProfileId?: 'primary' | 'secondary';
  notes?: string;
}

export interface Receipt {
  id: string;
  seqNumber: number;
  receiptNumber: string;
  invoiceId?: string;
  client: string;
  initials: string;
  paymentDate: string;
  date: string;
  datePt: string;
  amount: number;
  method: string;
  methodPt: string;
  invoiceRef: string;
  companyProfileId?: 'primary' | 'secondary';
  notes?: string;
}

export interface Expense {
  id: string;
  seqNumber: number;
  ref: string;
  merchant: string;
  category: string;
  categoryPt: string;
  amount: number;
  expenseDate: string;
  date: string;
  datePt: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  statusPt: 'Aprovado' | 'Pendente' | 'Rejeitado';
  notes?: string;
  receiptImageUrl?: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  rolePt: string;
  avatarColor: string;
}

export type PaymentMethod = 'Físico' | 'M-Pesa' | 'E-mola' | 'Banco';

export interface GeneralSale {
  id: string;
  seqNumber: number;
  ref: string;
  productId?: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  saleDate: string;
  date: string;
  datePt: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
}

export interface DebtClient {
  id: string;
  fullName: string;
  movitelNumber: string;
  vodacomNumber: string;
  email?: string;
  address: string;
  status: 'Pendente' | 'Liquidado';
  createdAt?: string;
}

export interface BankAccount {
  bank: string;
  iban: string;
}

export interface MobileContact {
  provider: string;
  number: string;
}

export interface SecondaryCompany {
  companyName: string;
  nuit: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logoBase64?: string;
  stampBase64?: string;
  bankAccounts: BankAccount[];
  mobileContacts: MobileContact[];
}

export interface CompanySettings {
  id?: string;
  userId?: string;
  companyName: string;
  nuit: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  logoBase64?: string;
  stampBase64?: string;
  bankAccounts: BankAccount[];
  mobileContacts: MobileContact[];
  setupComplete: boolean;
  secondaryCompany?: SecondaryCompany | null;
}

export type Language = 'en' | 'pt';
