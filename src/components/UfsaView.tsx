/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, ExternalLink, RefreshCw, AlertCircle,
  Megaphone, Calendar, Building2, Banknote, Clock, X, ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Language } from '../types';

interface Oportunidade {
  referencia: string;
  numero_concurso: string | null;
  regime: string | null;
  modalidade: string | null;
  classe: string | null;
  objeto_geral: string | null;
  ugea: string | null;
  moeda: string;
  valor_estimado: number | null;
  garantia_provisoria: number | null;
  criterio_adjudicacao: string | null;
  data_lancamento: string | null;
  numero_lotes: string | null;
  entrega_propostas: string | null;
  data_abertura: string | null;
  hora_entrega: string | null;
  hora_abertura: string | null;
  observacoes: string | null;
  data_publicacao: string | null;
  actualizado_em: string;
}

interface UfsaViewProps {
  language: Language;
  onNewItems?: (hasNew: boolean) => void;
}

// ─── Badge colours per modalidade ───────────────────────────────────────────
function modalidadeBadge(modalidade: string | null): string {
  if (!modalidade) return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  if (modalidade.includes('LIMITADO'))    return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  if (modalidade.includes('COTACOES') || modalidade.includes('COTAÇÕES'))
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
  // CONCURSO PUBLICO default → navy
  return 'bg-[#0c1c48]/10 text-[#0c1c48] dark:bg-[#24325e]/40 dark:text-[#b7c5fa]';
}

// ─── Formatters ──────────────────────────────────────────────────────────────
function formatValor(value: number | null, moeda: string): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: moeda === 'USD' ? 'USD' : 'MZN',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateDisplay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  const diff = d.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function UfsaView({ language, onNewItems }: UfsaViewProps) {
  const [items, setItems]             = useState<Oportunidade[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [syncing, setSyncing]         = useState(false);

  const [search, setSearch]           = useState('');
  const [filterModalidade, setFilterModalidade] = useState('');
  const [filterClasse, setFilterClasse]         = useState('');
  const [filterMoeda, setFilterMoeda]           = useState('');
  const [filterRegime, setFilterRegime]         = useState('');

  const LAST_SEEN_KEY = 'ufsa_last_seen_ts';

  // ─── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    // Capture lastSeen BEFORE any await — Effect 2 will update it on mount,
    // but we want to compare against the previous visit's timestamp.
    const lastSeen = localStorage.getItem(LAST_SEEN_KEY) ?? '';
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('oportunidades')
        .select('*')
        .order('data_abertura', { ascending: true, nullsFirst: false });

      if (err) throw err;
      const rows = (data ?? []) as Oportunidade[];
      setItems(rows);

      // Badge logic — compare max(actualizado_em) with pre-fetch lastSeen
      if (rows.length > 0) {
        const maxTs = rows.reduce((acc, r) =>
          r.actualizado_em > acc ? r.actualizado_em : acc, rows[0].actualizado_em);
        onNewItems?.(maxTs > lastSeen);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [onNewItems]);

  useEffect(() => { loadData(); }, [loadData]);

  // Mark as seen when user opens the tab
  useEffect(() => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    onNewItems?.(false);
  }, [onNewItems]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('oportunidades-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oportunidades' }, () => {
        loadData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  // ─── Manual sync ───────────────────────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      await supabase.functions.invoke('ufsa-scraper');
      await loadData();
    } catch {
      // errors surfaced by loadData
    } finally {
      setSyncing(false);
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────────
  const modalidades = [...new Set(items.map(i => i.modalidade).filter(Boolean))] as string[];
  const classes     = [...new Set(items.map(i => i.classe).filter(Boolean))] as string[];
  const regimes     = [...new Set(items.map(i => i.regime).filter(Boolean))] as string[];

  const filtered = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (item.objeto_geral ?? '').toLowerCase().includes(q) ||
      (item.ugea ?? '').toLowerCase().includes(q) ||
      (item.referencia ?? '').toLowerCase().includes(q);
    const matchMod   = !filterModalidade || item.modalidade === filterModalidade;
    const matchCls   = !filterClasse    || item.classe === filterClasse;
    const matchMoeda = !filterMoeda     || item.moeda === filterMoeda;
    const matchReg   = !filterRegime    || item.regime === filterRegime;
    return matchSearch && matchMod && matchCls && matchMoeda && matchReg;
  });

  const lastUpdate = items.length > 0
    ? items.reduce((a, b) => b.actualizado_em > a ? b.actualizado_em : a, items[0].actualizado_em)
    : null;

  const hasFilters = !!(search || filterModalidade || filterClasse || filterMoeda || filterRegime);

  const clearFilters = () => {
    setSearch('');
    setFilterModalidade('');
    setFilterClasse('');
    setFilterMoeda('');
    setFilterRegime('');
  };

  // ─── Select helper ─────────────────────────────────────────────────────────
  const selectClass = 'appearance-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 pr-7 cursor-pointer focus:outline-none focus:ring-1 focus:ring-secondary/40';

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animation-fade-in font-sans text-left">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-display flex items-center gap-2">
            <Megaphone size={22} className="text-secondary" />
            {language === 'en' ? 'UFSA Public Tenders' : 'Concursos Públicos UFSA'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {language === 'en'
              ? 'Live listings from the Unit for Supervision of Public Procurement (UFSA).'
              : 'Listagem em tempo real da Unidade Funcional de Supervisão das Aquisições (UFSA).'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start shrink-0">
          <button
            onClick={handleSync}
            disabled={syncing}
            title={language === 'en' ? 'Fetch latest tenders from UFSA' : 'Obter concursos mais recentes da UFSA'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary hover:bg-primary-container disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors self-start shrink-0 cursor-pointer"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing
              ? (language === 'en' ? 'Syncing…' : 'A sincronizar…')
              : (language === 'en' ? 'Sync now' : 'Sincronizar')}
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={language === 'en' ? 'Search by object or entity…' : 'Pesquisar por objecto ou entidade…'}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-secondary/40"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={12} className="text-slate-400 shrink-0" />

          <div className="relative">
            <select value={filterModalidade} onChange={e => setFilterModalidade(e.target.value)} className={selectClass}>
              <option value="">{language === 'en' ? 'All types' : 'Todas modalidades'}</option>
              {modalidades.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative">
            <select value={filterClasse} onChange={e => setFilterClasse(e.target.value)} className={selectClass}>
              <option value="">{language === 'en' ? 'All classes' : 'Todas classes'}</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative">
            <select value={filterMoeda} onChange={e => setFilterMoeda(e.target.value)} className={selectClass}>
              <option value="">{language === 'en' ? 'MZN / USD' : 'MZN / USD'}</option>
              <option value="MZN">MZN</option>
              <option value="USD">USD</option>
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative">
            <select value={filterRegime} onChange={e => setFilterRegime(e.target.value)} className={selectClass}>
              <option value="">{language === 'en' ? 'All regimes' : 'Todos regimes'}</option>
              {regimes.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-smooth"
            >
              <X size={11} /> {language === 'en' ? 'Clear' : 'Limpar'}
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {!loading && !error && (
        <p className="text-[10px] text-slate-400">
          {filtered.length === items.length
            ? `${items.length} concurso${items.length !== 1 ? 's' : ''}`
            : `${filtered.length} de ${items.length} concursos`}
        </p>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded p-5 space-y-3 animate-pulse">
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertCircle size={40} className="text-red-400" />
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center max-w-xs">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded hover:bg-primary/90 transition-smooth"
          >
            {language === 'en' ? 'Try again' : 'Tentar novamente'}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Megaphone size={40} className="text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {hasFilters
              ? (language === 'en' ? 'No tenders match your filters.' : 'Nenhum concurso corresponde aos filtros.')
              : (language === 'en' ? 'No tenders found.' : 'Nenhum concurso encontrado.')
            }
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-secondary hover:underline">
              {language === 'en' ? 'Clear filters' : 'Limpar filtros'}
            </button>
          )}
        </div>
      )}

      {/* Cards grid */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => {
            const days = daysUntil(item.data_abertura);
            const isUrgent = days !== null && days >= 0 && days <= 3;
            const isPast   = days !== null && days < 0;
            return (
              <div
                key={item.referencia}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded shadow-xs hover:shadow-md transition-smooth flex flex-col"
              >
                {/* Card header stripe */}
                <div className={`h-1 rounded-t ${isUrgent ? 'bg-red-500' : isPast ? 'bg-slate-300 dark:bg-slate-700' : 'bg-[#0c1c48]'}`} />

                <div className="p-5 flex flex-col gap-3 flex-1">
                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${modalidadeBadge(item.modalidade)}`}>
                      {item.modalidade ?? '—'}
                    </span>
                    {item.classe && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {item.classe}
                      </span>
                    )}
                    {item.moeda === 'USD' && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        USD
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug font-display line-clamp-3">
                    {item.objeto_geral ?? '—'}
                  </h3>

                  {/* Entity */}
                  <div className="flex items-start gap-1.5">
                    <Building2 size={12} className="text-slate-400 mt-0.5 shrink-0" />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{item.ugea ?? '—'}</span>
                  </div>

                  {/* Value */}
                  {item.valor_estimado !== null && (
                    <div className="flex items-center gap-1.5">
                      <Banknote size={12} className="text-secondary shrink-0" />
                      <span className="text-xs font-semibold text-secondary">
                        {formatValor(item.valor_estimado, item.moeda)}
                      </span>
                    </div>
                  )}

                  {/* Abertura date */}
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className={`shrink-0 ${isUrgent ? 'text-red-500' : 'text-slate-400'}`} />
                    <span className={`text-xs font-medium ${isUrgent ? 'text-red-600 dark:text-red-400' : isPast ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                      {formatDateDisplay(item.data_abertura)}
                      {item.hora_abertura && ` — ${item.hora_abertura}`}
                    </span>
                    {isUrgent && (
                      <span className="ml-auto shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">
                        {days === 0
                          ? (language === 'en' ? 'Today' : 'Hoje')
                          : `${days}d`}
                      </span>
                    )}
                    {isPast && (
                      <span className="ml-auto shrink-0 text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-400 dark:bg-slate-800">
                        {language === 'en' ? 'Closed' : 'Encerrado'}
                      </span>
                    )}
                  </div>

                  {/* Referência + hora entrega */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-mono">{item.referencia}</span>
                    {item.hora_entrega && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock size={10} /> {item.hora_entrega}
                      </span>
                    )}
                  </div>

                  {/* Spacer + button */}
                  <div className="mt-auto pt-2">
                    <a
                      href={`https://www.ufsa.gov.mz/concurso_detalhes.php?referencia=${encodeURIComponent(item.referencia)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-primary/5 hover:bg-primary/10 dark:bg-[#24325e]/30 dark:hover:bg-[#24325e]/50 text-primary dark:text-[#b7c5fa] text-xs font-bold rounded transition-smooth border border-primary/10 dark:border-[#24325e]/40"
                    >
                      <ExternalLink size={11} />
                      {language === 'en' ? 'View Details' : 'Ver Detalhes'}
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
        <span>
          {language === 'en' ? 'Last update:' : 'Última actualização:'}{' '}
          <span className="font-medium text-slate-500">{formatTimestamp(lastUpdate)}</span>
        </span>
        <a
          href="https://www.ufsa.gov.mz/concursos.php"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-secondary hover:underline"
        >
          <ExternalLink size={10} /> ufsa.gov.mz
        </a>
      </div>
    </div>
  );
}
