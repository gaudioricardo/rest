/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  MoreHorizontal,
  Check,
  AlertCircle,
  Clock,
  FileCheck2,
  CalendarDays,
  Download,
  Filter,
  Eye,
  TrendingUp,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { Invoice, Language, Currency, CompanySettings } from '../types';
import { formatValue } from '../data';
import * as db from '../lib/db';
import { generateInvoicePDF, resolveCompanySettings, PdfGenerationOptions } from '../lib/pdf';
import PdfOptionsModal from './PdfOptionsModal';
import DeleteConfirmModal from './DeleteConfirmModal';

interface InvoicesViewProps {
  invoices: Invoice[];
  setInvoices: (invs: Invoice[]) => void;
  language: Language;
  currency: Currency;
  onNewInvoice: () => void;
  triggerToast: (title: string, titlePt: string, desc: string, descPt: string, type: 'success' | 'info') => void;
  searchQuery: string;
  onMarkAsPaid?: (invoiceId: string, paymentMethod: string) => void;
  companySettings?: CompanySettings;
}

export default function InvoicesView({
  invoices,
  setInvoices,
  language,
  currency,
  onNewInvoice,
  triggerToast,
  searchQuery,
  onMarkAsPaid,
  companySettings,
}: InvoicesViewProps) {
  
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<Invoice | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const handleDeleteInvoice = async () => {
    if (!deleteTarget) return;
    await db.deleteInvoice(deleteTarget.id);
    setInvoices(invoices.filter(inv => inv.id !== deleteTarget.id));
    if (selectedInvoice?.id === deleteTarget.id) setSelectedInvoice(null);
  };

  const handleDownloadPDF = (inv: Invoice) => {
    setPendingInvoice(inv);
    setPdfModalOpen(true);
  };

  const handleGeneratePDF = async (options: PdfGenerationOptions) => {
    if (!pendingInvoice) return;
    const defaultSettings: CompanySettings = {
      companyName: '', nuit: '', address: '', city: '',
      phone: '', email: '', bankAccounts: [], mobileContacts: [], setupComplete: false,
    };
    const base = companySettings || defaultSettings;
    const settings = resolveCompanySettings(base, pendingInvoice.companyProfileId);
    const items = await db.fetchInvoiceItems(pendingInvoice.id);
    await generateInvoicePDF(pendingInvoice, items, settings, options);
    setPendingInvoice(null);
  };
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Toggle invoice status directly as an interactive feature
  const handleMarkAsPaid = (id: string, invNum: string) => {
    if (onMarkAsPaid) {
      onMarkAsPaid(id, 'Bank Transfer');
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice({ ...selectedInvoice, status: 'Paid', statusPt: 'Pago' });
      }
      return;
    }
    const updated = invoices.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          status: 'Paid' as const,
          statusPt: 'Pago' as const
        };
      }
      return inv;
    });
    setInvoices(updated);

    if (selectedInvoice && selectedInvoice.id === id) {
      setSelectedInvoice({
        ...selectedInvoice,
        status: 'Paid',
        statusPt: 'Pago'
      });
    }

    triggerToast(
      'Payment Captured',
      'Pagamento Confirmado',
      `Invoice ${invNum} is successfully marked as PAID. Records updated.`,
      `Factura ${invNum} marcada como PAGA com sucesso. Registros atualizados.`,
      'success'
    );
  };

  // Filter invoices list
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === 'All' || inv.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // KPI math
  const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue');
  const totalOverdueSum = overdueInvoices.reduce((acc, current) => acc + current.amount, 0);

  const pendingInvoices = invoices.filter(inv => inv.status === 'Pending');
  const totalPendingSum = pendingInvoices.reduce((acc, current) => acc + current.amount, 0);

  // Pagination indexing
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));

  // Total collected from paid invoices
  const totalCollected = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.amount, 0);
  const paidCount = invoices.filter(inv => inv.status === 'Paid').length;

  // Dynamic fiscal month and vencimento date
  const now = new Date();
  const fiscalMonth = now.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-MZ', { month: 'long', year: 'numeric' });
  const vencimento = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  return (
    <>
    <PdfOptionsModal
      isOpen={pdfModalOpen}
      onClose={() => { setPdfModalOpen(false); setPendingInvoice(null); }}
      onGenerate={handleGeneratePDF}
      language={language}
      hasStamp={!!(companySettings?.stampBase64)}
    />
    <DeleteConfirmModal
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={handleDeleteInvoice}
      language={language}
      documentLabel={deleteTarget?.label ?? ''}
    />
    <div className="space-y-6 animation-fade-in text-left">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
            {language === 'en' ? 'Invoice Workflows' : 'Gestão de Facturação'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'en'
              ? 'Draft, issue, track, and record payments for corporate trade credit accounts.'
              : 'Gere, monitorize, rastreie e registe pagamentos para contas de crédito comercial.'
            }
          </p>
        </div>
        
        <button
          onClick={onNewInvoice}
          className="px-5 py-2.5 bg-primary text-white font-semibold text-xs rounded flex items-center gap-2 hover:bg-primary-container transition-smooth cursor-pointer shadow-sm active:scale-98"
        >
          <Plus size={15} />
          <span>{language === 'en' ? 'Create Invoice' : 'Criar Factura'}</span>
        </button>
      </div>

      {/* Grid: Stats & Hand-crafted Weekly Visual Payments chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Total Collected Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-350 transition-smooth">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider font-display">
                {language === 'en' ? 'Total Collected' : 'Total Recebido'}
              </span>
              <p className="text-2xl font-black text-primary dark:text-white mt-1 font-display hanken">
                {formatValue(totalCollected, currency)}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
              <FileCheck2 size={10} />
              <span>{paidCount}</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col justify-center flex-1">
            {paidCount === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {language === 'en' ? 'No paid invoices yet' : 'Ainda sem facturas pagas'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {paidCount} {language === 'en' ? 'invoice(s) fully settled' : 'factura(s) liquidada(s)'}
              </p>
            )}
          </div>
        </div>

        {/* Overdue Total Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-350 transition-smooth">
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block font-display">
              {language === 'en' ? 'Overdue Debt Limit' : 'Dívidas em Atraso'}
            </span>
            <p className="text-2xl font-black text-red-650 dark:text-red-400 mt-2 font-display hanken">
              {formatValue(totalOverdueSum, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'en'
                ? 'Action recommended: Follow-up with primary clients.'
                : 'Acção recomendada: Acompanhamento com clientes principais.'
              }
            </p>
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-6 flex gap-3 items-center">
            <div className="w-10 h-10 rounded bg-red-100 dark:bg-red-950/40 text-red-650 flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-705 dark:text-slate-300">
                {overdueInvoices.length} {language === 'en' ? 'Overdue Accounts' : 'Contas em Atraso'}
              </p>
              <p className="text-[10px] text-slate-400">{language === 'en' ? 'Requires dynamic billing' : 'Requer cobrança imediata'}</p>
            </div>
          </div>
        </div>

        {/* Pending Invoices Total Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded border border-slate-200/60 dark:border-primary-container/20 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-slate-350 transition-smooth">
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-widest block font-display">
              {language === 'en' ? 'Unpaid Outstanding' : 'Facturação a Cobrar'}
            </span>
            <p className="text-2xl font-black text-amber-600 mt-2 font-display hanken">
              {formatValue(totalPendingSum, currency)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {language === 'en'
                ? 'These accounts are awaiting credit clearance times.'
                : 'Estes montantes aguardam compensação bancária ordinária.'
              }
            </p>
          </div>
          
          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-6 flex gap-3 items-center">
            <div className="w-10 h-10 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center animate-pulse">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-705 dark:text-slate-300">
                {pendingInvoices.length} {language === 'en' ? 'Pending settlement' : 'Aguardam liquidação'}
              </p>
              <p className="text-[10px] text-slate-400">{language === 'en' ? 'Estimated: 5 business days' : 'Estimado: 5 dias úteis'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main filter strip and search inside invoices */}
      <div className="flex flex-col md:flex-row gap-3 pt-2">

        <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded">
          <Filter size={14} className="mr-2 text-slate-400" />
          <select 
            value={selectedStatus} 
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="border-none bg-transparent focus:ring-0 text-xs text-slate-700 dark:text-slate-350 cursor-pointer outline-none font-semibold mr-1"
          >
            <option value="All">{language === 'en' ? 'All Statuses' : 'Todos os Estados'}</option>
            <option value="Paid">{language === 'en' ? 'Paid' : 'Pago'}</option>
            <option value="Pending">{language === 'en' ? 'Pending' : 'Pendente'}</option>
            <option value="Overdue">{language === 'en' ? 'Overdue' : 'Vencido'}</option>
          </select>
        </div>
      </div>

      {/* Main Table and Details Panel */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded overflow-hidden shadow-xs flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[780px]">
              <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] border-b border-b-slate-200/50">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider text-[10px]">
                    {language === 'en' ? 'Invoice Ref' : 'Referência Factura'}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider text-[10px]">
                    {language === 'en' ? 'Client' : 'Cliente'}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider text-[10px]">
                    {language === 'en' ? 'Due Date' : 'Vencimento'}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider text-[10px]">
                    {language === 'en' ? 'Amount' : 'Valor'}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider text-[10px]">
                    {language === 'en' ? 'Status' : 'Estado'}
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 font-display uppercase tracking-wider text-[10px] text-right">
                    {language === 'en' ? 'Actions' : 'Ações'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                {currentInvoices.length > 0 ? (
                  currentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-smooth cursor-pointer ${selectedInvoice?.id === inv.id ? 'bg-slate-50 dark:bg-slate-850/40' : ''}`}
                    >
                      <td className="px-6 py-4 text-xs font-mono font-bold text-primary dark:text-blue-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded ${inv.logoBg} flex items-center justify-center font-bold text-[10px]`}>
                            {inv.initials}
                          </div>
                          <span className="text-xs text-slate-755 dark:text-slate-300 font-semibold uppercase tracking-tight">
                            {inv.client}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {language === 'en' ? inv.date : inv.datePt}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatValue(inv.amount, currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          inv.status === 'Paid' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : inv.status === 'Pending'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-red-105 bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-305'
                        }`}>
                          {language === 'en' ? inv.status : inv.statusPt}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(inv);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-primary hover:text-white dark:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300 rounded text-[10px] font-bold uppercase transition-smooth inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={12} />
                            <span>{language === 'en' ? 'View' : 'Visualizar'}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadPDF(inv);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 rounded cursor-pointer"
                            title={language === 'en' ? 'Download PDF' : 'Descarregar PDF'}
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget({ id: inv.id, label: inv.invoiceNumber });
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-red-600 hover:text-white dark:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400 rounded cursor-pointer"
                            title={language === 'en' ? 'Delete invoice' : 'Eliminar factura'}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      {language === 'en' ? 'No invoices found matching criteria.' : 'Nenhuma factura encontrada.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Simple pagination footer inside invoices list panel */}
          <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs text-slate-500">
              {language === 'en' ? 'Page' : 'Página'} <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-800 hover:bg-white disabled:opacity-40 transition-colors text-slate-400"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 dark:border-slate-800 hover:bg-white disabled:opacity-40 transition-colors text-slate-400"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs sticky top-4 self-start h-fit">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {language === 'en' ? 'Invoice details' : 'Detalhes da factura'}
          </h3>
          {selectedInvoice ? (
            <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Reference' : 'Referência'}</p>
                <p className="font-black text-base text-primary dark:text-white">{selectedInvoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Client' : 'Cliente'}</p>
                <p className="font-semibold">{selectedInvoice.client}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Issue date' : 'Data emissão'}</p>
                  <p className="font-semibold mt-1">{language === 'en' ? selectedInvoice.date : selectedInvoice.datePt}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Status' : 'Estado'}</p>
                  <p className="font-semibold mt-1">{language === 'en' ? selectedInvoice.status : selectedInvoice.statusPt}</p>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Amount' : 'Valor'}</p>
                <p className="mt-1 text-lg font-black text-primary dark:text-white">{formatValue(selectedInvoice.amount, currency)}</p>
              </div>
              {selectedInvoice.description && (
                <div className="rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs">
                  <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1">{language === 'en' ? 'Note' : 'Nota'}</p>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedInvoice.description}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {selectedInvoice.status !== 'Paid' && (
                  <button
                    onClick={() => handleMarkAsPaid(selectedInvoice.id, selectedInvoice.invoiceNumber)}
                    className="px-3 py-2 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-smooth"
                  >
                    {language === 'en' ? 'Mark as paid' : 'Marcar como paga'}
                  </button>
                )}
                <button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="px-3 py-2 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-smooth"
                >
                  {language === 'en' ? 'Download PDF' : 'Descarregar PDF'}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-400">{language === 'en' ? 'Select an invoice to view its details here.' : 'Selecione uma factura para ver os detalhes aqui.'}</p>
          )}
        </aside>
      </div>

    </div>
    </>
  );
}
