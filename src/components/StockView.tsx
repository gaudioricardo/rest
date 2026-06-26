/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Share2,
  ChevronDown,
  FileCheck,
  Edit3,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  PackagePlus,
  Trash2,
  CalendarDays,
  X
} from 'lucide-react';
import { StockItem, Language, Currency, CompanySettings } from '../types';
import { formatValue } from '../data';
import * as db from '../lib/db';
import DeleteConfirmModal from './DeleteConfirmModal';
import { generateStockPDF } from '../lib/pdf';

interface StockViewProps {
  stockItems: StockItem[];
  setStockItems: (items: StockItem[]) => void;
  language: Language;
  currency: Currency;
  onAddItem: () => void;
  triggerToast: (title: string, titlePt: string, desc: string, descPt: string, type: 'success' | 'info') => void;
  searchQuery: string;
  companySettings: CompanySettings;
}

export default function StockView({
  stockItems,
  setStockItems,
  language,
  currency,
  onAddItem,
  triggerToast,
  searchQuery,
  companySettings,
}: StockViewProps) {
  
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);

  const handleDeleteStockItem = async () => {
    if (!deleteTarget) return;
    await db.deleteStockItem(deleteTarget.id);
    setStockItems(stockItems.filter(item => item.id !== deleteTarget.id));
  };

  // Local filter states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedWarehouse, setSelectedWarehouse] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sync / Auto action trigger
  const handleRestock = (sku: string) => {
    const updated = stockItems.map(item => {
      if (item.sku === sku) {
        // Restock to maximum capacity
        return {
          ...item,
          stockLevel: item.maxStock,
          status: 'In Stock' as const,
          statusPt: 'Em Stock' as const
        };
      }
      return item;
    });
    setStockItems(updated);
    
    // Fire toast
    triggerToast(
      'Inventory Synchronized',
      'Inventário Sincronizado',
      `Restocked item with SKU ${sku} successfully across all hubs.`,
      `Níveis de reposição concluídos para o SKU ${sku} com sucesso em todos os hubs.`,
      'success'
    );
  };

  // Sync all low stocks at once
  const handleSyncAllLevels = () => {
    const updated = stockItems.map(item => {
      if (item.stockLevel <= item.maxStock * 0.35) {
        return {
          ...item,
          stockLevel: Math.floor(item.maxStock * 0.9), // fill to 90%
          status: 'In Stock' as const,
          statusPt: 'Em Stock' as const
        };
      }
      return item;
    });
    setStockItems(updated);
    
    triggerToast(
      'Inventory Synchronized',
      'Inventário Sincronizado',
      'All stock levels updated across 4 warehouses.',
      'Todos os níveis de stock actualizados em 4 armazéns.',
      'success'
    );
  };

  // Categories mapping
  const CATEGORIES = language === 'en' 
    ? ['All Categories', 'Dry Grocery', 'Canned Foods', 'Beverages', 'Dairy Products']
    : ['Todas as Categorias', 'Mercearia', 'Conservas', 'Bebidas', 'Laticínios'];

  // Match category keys
  const getCategoryKey = (cat: string) => {
    if (cat === 'All Categories' || cat === 'Todas as Categorias') return 'All';
    if (cat === 'Mercearia' || cat === 'Dry Grocery') return 'Dry Grocery';
    if (cat === 'Conservas' || cat === 'Canned Foods') return 'Canned Foods';
    if (cat === 'Bebidas' || cat === 'Beverages') return 'Beverages';
    if (cat === 'Laticínios' || cat === 'Dairy Products') return 'Dairy Products';
    return cat;
  };

  // Filters logic
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase());

    const catVal = getCategoryKey(selectedCategory);
    const matchesCategory = catVal === 'All' || item.category === catVal;

    const matchesStatus = selectedStatus === 'All' ||
      (selectedStatus === 'In Stock' && item.status === 'In Stock') ||
      (selectedStatus === 'Low Stock' && item.status === 'Low Stock') ||
      (selectedStatus === 'Out of Stock' && item.status === 'Out of Stock');

    const wVal = selectedWarehouse;
    const matchesWarehouse = wVal === 'All' ||
      (wVal === 'NYC' && item.warehouse.includes('NYC')) ||
      (wVal === 'West' && item.warehouse.includes('West')) ||
      (wVal === 'Maputo' && item.warehousePt.includes('Maputo')) ||
      (wVal === 'Beira' && item.warehousePt.includes('Beira'));

    const itemDate = item.createdAt ? item.createdAt.slice(0, 10) : '';
    const matchesFrom = !dateFrom || itemDate >= dateFrom;
    const matchesTo = !dateTo || itemDate <= dateTo;

    return matchesSearch && matchesCategory && matchesStatus && matchesWarehouse && matchesFrom && matchesTo;
  });

  const lowStockCount = filteredItems.filter(item => item.status !== 'In Stock').length;

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));

  return (
    <>
    <DeleteConfirmModal
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={handleDeleteStockItem}
      language={language}
      documentLabel={deleteTarget?.label ?? ''}
    />
    <div className="space-y-6 animation-fade-in text-left">

      {/* View Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display">
            {language === 'en' ? 'Stock Management' : 'Gestão de Stock'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            {language === 'en'
              ? 'Monitor and manage your enterprise inventory across all warehouses.'
              : 'Monitorize e gira o inventário da sua empresa em todos os armazéns.'
            }
          </p>
        </div>
        
        {/* Actions row */}
        <div className="flex gap-3">
          <button
            onClick={onAddItem}
            className="px-5 py-2.5 bg-primary text-white font-semibold text-xs rounded flex items-center gap-2 hover:bg-primary-container transition-smooth cursor-pointer shadow-sm active:scale-98"
          >
            <PackagePlus size={15} />
            <span>{language === 'en' ? 'Add Item' : 'Adicionar Item'}</span>
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              className="px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-smooth cursor-pointer shadow-sm active:scale-99"
            >
              <Share2 size={13} />
              <span>{language === 'en' ? 'Export' : 'Exportar'}</span>
              <ChevronDown size={12} className="opacity-60" />
            </button>
            
            {showExportDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xl z-50 overflow-hidden text-left animation-fade-in text-xs font-semibold text-slate-700 dark:text-slate-300">
                <button
                  onClick={() => {
                    setShowExportDropdown(false);
                    generateStockPDF(filteredItems, language, companySettings, dateFrom || undefined, dateTo || undefined);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                >
                  <FileCheck size={14} className="text-red-500" />
                  <span>{language === 'en' ? 'Export to PDF' : 'Exportar para PDF'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Date filter strip */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded px-3 py-1.5 shadow-xs">
          <CalendarDays size={13} className="text-slate-400 flex-shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
            {language === 'en' ? 'From' : 'De'}
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
          />
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded px-3 py-1.5 shadow-xs">
          <CalendarDays size={13} className="text-slate-400 flex-shrink-0" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
            {language === 'en' ? 'To' : 'Até'}
          </span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-none text-xs text-slate-700 dark:text-slate-300 outline-none cursor-pointer font-semibold"
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setCurrentPage(1); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 rounded hover:border-red-300 dark:hover:border-red-700 transition-colors cursor-pointer"
          >
            <X size={11} />
            {language === 'en' ? 'Clear dates' : 'Limpar datas'}
          </button>
        )}
      </div>

      {/* Bento Filter Strip panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
        
        {/* Category Pick select */}
        <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-1.5 rounded flex items-center shadow-xs">
          <Filter size={14} className="mx-2 text-slate-400" />
          <select 
            value={selectedCategory} 
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="w-full border-none bg-transparent focus:ring-0 text-xs text-slate-700 dark:text-slate-350 py-1.5 cursor-pointer outline-none font-semibold"
          >
            {CATEGORIES.map((cat, idx) => (
              <option key={idx} value={cat} className="dark:bg-slate-900 dark:text-slate-200">
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Pick select */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-1.5 rounded flex items-center shadow-xs">
          <select 
            value={selectedStatus} 
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="w-full border-none bg-transparent focus:ring-0 text-xs text-slate-700 dark:text-slate-350 py-1.5 cursor-pointer outline-none font-semibold"
          >
            <option value="All" className="dark:bg-slate-900 dark:text-slate-250">
              {language === 'en' ? 'All Statuses' : 'Todos os Estados'}
            </option>
            <option value="In Stock" className="dark:bg-slate-900 dark:text-slate-250">
              {language === 'en' ? 'In Stock' : 'Em Stock'}
            </option>
            <option value="Low Stock" className="dark:bg-slate-900 dark:text-slate-250">
              {language === 'en' ? 'Low Stock' : 'Stock Baixo'}
            </option>
            <option value="Out of Stock" className="dark:bg-slate-900 dark:text-slate-250">
              {language === 'en' ? 'Out of Stock' : 'Sem Stock'}
            </option>
          </select>
        </div>

        {/* Warehouse Selection filter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-1.5 rounded flex items-center shadow-xs">
          <select 
            value={selectedWarehouse} 
            onChange={(e) => { setSelectedWarehouse(e.target.value); setCurrentPage(1); }}
            className="w-full border-none bg-transparent focus:ring-0 text-xs text-slate-700 dark:text-slate-350 py-1.5 cursor-pointer outline-none font-semibold"
          >
            <option value="All" className="dark:bg-slate-900 dark:text-slate-250">
              {language === 'en' ? 'Warehouse: All' : 'Armazém: Todos'}
            </option>
            {language === 'en' ? (
              <>
                <option value="NYC" className="dark:bg-slate-900 dark:text-slate-250">Primary Hub (NYC)</option>
                <option value="West" className="dark:bg-slate-900 dark:text-slate-250">West Coast Annex</option>
              </>
            ) : (
              <>
                <option value="Maputo" className="dark:bg-slate-900 dark:text-slate-250">Hub Principal (Maputo)</option>
                <option value="Beira" className="dark:bg-slate-900 dark:text-slate-250">Anexo da Beira</option>
              </>
            )}
          </select>
        </div>

        {/* Low Stock Alerts Count block */}
        <div className="lg:col-span-2 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 dark:border-red-955/25 rounded px-4 py-1.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <span className="text-[11px] text-red-650 dark:text-red-400 font-extrabold uppercase tracking-tight">
              {lowStockCount} {language === 'en' ? 'Low Stock Alerts' : 'Alertas de Stock Baixo'}
            </span>
          </div>
          <button 
            onClick={handleSyncAllLevels}
            className="text-secondary hover:text-secondary/80 text-[10px] font-bold uppercase cursor-pointer"
          >
            {language === 'en' ? 'Restock All' : 'Repor Todos'}
          </button>
        </div>        </div>

      {/* Main Stock Data Table Frame */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded shadow-xs flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-[#fbf8fd]/80 dark:bg-[#111c3a] sticky top-0 z-10 border-b border-b-slate-200/50">
              <tr className="border-b border-slate-205 dark:border-slate-700">
                <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">
                  <input type="checkbox" className="rounded border-slate-350 dark:border-slate-700 text-secondary focus:ring-secondary w-3.5 h-3.5" />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">
                  {language === 'en' ? 'Name' : 'Nome'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">SKU</th>
                <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">
                  {language === 'en' ? 'Category' : 'Categoria'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">
                  {language === 'en' ? 'Stock Level' : 'Nível de Stock'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">
                  {language === 'en' ? 'Price' : 'Preço'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display">
                  {language === 'en' ? 'Status' : 'Estado'}
                </th>
                <th className="px-6 py-4 text-xs font-bold text-primary dark:text-slate-200 uppercase tracking-wider text-[10px] font-display text-right">
                  {language === 'en' ? 'Actions' : 'Acções'}
                </th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {currentItems.length > 0 ? (
                currentItems.map((item) => {
                  const percentage = Math.min(100, Math.floor((item.stockLevel / item.maxStock) * 100));
                  const isLow = item.stockLevel <= item.maxStock * 0.35;
                  const isOut = item.stockLevel === 0;
                  
                  // Color codes
                  let progressBgColor = 'bg-primary';
                  if (isOut) progressBgColor = 'bg-red-650 dark:bg-red-540';
                  else if (isLow) progressBgColor = 'bg-amber-500';
 
                  let statusBadgeColor = 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
                  if (isOut) statusBadgeColor = 'bg-red-100 text-red-800 dark:bg-red-955/40 dark:text-red-300';
                  else if (isLow) statusBadgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-955/40 dark:text-amber-305';
 
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-smooth ${
                        isOut ? 'bg-red-500/3' : isLow ? 'bg-amber-500/3' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input type="checkbox" className="rounded border-slate-350 dark:border-slate-700 text-secondary w-3.5 h-3.5" />
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-xs text-slate-805 dark:text-slate-200 block">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">{language === 'en' ? item.warehouse : item.warehousePt}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        {item.sku}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 text-[10px] font-bold uppercase rounded tracking-wider">
                          {language === 'en' ? item.category : item.categoryPt}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${progressBgColor}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                          <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-305">
                            {item.stockLevel.toLocaleString()} / {item.maxStock.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                        {formatValue(item.price, currency)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[9px] font-extrabold uppercase tracking-wide ${statusBadgeColor}`}>
                          {language === 'en' ? item.status : item.statusPt}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {isLow && (
                          <button
                            onClick={() => handleRestock(item.sku)}
                            className="bg-transparent hover:underline text-secondary hover:text-secondary/80 text-xs font-black mr-3 cursor-pointer"
                          >
                            {language === 'en' ? 'Restock' : 'Repor'}
                          </button>
                        )}
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded inline-block text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white mr-1 cursor-pointer">
                          <Edit3 size={13} />
                        </button>
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded inline-block text-slate-400 cursor-pointer">
                          <MoreVertical size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: item.id, label: item.name })}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-950/30 rounded inline-block text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                          title={language === 'en' ? 'Delete item' : 'Eliminar item'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    {language === 'en' ? 'No stock records found matching filters.' : 'Nenhum registro de stock encontrado.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Footer */}
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'en' ? (
              <>
                Showing <span className="font-bold text-slate-800 dark:text-slate-205">{indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredItems.length)}</span> of <span className="font-bold text-slate-808 dark:text-slate-200">{filteredItems.length}</span> items
              </>
            ) : (
              <>
                A mostrar <span className="font-bold text-slate-800 dark:text-slate-205">{indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredItems.length)}</span> de <span className="font-bold text-slate-808 dark:text-slate-200">{filteredItems.length}</span> itens
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 font-medium">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center rounded border border-slate-202 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-smooth cursor-pointer text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`w-8 h-8 rounded text-xs font-bold transition-smooth cursor-pointer ${
                  currentPage === index + 1
                    ? 'bg-primary text-white'
                    : 'border border-slate-202 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-305'
                }`}
              >
                {index + 1}
              </button>
            ))}

            <button
               onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
               disabled={currentPage === totalPages}
               className="w-8 h-8 flex items-center justify-center rounded border border-slate-202 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40 transition-smooth cursor-pointer text-slate-400"
             >
               <ChevronRight size={16} />
             </button>
          </div>
        </div>
      </div>

    </div>
    </>
  );
}
