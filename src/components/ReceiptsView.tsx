/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Receipt, Quote, Language, Currency, CompanySettings } from '../types';
import { formatValue } from '../data';
import { Receipt as ReceiptIcon, Eye, Download, FileText, Trash2 } from 'lucide-react';
import { generateReceiptPDF, amountToWordsPt, resolveCompanySettings } from '../lib/pdf';
import * as db from '../lib/db';
import DeleteConfirmModal from './DeleteConfirmModal';

interface ReceiptsViewProps {
  receipts: Receipt[];
  setReceipts: (rcs: Receipt[]) => void;
  quotes: Quote[];
  language: Language;
  currency: Currency;
  searchQuery: string;
  companySettings?: CompanySettings;
}

export default function ReceiptsView({ receipts, setReceipts, quotes, language, currency, searchQuery, companySettings }: ReceiptsViewProps) {
  const defaultSettings: CompanySettings = {
    companyName: '', nuit: '', address: '', city: '',
    phone: '', email: '', bankAccounts: [], mobileContacts: [], setupComplete: false,
  };

  const findRelatedQuotes = (rc: Receipt): Quote[] =>
    quotes.filter(q =>
      q.client.toLowerCase() === rc.client.toLowerCase() &&
      q.status === 'Liquidado'
    );

  const handleDownloadPDF = async (rc: Receipt) => {
    const base = companySettings || defaultSettings;
    const settings = resolveCompanySettings(base, rc.companyProfileId);
    await generateReceiptPDF(rc, settings, findRelatedQuotes(rc));
  };

  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const handleDeleteReceipt = async () => {
    if (!deleteTarget) return;
    await db.deleteReceipt(deleteTarget.id);
    setReceipts(receipts.filter(rc => rc.id !== deleteTarget.id));
    if (selectedReceipt?.id === deleteTarget.id) setSelectedReceipt(null);
  };

  const filteredReceipts = receipts.filter(rc =>
    rc.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rc.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rc.invoiceRef.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
    <DeleteConfirmModal
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={handleDeleteReceipt}
      language={language}
      documentLabel={deleteTarget?.label ?? ''}
    />
    <div className="space-y-6 animation-fade-in text-left">

      {/* Upper Title block */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
          {language === 'en' ? 'Client Receipts Ledger' : 'Historial de Recibos'}
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          {language === 'en'
            ? 'Access active financial settlement proof sheets, mobile wallets, and payment records.'
            : 'Consulte comprovantes de liquidação, carteiras móveis (M-Pesa) e transacções de clientes.'
          }
        </p>
      </div>

      {/* Main Ledger container */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[920px]">
          <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] border-b border-slate-205 dark:border-slate-800">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Receipt ID' : 'Código Recibo'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Settled Client' : 'Cliente Depositante'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Invoice Ref' : 'Referência Factura'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Settlement Date' : 'Data do Depósito'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Payment Method' : 'Canal Utilizado'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Settled Value' : 'Valor Liquidado'}</th>
              <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display text-right">{language === 'en' ? 'Document' : 'Ações'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredReceipts.length > 0 ? (
              filteredReceipts.map((rc) => (
                <tr 
                  key={rc.id} 
                  onClick={() => setSelectedReceipt(rc)}
                  className={`hover:bg-slate-50/40 dark:hover:bg-slate-850/40 transition-smooth cursor-pointer ${selectedReceipt?.id === rc.id ? 'bg-slate-50 dark:bg-slate-850/40' : ''}`}
                >
                  <td className="px-6 py-4 text-xs font-mono font-bold text-primary dark:text-slate-200">
                    {rc.receiptNumber}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-primary dark:text-slate-300 uppercase tracking-tight font-display font-medium">
                    {rc.client}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono font-bold text-secondary dark:text-secondary-container">
                    {rc.invoiceRef}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {language === 'en' ? rc.date : rc.datePt}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-secondary/10 dark:bg-secondary-container/10 text-secondary dark:text-[#fec487] border border-secondary/25 rounded text-[9px] font-extrabold uppercase tracking-wide">
                      {language === 'en' ? rc.method : rc.methodPt}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono font-extrabold text-[#794f1d] dark:text-[#fec487]">
                    {formatValue(rc.amount, currency)}
                  </td>
                  <td className="px-6 py-3 text-right flex items-center justify-end gap-1.5 h-14">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReceipt(rc);
                      }}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white rounded inline-flex cursor-pointer transition-smooth"
                      title={language === 'en' ? "View Receipt" : "Visualizar Recibo"}
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPDF(rc);
                      }}
                      className="p-1.5 hover:bg-blue-100 dark:hover:bg-slate-855 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-white rounded inline-flex cursor-pointer transition-smooth"
                      title={language === 'en' ? 'Download PDF' : 'Descarregar PDF'}
                    >
                      <Download size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: rc.id, label: rc.receiptNumber });
                      }}
                      className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950/30 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded inline-flex cursor-pointer transition-smooth"
                      title={language === 'en' ? 'Delete receipt' : 'Eliminar recibo'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  {language === 'en' ? 'No recent corporate receipt records found.' : 'Nenhum comprovativo de pagamento localizado.'}
                </td>
              </tr>
            )}
          </tbody>
            </table>
          </div>
        </div>

        <aside className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs sticky top-4 self-start h-fit">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{language === 'en' ? 'Receipt details' : 'Detalhes do recibo'}</h3>
          {selectedReceipt ? (() => {
            const related = findRelatedQuotes(selectedReceipt);
            return (
              <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Receipt ID' : 'Código Recibo'}</p>
                  <p className="font-black text-base text-primary dark:text-white">{selectedReceipt.receiptNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Client' : 'Cliente'}</p>
                  <p className="font-semibold">{selectedReceipt.client}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Date' : 'Data'}</p>
                    <p className="font-semibold mt-1">{language === 'en' ? selectedReceipt.date : selectedReceipt.datePt}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Method' : 'Método'}</p>
                    <p className="font-semibold mt-1">{language === 'en' ? selectedReceipt.method : selectedReceipt.methodPt}</p>
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Amount' : 'Valor'}</p>
                  <p className="mt-1 text-lg font-black text-primary dark:text-white">{formatValue(selectedReceipt.amount, currency)}</p>
                  <p className="mt-1 text-[10px] text-slate-400 italic">{amountToWordsPt(selectedReceipt.amount)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Invoice Ref' : 'Ref. Factura'}</p>
                  <p className="font-mono font-bold text-secondary mt-1">{selectedReceipt.invoiceRef}</p>
                </div>
                {related.length > 0 && (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 text-xs">
                    <p className="text-[10px] uppercase tracking-wider text-blue-500 font-bold flex items-center gap-1">
                      <FileText size={10} />
                      {language === 'en' ? 'Settled Quotes' : 'Cotações Liquidadas'}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {related.map(q => (
                        <span key={q.id} className="font-mono font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded text-[10px]">
                          {q.quoteNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => handleDownloadPDF(selectedReceipt)}
                  className="w-full px-3 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  {language === 'en' ? 'Download Receipt PDF' : 'Descarregar Recibo PDF'}
                </button>
              </div>
            );
          })() : (
            <p className="mt-4 text-xs text-slate-400">{language === 'en' ? 'Select a receipt to view its details here.' : 'Selecione um recibo para ver os detalhes aqui.'}</p>
          )}
        </aside>
      </div>

    </div>
    </>
  );
}
