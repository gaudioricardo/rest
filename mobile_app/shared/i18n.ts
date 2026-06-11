export type Language = 'en' | 'pt';

export const t = (lang: Language, en: string, pt: string): string =>
  lang === 'pt' ? pt : en;

export const translations = {
  // Navigation
  dashboard: { en: 'Dashboard', pt: 'Painel' },
  invoices: { en: 'Invoices', pt: 'Facturas' },
  quotes: { en: 'Quotes', pt: 'Orçamentos' },
  receipts: { en: 'Receipts', pt: 'Recibos' },
  clients: { en: 'Clients', pt: 'Clientes' },
  stock: { en: 'Stock', pt: 'Stock' },
  expenses: { en: 'Expenses', pt: 'Despesas' },
  contacts: { en: 'Contacts', pt: 'Contactos' },
  settings: { en: 'Settings', pt: 'Configurações' },
  more: { en: 'More', pt: 'Mais' },

  // Common
  save: { en: 'Save', pt: 'Guardar' },
  cancel: { en: 'Cancel', pt: 'Cancelar' },
  delete: { en: 'Delete', pt: 'Eliminar' },
  edit: { en: 'Edit', pt: 'Editar' },
  add: { en: 'Add', pt: 'Adicionar' },
  search: { en: 'Search...', pt: 'Pesquisar...' },
  confirm: { en: 'Confirm', pt: 'Confirmar' },
  close: { en: 'Close', pt: 'Fechar' },
  loading: { en: 'Loading...', pt: 'A carregar...' },
  error: { en: 'Error', pt: 'Erro' },
  success: { en: 'Success', pt: 'Sucesso' },
  noData: { en: 'No records found', pt: 'Nenhum registo encontrado' },
  exportPdf: { en: 'Export PDF', pt: 'Exportar PDF' },
  newDoc: { en: 'New', pt: 'Novo' },

  // Auth
  login: { en: 'Sign In', pt: 'Entrar' },
  signup: { en: 'Sign Up', pt: 'Registar' },
  email: { en: 'Email', pt: 'Email' },
  password: { en: 'Password', pt: 'Senha' },
  fullName: { en: 'Full Name', pt: 'Nome Completo' },
  loginError: { en: 'Invalid credentials', pt: 'Credenciais inválidas' },
  welcomeBack: { en: 'Welcome back!', pt: 'Bem-vindo!' },
  noAccount: { en: "Don't have an account?", pt: 'Não tem conta?' },
  hasAccount: { en: 'Already have an account?', pt: 'Já tem conta?' },

  // Invoice
  invoice: { en: 'Invoice', pt: 'Factura' },
  newInvoice: { en: 'New Invoice', pt: 'Nova Factura' },
  invoiceNumber: { en: 'Invoice #', pt: 'Nº Factura' },
  issueDate: { en: 'Issue Date', pt: 'Data Emissão' },
  dueDate: { en: 'Due Date', pt: 'Data Vencimento' },
  markPaid: { en: 'Mark as Paid', pt: 'Marcar como Pago' },
  paid: { en: 'Paid', pt: 'Pago' },
  pending: { en: 'Pending', pt: 'Pendente' },
  overdue: { en: 'Overdue', pt: 'Vencido' },

  // Quote
  quote: { en: 'Quote', pt: 'Orçamento' },
  newQuote: { en: 'New Quote', pt: 'Novo Orçamento' },
  validityDays: { en: 'Validity (days)', pt: 'Validade (dias)' },
  approved: { en: 'Approved', pt: 'Aprovado' },
  rejected: { en: 'Rejected', pt: 'Rejeitado' },
  liquidado: { en: 'Settled', pt: 'Liquidado' },

  // Receipt
  receipt: { en: 'Receipt', pt: 'Recibo' },
  newReceipt: { en: 'New Receipt', pt: 'Novo Recibo' },
  paymentDate: { en: 'Payment Date', pt: 'Data Pagamento' },
  paymentMethod: { en: 'Payment Method', pt: 'Método de Pagamento' },
  invoiceRef: { en: 'Invoice Ref.', pt: 'Ref. Factura' },
  bankTransfer: { en: 'Bank Transfer', pt: 'Transferência Bancária' },
  cash: { en: 'Cash', pt: 'Dinheiro' },

  // Client
  clientName: { en: 'Client Name', pt: 'Nome do Cliente' },
  nuit: { en: 'NUIT', pt: 'NUIT' },
  phone: { en: 'Phone', pt: 'Telefone' },
  address: { en: 'Address', pt: 'Endereço' },
  city: { en: 'City', pt: 'Cidade' },

  // Stock
  newStock: { en: 'New Item', pt: 'Novo Item' },
  sku: { en: 'SKU', pt: 'SKU' },
  category: { en: 'Category', pt: 'Categoria' },
  stockLevel: { en: 'Stock Level', pt: 'Nível de Stock' },
  maxStock: { en: 'Max Stock', pt: 'Stock Máximo' },
  price: { en: 'Price', pt: 'Preço' },
  inStock: { en: 'In Stock', pt: 'Em Stock' },
  lowStock: { en: 'Low Stock', pt: 'Stock Baixo' },
  outOfStock: { en: 'Out of Stock', pt: 'Sem Stock' },
  warehouse: { en: 'Warehouse', pt: 'Armazém' },

  // Expenses
  newExpense: { en: 'New Expense', pt: 'Nova Despesa' },
  merchant: { en: 'Merchant', pt: 'Fornecedor' },
  expenseDate: { en: 'Expense Date', pt: 'Data Despesa' },
  notes: { en: 'Notes', pt: 'Notas' },

  // Items
  description: { en: 'Description', pt: 'Descrição' },
  quantity: { en: 'Qty', pt: 'Qtd' },
  unitPrice: { en: 'Unit Price', pt: 'Preço Unit.' },
  total: { en: 'Total', pt: 'Total' },
  subtotal: { en: 'Subtotal', pt: 'Subtotal' },
  tax: { en: 'ISPC 3%', pt: 'ISPC 3%' },
  addItem: { en: 'Add Item', pt: 'Adicionar Item' },

  // Company
  companyName: { en: 'Company Name', pt: 'Nome da Empresa' },
  companySetup: { en: 'Company Setup', pt: 'Configurar Empresa' },
  bankAccounts: { en: 'Bank Accounts', pt: 'Contas Bancárias' },
  mobilePayments: { en: 'Mobile Payments', pt: 'Pagamentos Móvel' },
  branding: { en: 'Branding', pt: 'Imagem' },
  logo: { en: 'Logo', pt: 'Logótipo' },
  stamp: { en: 'Stamp', pt: 'Carimbo' },
  primaryCompany: { en: 'Primary Company', pt: 'Empresa Principal' },
  secondaryCompany: { en: 'Secondary Company', pt: 'Empresa Secundária' },

  // Dashboard
  salesToday: { en: 'Sales Today', pt: 'Vendas Hoje' },
  monthlyRevenue: { en: 'Monthly Revenue', pt: 'Receita Mensal' },
  pendingInvoices: { en: 'Pending Invoices', pt: 'Facturas Pendentes' },
  lowStockItems: { en: 'Low Stock Items', pt: 'Itens em Stock Baixo' },
  recentTransactions: { en: 'Recent Transactions', pt: 'Transacções Recentes' },
  quickActions: { en: 'Quick Actions', pt: 'Acções Rápidas' },
  criticalStock: { en: 'Critical Stock', pt: 'Stock Crítico' },
  generateReport: { en: 'Generate Report', pt: 'Gerar Relatório' },

  // Tagline
  tagline: { en: 'Where growth finds space', pt: 'Onde o crescimento encontra espaço' },

  // Delete
  deleteConfirm: { en: 'Are you sure you want to delete this?', pt: 'Tem a certeza que deseja eliminar?' },
  cannotUndo: { en: 'This action cannot be undone.', pt: 'Esta acção não pode ser desfeita.' },

  // Contacts
  role: { en: 'Role', pt: 'Cargo' },
  company: { en: 'Company', pt: 'Empresa' },
  newContact: { en: 'New Contact', pt: 'Novo Contacto' },

  // Debt clients
  debtClients: { en: 'Debt Clients', pt: 'Clientes Devedores' },
  movitel: { en: 'Movitel', pt: 'Movitel' },
  vodacom: { en: 'Vodacom', pt: 'Vodacom' },
  newClient: { en: 'New Client', pt: 'Novo Cliente' },
  settleClient: { en: 'Mark Settled', pt: 'Marcar Liquidado' },

  // PDF export
  pdfOptions: { en: 'PDF Options', pt: 'Opções PDF' },
  includeStamp: { en: 'Include Stamp', pt: 'Incluir Carimbo' },
  taxType: { en: 'Tax Type', pt: 'Tipo de Imposto' },
  noTax: { en: 'No Tax', pt: 'Sem Imposto' },
  ispc: { en: 'ISPC 3%', pt: 'ISPC 3%' },
  iva: { en: 'IVA 16%', pt: 'IVA 16%' },

  // Theme
  darkMode: { en: 'Dark Mode', pt: 'Modo Escuro' },
  language: { en: 'Language', pt: 'Idioma' },
} as const;

export const tr = (
  lang: Language,
  key: keyof typeof translations
): string => {
  const entry = translations[key];
  return lang === 'pt' ? entry.pt : entry.en;
};

export const formatCurrency = (amount: number): string => {
  if (!isFinite(amount) || isNaN(amount)) return '0,00 MT';
  const fixed = Math.abs(amount).toFixed(2);
  const [integer, decimal] = fixed.split('.');
  const thousands = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (amount < 0 ? '-' : '') + thousands + ',' + decimal + ' MT';
};

export const formatDate = (iso: string, lang: Language): string => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'pt' ? 'pt-MZ' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const numberToWords = (num: number): string => {
  const units = ['', 'Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove',
    'Dez', 'Onze', 'Doze', 'Treze', 'Catorze', 'Quinze', 'Dezasseis', 'Dezassete', 'Dezoito', 'Dezanove'];
  const tens = ['', '', 'Vinte', 'Trinta', 'Quarenta', 'Cinquenta', 'Sessenta', 'Setenta', 'Oitenta', 'Noventa'];

  if (num === 0) return 'Zero';

  const intPart = Math.floor(num);
  const decPart = Math.round((num - intPart) * 100);

  let result = '';
  if (intPart >= 1000000) {
    result += numberToWords(Math.floor(intPart / 1000000)) + ' Milhão ';
  }
  if (intPart >= 1000) {
    const thousands = Math.floor((intPart % 1000000) / 1000);
    if (thousands > 0) result += numberToWords(thousands) + ' Mil ';
  }
  const remainder = intPart % 1000;
  if (remainder >= 100) {
    const hundreds = Math.floor(remainder / 100);
    const h = ['', 'Cem', 'Duzentos', 'Trezentos', 'Quatrocentos', 'Quinhentos',
      'Seiscentos', 'Setecentos', 'Oitocentos', 'Novecentos'];
    result += h[hundreds] + ' ';
  }
  const rem2 = remainder % 100;
  if (rem2 >= 20) {
    result += tens[Math.floor(rem2 / 10)] + ' ';
    if (rem2 % 10 > 0) result += units[rem2 % 10] + ' ';
  } else if (rem2 > 0) {
    result += units[rem2] + ' ';
  }

  result = result.trim() + ' Meticais';
  if (decPart > 0) {
    result += ` e ${decPart} Centavos`;
  }
  return result;
};
