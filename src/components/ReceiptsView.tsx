/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Receipt, Language, Currency, CompanySettings } from '../types';
import { formatValue } from '../data';
import { Receipt as ReceiptIcon, Search, Printer, HelpCircle, Eye, Download } from 'lucide-react';
import { generateReceiptPDF } from '../lib/pdf';

interface ReceiptsViewProps {
  receipts: Receipt[];
  language: Language;
  currency: Currency;
  searchQuery: string;
  companySettings?: CompanySettings;
}

export default function ReceiptsView({ receipts, language, currency, searchQuery, companySettings }: ReceiptsViewProps) {
  const defaultSettings: CompanySettings = {
    companyName: '', nuit: '', address: '', city: '',
    phone: '', email: '', bankAccounts: [], mobileContacts: [], setupComplete: false,
  };

  const handleDownloadPDF = (rc: Receipt) => {
    const settings = companySettings || defaultSettings;
    generateReceiptPDF(rc, settings);
  };
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const now = new Date();
  const fiscalMonth = now.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-MZ', { month: 'long', year: 'numeric' });

  const filteredReceipts = receipts.filter(rc => {
    return rc.client.toLowerCase().includes(searchQuery.toLowerCase()) || 
           rc.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
           rc.invoiceRef.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const getAmountInWords = (amount: number) => {
    if (amount <= 10000) return 'Dez mil meticais';
    if (amount <= 50000) return 'Cinquenta mil meticais';
    if (amount <= 150000) return 'Cento e cinquenta mil meticais';
    if (amount <= 216300) return 'Duzentos e dezasseis mil e trezentos meticais';
    return `${amount.toLocaleString('pt-MZ')} meticais`;
  };

  return (
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
          {selectedReceipt ? (
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
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Date' : 'Data'}</p><p className="font-semibold mt-1">{language === 'en' ? selectedReceipt.date : selectedReceipt.datePt}</p></div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Method' : 'Método'}</p><p className="font-semibold mt-1">{language === 'en' ? selectedReceipt.method : selectedReceipt.methodPt}</p></div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Amount' : 'Valor'}</p>
                <p className="mt-1 text-lg font-black text-primary dark:text-white">{formatValue(selectedReceipt.amount, currency)}</p>
              </div>
              <button onClick={() => handleDownloadPDF(selectedReceipt)} className="px-3 py-2 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-smooth">{language === 'en' ? 'Download PDF' : 'Descarregar PDF'}</button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-400">{language === 'en' ? 'Select a receipt to view its details here.' : 'Selecione um recibo para ver os detalhes aqui.'}</p>
          )}
        </aside>
      </div>

    </div>
  );
}
