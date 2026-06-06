/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Quote, Language, Currency, CompanySettings } from '../types';
import { formatValue } from '../data';
import { FileCode, Plus, Search, HelpCircle, Check, X, ClipboardSignature, Eye, Download } from 'lucide-react';
import * as db from '../lib/db';
import { generateQuotePDF, resolveCompanySettings } from '../lib/pdf';

interface QuotesViewProps {
  quotes: Quote[];
  setQuotes: (qs: Quote[]) => void;
  language: Language;
  currency: Currency;
  onNewQuote: () => void;
  triggerToast: (title: string, titlePt: string, desc: string, descPt: string, type: 'success' | 'info') => void;
  searchQuery: string;
  onApproveQuote?: (id: string, num: string) => void;
  companySettings?: CompanySettings;
}

export default function QuotesView({
  quotes,
  setQuotes,
  language,
  currency,
  onNewQuote,
  triggerToast,
  searchQuery,
  onApproveQuote: onApproveQuoteProp,
  companySettings,
}: QuotesViewProps) {

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  const handleDownloadPDF = async (q: Quote) => {
    const defaultSettings: CompanySettings = {
      companyName: '', nuit: '', address: '', city: '',
      phone: '', email: '', bankAccounts: [], mobileContacts: [], setupComplete: false,
    };
    const base = companySettings || defaultSettings;
    const settings = resolveCompanySettings(base, q.companyProfileId);
    const items = await db.fetchQuoteItems(q.id);
    await generateQuotePDF(q, items, settings);
  };

  const now = new Date();
  const fiscalMonth = now.toLocaleDateString(language === 'en' ? 'en-US' : 'pt-MZ', { month: 'long', year: 'numeric' });

  const handleApproveQuote = (id: string, num: string) => {
    if (onApproveQuoteProp) {
      onApproveQuoteProp(id, num);
      return;
    }
    const updated = quotes.map(q => {
      if (q.id === id) {
        return {
          ...q,
          status: 'Approved' as const,
          statusPt: 'Aprovado' as const
        };
      }
      return q;
    });
    setQuotes(updated);
    triggerToast(
      'Quote Proposal Approved',
      'Proposta Aprovada',
      `Quote ${num} has been successfully promoted to ready-to-bill.`,
      `A proposta ${num} foi promovida com sucesso para facturação.`,
      'success'
    );
  };

  const filteredQuotes = quotes.filter(q => {
    return q.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
           q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 animation-fade-in text-left">
      
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
            {language === 'en' ? 'Quotes & Proposals' : 'Cotações e Propostas'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'en'
              ? 'Draft commercial offers and legal financial simulations for premium partners.'
              : 'Gere simulações financeiras e propostas comerciais para parceiros estratégicos.'
            }
          </p>
        </div>
        
        <button
          onClick={onNewQuote}
          className="px-5 py-2.5 bg-primary hover:bg-primary-container text-white font-semibold text-xs rounded flex items-center gap-2 transition-smooth cursor-pointer shadow-sm active:scale-98"
        >
          <Plus size={15} />
          <span>{language === 'en' ? 'New Proposal' : 'Simular Proposta'}</span>
        </button>
      </div>



      {/* Main Grid List + Details Panel */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] border-b border-slate-205 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Quote Reference' : 'Código Cotação'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Client / Company' : 'Cliente / Companhia'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Date' : 'Data'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Proposed Value' : 'Valor Proposto'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">{language === 'en' ? 'Status' : 'Estado'}</th>
                  <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display text-right">{language === 'en' ? 'Promote' : 'Ações'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredQuotes.length > 0 ? (
                  filteredQuotes.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => setSelectedQuote(q)}
                      className={`hover:bg-slate-50/40 dark:hover:bg-slate-850/40 transition-smooth cursor-pointer ${selectedQuote?.id === q.id ? 'bg-slate-50 dark:bg-slate-850/40' : ''}`}
                    >
                      <td className="px-6 py-4 text-xs font-mono font-bold text-primary dark:text-slate-100">{q.quoteNumber}</td>
                      <td className="px-6 py-4 text-xs font-semibold text-primary dark:text-slate-300 uppercase tracking-tight font-display">{q.client}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{language === 'en' ? q.date : q.datePt}</td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{formatValue(q.amount, currency)}</td>
                      <td className="px-6 py-4"><span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${q.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : q.status === 'Pending' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : q.status === 'Liquidado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300' : 'bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-300'}`}>{language === 'en' ? q.status : q.statusPt}</span></td>
                      <td className="px-6 py-3 text-right flex items-center justify-end gap-1.5 h-14">
                        {q.status === 'Pending' && (<button onClick={(e) => { e.stopPropagation(); handleApproveQuote(q.id, q.quoteNumber); }} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] uppercase px-3 py-1.5 rounded inline-flex items-center gap-1 shadow-xs transition-smooth cursor-pointer"><Check size={11} /><span>{language === 'en' ? 'Approve' : 'Aprovar'}</span></button>)}
                        <button onClick={(e) => { e.stopPropagation(); setSelectedQuote(q); }} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded inline-block transition-smooth cursor-pointer" title={language === 'en' ? 'Open details' : 'Abrir detalhes'}><Eye size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(q); }} className="p-1.5 hover:bg-blue-100 dark:hover:bg-slate-850 text-slate-400 hover:text-blue-600 dark:hover:text-white rounded inline-block transition-smooth cursor-pointer" title={language === 'en' ? 'Download PDF' : 'Descarregar PDF'}><Download size={14} /></button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">{language === 'en' ? 'No pending corporate quote records found.' : 'Nenhum registro de proposta comercial encontrado.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 shadow-xs sticky top-4 self-start">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">{language === 'en' ? 'Quote details' : 'Detalhes da cotação'}</h3>
          {selectedQuote ? (
            <div className="mt-4 space-y-4 text-sm text-slate-700 dark:text-slate-200">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Reference' : 'Referência'}</p>
                <p className="font-black text-base text-primary dark:text-white">{selectedQuote.quoteNumber}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Client' : 'Cliente'}</p>
                <p className="font-semibold">{selectedQuote.client}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Date' : 'Data'}</p><p className="font-semibold mt-1">{language === 'en' ? selectedQuote.date : selectedQuote.datePt}</p></div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3"><p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Validity' : 'Validade'}</p><p className="font-semibold mt-1">{selectedQuote.validityDays} {language === 'en' ? 'days' : 'dias'}</p></div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs">
                <p className="text-[10px] uppercase tracking-wider text-slate-400">{language === 'en' ? 'Value' : 'Valor'}</p>
                <p className="mt-1 text-lg font-black text-primary dark:text-white">{formatValue(selectedQuote.amount, currency)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedQuote.status === 'Pending' && <button onClick={() => handleApproveQuote(selectedQuote.id, selectedQuote.quoteNumber)} className="px-3 py-2 rounded bg-emerald-600 text-white text-xs font-bold">{language === 'en' ? 'Approve' : 'Aprovar'}</button>}
                <button onClick={() => handleDownloadPDF(selectedQuote)} className="px-3 py-2 rounded bg-blue-600 text-white text-xs font-bold">{language === 'en' ? 'Download PDF' : 'Descarregar PDF'}</button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-400">{language === 'en' ? 'Select a quote to view its details here.' : 'Selecione uma cotação para ver os detalhes aqui.'}</p>
          )}
        </aside>
      </div>

    </div>
  );
}
