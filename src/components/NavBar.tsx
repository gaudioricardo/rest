import {
  LayoutDashboard,
  FileText,
  FileCode,
  Receipt,
  ShoppingCart,
  UserRound,
  BarChart2,
  Package,
  CreditCard,
  Users,
  Megaphone,
  Settings,
  Languages,
  LogOut,
} from 'lucide-react';
import { Language } from '../types';

interface NavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  onLogout: () => void;
  hasNewUfsa?: boolean;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', labelPt: 'Painel',     icon: LayoutDashboard },
  { id: 'invoices',  label: 'Invoices',  labelPt: 'Facturas',   icon: FileText        },
  { id: 'quotes',    label: 'Quotes',    labelPt: 'Cotações',   icon: FileCode        },
  { id: 'receipts',  label: 'Receipts',  labelPt: 'Recibos',    icon: Receipt         },
  { id: 'vendas',    label: 'Sales',     labelPt: 'Vendas',     icon: ShoppingCart    },
  { id: 'clientes',  label: 'Clients',   labelPt: 'Clientes',   icon: UserRound       },
  { id: 'reports',   label: 'Reports',   labelPt: 'Relatórios', icon: BarChart2       },
  { id: 'stock',     label: 'Inventory', labelPt: 'Inventário', icon: Package         },
  { id: 'expenses',  label: 'Expenses',  labelPt: 'Despesas',   icon: CreditCard      },
  { id: 'contacts',  label: 'Contacts',  labelPt: 'Contactos',  icon: Users           },
];

export default function NavBar({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  onLogout,
  hasNewUfsa = false,
}: NavBarProps) {
  return (
    <nav className="sticky top-16 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-stretch justify-center px-4 sm:px-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        {/* ── Main navigation items ──────────────────────────────── */}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const label = language === 'en' ? item.label : item.labelPt;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={label}
              className={[
                'flex items-center gap-1.5 px-3 py-3.5 text-xs whitespace-nowrap',
                'transition-all duration-150 border-b-2 -mb-px',
                isActive
                  ? 'text-primary border-primary font-semibold'
                  : 'text-primary/55 dark:text-slate-400 border-transparent hover:text-secondary hover:font-bold hover:border-secondary/40',
              ].join(' ')}
            >
              <Icon size={14} />
              <span>{label}</span>
            </button>
          );
        })}

        {/* ── UFSA ───────────────────────────────────────────────── */}
        <button
          onClick={() => setActiveTab('ufsa')}
          title={language === 'en' ? 'UFSA Public Tenders' : 'Concursos UFSA'}
          className={[
            'relative flex items-center gap-1.5 px-3 py-3.5 text-xs whitespace-nowrap',
            'transition-all duration-150 border-b-2 -mb-px',
            activeTab === 'ufsa'
              ? 'text-primary border-primary font-semibold'
              : 'text-primary/55 dark:text-slate-400 border-transparent hover:text-secondary hover:font-bold hover:border-secondary/40',
          ].join(' ')}
        >
          <Megaphone size={14} />
          <span>UFSA</span>
          {hasNewUfsa && activeTab !== 'ufsa' && (
            <span className="absolute top-2.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
          )}
        </button>

        {/* ── Divider ───────────────────────────────────────────── */}
        <div className="my-3 w-px bg-slate-200 dark:bg-slate-700 flex-shrink-0" />

        {/* ── Language toggle ─────────────────────────────────────── */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'pt' : 'en')}
          title={language === 'en' ? 'Toggle Language' : 'Alterar Idioma'}
          className="flex items-center gap-1.5 px-3 py-3.5 text-xs whitespace-nowrap text-primary/55 dark:text-slate-400 border-b-2 border-transparent -mb-px hover:text-secondary hover:font-bold transition-all duration-150"
        >
          <Languages size={14} />
          <span>{language === 'en' ? 'PT / EN' : 'EN / PT'}</span>
        </button>

        {/* ── Settings ────────────────────────────────────────────── */}
        <button
          onClick={() => setActiveTab('settings')}
          title={language === 'en' ? 'Settings' : 'Definições'}
          className={[
            'flex items-center gap-1.5 px-3 py-3.5 text-xs whitespace-nowrap',
            'transition-all duration-150 border-b-2 -mb-px',
            activeTab === 'settings'
              ? 'text-primary border-primary font-semibold'
              : 'text-primary/55 dark:text-slate-400 border-transparent hover:text-secondary hover:font-bold hover:border-secondary/40',
          ].join(' ')}
        >
          <Settings size={14} />
          <span>{language === 'en' ? 'Settings' : 'Definições'}</span>
        </button>

        {/* ── Sign Out ────────────────────────────────────────────── */}
        <button
          onClick={onLogout}
          title={language === 'en' ? 'Sign Out' : 'Sair'}
          className="flex items-center gap-1.5 px-3 py-3.5 text-xs whitespace-nowrap text-red-400 dark:text-red-400 border-b-2 border-transparent -mb-px hover:text-red-500 hover:font-bold transition-all duration-150"
        >
          <LogOut size={14} />
          <span>{language === 'en' ? 'Sign Out' : 'Sair'}</span>
        </button>

      </div>
    </nav>
  );
}
