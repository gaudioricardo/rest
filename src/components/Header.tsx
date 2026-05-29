/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Search, Settings, FileDown, Plus } from 'lucide-react';
import { Language } from '../types';

interface HeaderProps {
  language: Language;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onNewInvoice: () => void;
  onGenerateReport: () => void;
  onNewItem?: () => void;
  activeTab: string;
  userEmail?: string;
  userName?: string;
  onNavigateToSettings?: () => void;
}

function getInitials(name?: string, email?: string): string {
  const source = name || (email ? email.split('@')[0] : '');
  if (!source) return 'U';
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

function getDisplayName(name?: string, email?: string): string {
  if (name) return name;
  if (email) return email.split('@')[0];
  return 'Utilizador';
}

export default function Header({
  language,
  searchQuery,
  setSearchQuery,
  onNewInvoice,
  onGenerateReport,
  onNewItem,
  activeTab,
  userEmail,
  userName,
  onNavigateToSettings,
}: HeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const displayName = getDisplayName(userName, userEmail);
  const initials = getInitials(userName, userEmail);

  // Dynamic contextual search placeholder helper
  const getContextPlaceholder = () => {
    if (language === 'pt') {
      switch (activeTab) {
        case 'dashboard':
          return 'Pesquisar em toda a loja (transações, clientes, resumos)...';
        case 'stock':
          return 'Pesquisar itens alimentares no inventário (Ex: Atum, Arroz, Bolacha, SKU)...';
        case 'invoices':
          return 'Pesquisar faturas de clientes por nome ou número (Ex: VIP, Polana, Boane)...';
        case 'quotes':
          return 'Pesquisar propostas comerciais ou simulações (Ex: Costa do Sol, Polana)...';
        case 'receipts':
          return 'Pesquisar recibos no histórico por cliente ou fatura de origem...';
        case 'expenses':
          return 'Pesquisar despesas industriais por fornecedor ou categoria...';
        case 'contacts':
          return 'Pesquisar contactos comerciais e gestores de compras (Ex: Carlos, Margarida)...';
        default:
          return 'Pesquisar por palavras-chave...';
      }
    } else {
      switch (activeTab) {
        case 'dashboard':
          return 'Search overall store metrics, transactions, clients...';
        case 'stock':
          return 'Search manufactured food products (Ex: Tuna, Rice, Condensed Milk, SKU)...';
        case 'invoices':
          return 'Search invoices by client name or reference (Ex: VIP, Polana, Boane)...';
        case 'quotes':
          return 'Search commercial quotations and drafts...';
        case 'receipts':
          return 'Search historical settlement receipts & deposits...';
        case 'expenses':
          return 'Search logistics, sugar or electricity expenses...';
        case 'contacts':
          return 'Search business contact directory...';
        default:
          return 'Search everything...';
      }
    }
  };

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center w-full px-8 h-16 sticky top-0 z-35 transition-colors">

      {/* Search Input block (Expanded/Contextualized) */}
      <div className="flex items-center gap-4 flex-1 mr-4">
        <div className="relative w-full max-w-2xl">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 pl-11 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs transition-smooth"
            placeholder={getContextPlaceholder()}
          />
        </div>
      </div>

      {/* Main Right Tools Header */}
      <div className="flex items-center gap-4">

        {/* Quick Action Buttons */}
        <div className="hidden lg:flex gap-3">
          <button
            onClick={onGenerateReport}
            className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-white font-medium text-xs rounded flex items-center gap-2 transition-smooth cursor-pointer shadow-sm active:scale-98"
          >
            <FileDown size={14} />
            <span>{language === 'en' ? 'Generate Report' : 'Gerar Relatório'}</span>
          </button>

          <button
            onClick={onNewInvoice}
            className="px-4 py-2 bg-primary text-white hover:bg-primary-container font-semibold text-xs rounded flex items-center gap-2 transition-smooth cursor-pointer shadow-sm active:scale-98 border border-primary/10"
          >
            <Plus size={14} />
            <span>{language === 'en' ? 'New Invoice' : 'Nova Factura'}</span>
          </button>
        </div>

        {/* Separator */}
        <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

        {/* Settings Action Button */}
        <button
          onClick={() => onNavigateToSettings ? onNavigateToSettings() : undefined}
          className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-smooth cursor-pointer"
        >
          <Settings size={18} />
        </button>

        {/* Profile Card Executive Panel */}
        <div className="relative">
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-105 dark:hover:bg-slate-800 rounded transition-smooth border border-transparent hover:border-slate-200 dark:hover:border-slate-705"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 dark:text-slate-105 font-display">
                {displayName}
              </p>
              <p className="text-[9px] text-neutral-500 dark:text-slate-400 uppercase tracking-widest font-black">
                {language === 'en' ? 'Administrator' : 'Administrador'}
              </p>
            </div>
            {/* Avatar with initials */}
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-bold text-white text-xs border border-primary/20 flex-shrink-0">
              {initials}
            </div>
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xl z-50 overflow-hidden text-left animation-fade-in text-[12px]">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-800 dark:text-slate-200 block font-display">{displayName}</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-550">{userEmail || ''}</span>
              </div>
              <button
                onClick={() => {
                  if (onNavigateToSettings) onNavigateToSettings();
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-705 dark:text-slate-300 transition-smooth"
              >
                {language === 'en' ? 'My Profile / Settings' : 'Perfil / Definições'}
              </button>
              <button
                onClick={() => { setShowProfileMenu(false); }}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-750 dark:text-slate-300 transition-smooth"
              >
                {language === 'en' ? 'Security logs' : 'Logs de Segurança'}
              </button>
              <button
                onClick={() => { setShowProfileMenu(false); }}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-750 dark:text-slate-300 transition-smooth"
              >
                {language === 'en' ? 'Server Status' : 'Estado do Servidor'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
