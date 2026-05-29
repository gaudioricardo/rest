/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Building2, Phone, CreditCard, Smartphone, ImageIcon, FileDown } from 'lucide-react';
import { Language, CompanySettings, BankAccount, MobileContact } from '../types';

interface SettingsViewProps {
  language: Language;
  settings: CompanySettings;
  onSave: (updates: Partial<CompanySettings>) => Promise<void>;
  onComplete: () => void;
  isFirstSetup: boolean;
  onGenerateModel: () => void;
}

const STEPS = [
  { id: 1, label: 'Empresa',          labelEn: 'Company',         icon: Building2  },
  { id: 2, label: 'Contactos',        labelEn: 'Contacts',        icon: Phone      },
  { id: 3, label: 'Bancos',           labelEn: 'Banks',           icon: CreditCard },
  { id: 4, label: 'Pagam. Móveis',    labelEn: 'Mobile',          icon: Smartphone },
  { id: 5, label: 'Marca',            labelEn: 'Brand',           icon: ImageIcon  },
];

const inputCls = 'w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-900 transition-all';
const labelCls = 'block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5';

export default function SettingsView({
  language,
  settings,
  onSave,
  onComplete,
  isFirstSetup,
  onGenerateModel,
}: SettingsViewProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection]     = useState(1);
  const [saving, setSaving]           = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Step 1
  const [companyName, setCompanyName] = useState(settings.companyName || '');
  const [nuit,        setNuit]        = useState(settings.nuit        || '');
  const [address,     setAddress]     = useState(settings.address     || '');
  const [city,        setCity]        = useState(settings.city        || '');

  // Step 2
  const [email, setEmail] = useState(settings.email || '');
  const [phone, setPhone] = useState(settings.phone || '');

  // Step 3
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(
    settings.bankAccounts?.length ? settings.bankAccounts : [{ bank: '', iban: '' }]
  );

  // Step 4
  const [mobileContacts, setMobileContacts] = useState<MobileContact[]>(
    settings.mobileContacts?.length ? settings.mobileContacts : [{ provider: 'M-Pesa', number: '' }]
  );

  // Step 5
  const [logoBase64,  setLogoBase64]  = useState<string | undefined>(settings.logoBase64);
  const [stampBase64, setStampBase64] = useState<string | undefined>(settings.stampBase64);
  const logoInputRef  = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);

  const handleFileRead = (file: File, setter: (v: string) => void) => {
    const reader = new FileReader();
    reader.onload = e => { if (e.target?.result) setter(e.target.result as string); };
    reader.readAsDataURL(file);
  };

  const getStepData = (step: number): Partial<CompanySettings> => {
    switch (step) {
      case 1: return { companyName, nuit, address, city };
      case 2: return { email, phone };
      case 3: return { bankAccounts: bankAccounts.filter(b => b.bank.trim() || b.iban.trim()) };
      case 4: return { mobileContacts: mobileContacts.filter(m => m.number.trim()) };
      case 5: return { logoBase64, stampBase64 };
      default: return {};
    }
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      await onSave(getStepData(currentStep));
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      if (currentStep < STEPS.length) { setDirection(1); setCurrentStep(s => s + 1); }
    } finally { setSaving(false); }
  };

  const handleBack = () => {
    if (currentStep > 1) { setDirection(-1); setCurrentStep(s => s - 1); }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await onSave({ ...getStepData(currentStep), setupComplete: true });
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      onComplete();
    } finally { setSaving(false); }
  };

  const variants = {
    enter:  (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  // ─── Step content panels ──────────────────────────────────────────────────

  const step1 = (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        {language === 'en'
          ? 'This information will appear on all your invoices, quotes and receipts.'
          : 'Esta informação aparecerá em todas as suas facturas, cotações e recibos.'}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>{language === 'en' ? 'Company Name *' : 'Nome da Empresa *'}</label>
          <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
            placeholder="Minha Empresa Lda." className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>NUIT *</label>
          <input type="text" value={nuit} onChange={e => setNuit(e.target.value)}
            placeholder="400261845" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{language === 'en' ? 'City' : 'Cidade'}</label>
          <input type="text" value={city} onChange={e => setCity(e.target.value)}
            placeholder="Maputo" className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>{language === 'en' ? 'Address' : 'Endereço'}</label>
          <input type="text" value={address} onChange={e => setAddress(e.target.value)}
            placeholder="Av. Julius Nyerere, 123" className={inputCls} />
        </div>
      </div>
    </div>
  );

  const step2 = (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        {language === 'en'
          ? 'Your business contact details for documents and client communication.'
          : 'Os dados de contacto da empresa para documentos e comunicações com clientes.'}
      </p>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="geral@empresa.co.mz" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>{language === 'en' ? 'Phone / Fax' : 'Telefone / Fax'}</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+258 21 000 000" className={inputCls} />
        </div>
      </div>
    </div>
  );

  const step3 = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {language === 'en' ? 'Bank account details shown on invoices.' : 'Dados bancários apresentados nas facturas.'}
        </p>
        <button type="button" onClick={() => setBankAccounts(p => [...p, { bank: '', iban: '' }])}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors shrink-0 ml-4">
          <Plus size={13} />{language === 'en' ? 'Add' : 'Adicionar'}
        </button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {bankAccounts.map((ba, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <input type="text" value={ba.bank}
              onChange={e => { const u = [...bankAccounts]; u[idx] = { ...u[idx], bank: e.target.value }; setBankAccounts(u); }}
              placeholder={language === 'en' ? 'Bank name' : 'Nome do Banco'}
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900" />
            <input type="text" value={ba.iban}
              onChange={e => { const u = [...bankAccounts]; u[idx] = { ...u[idx], iban: e.target.value }; setBankAccounts(u); }}
              placeholder="IBAN / NIB"
              className="flex-[2] p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900" />
            <button type="button" onClick={() => setBankAccounts(p => p.filter((_, i) => i !== idx))}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const step4 = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {language === 'en' ? 'Mobile wallet numbers for payment.' : 'Números de carteira móvel para pagamento.'}
        </p>
        <button type="button" onClick={() => setMobileContacts(p => [...p, { provider: 'M-Pesa', number: '' }])}
          className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors shrink-0 ml-4">
          <Plus size={13} />{language === 'en' ? 'Add' : 'Adicionar'}
        </button>
      </div>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {mobileContacts.map((mc, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <select value={mc.provider}
              onChange={e => { const u = [...mobileContacts]; u[idx] = { ...u[idx], provider: e.target.value }; setMobileContacts(u); }}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900 font-semibold shrink-0">
              <option>M-Pesa</option><option>E-Mola</option><option>Movitel</option><option>Vodacom</option>
            </select>
            <input type="text" value={mc.number}
              onChange={e => { const u = [...mobileContacts]; u[idx] = { ...u[idx], number: e.target.value }; setMobileContacts(u); }}
              placeholder="+258 84 000 0000"
              className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-primary text-slate-900" />
            <button type="button" onClick={() => setMobileContacts(p => p.filter((_, i) => i !== idx))}
              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const step5 = (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        {language === 'en'
          ? 'Upload your logo and stamp — they will be placed on all generated documents.'
          : 'Carregue o seu logotipo e carimbo — serão colocados em todos os documentos gerados.'}
      </p>

      {/* Logo */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        {logoBase64
          ? <img src={logoBase64} alt="Logo" className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0" />
          : <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white shrink-0">
              <ImageIcon size={24} className="text-slate-300" />
            </div>
        }
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700 mb-0.5">
            {language === 'en' ? 'Company Logo' : 'Logotipo da Empresa'}
          </p>
          <p className="text-xs text-slate-400 mb-2">PNG, JPG — {language === 'en' ? 'recommended 300×150 px' : 'recomendado 300×150 px'}</p>
          <button type="button" onClick={() => logoInputRef.current?.click()}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
            {logoBase64 ? (language === 'en' ? 'Change' : 'Alterar') : (language === 'en' ? 'Upload' : 'Carregar')}
          </button>
          <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f, setLogoBase64); }} />
        </div>
      </div>

      {/* Stamp */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        {stampBase64
          ? <img src={stampBase64} alt="Carimbo" className="w-20 h-20 object-contain rounded-lg border border-slate-200 bg-white p-1 shrink-0" />
          : <div className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center bg-white shrink-0">
              <ImageIcon size={24} className="text-slate-300" />
            </div>
        }
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-700 mb-0.5">
            {language === 'en' ? 'Company Stamp' : 'Carimbo da Empresa'}
          </p>
          <p className="text-xs text-slate-400 mb-2">PNG {language === 'en' ? 'with transparent background' : 'com fundo transparente'}</p>
          <button type="button" onClick={() => stampInputRef.current?.click()}
            className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
            {stampBase64 ? (language === 'en' ? 'Change' : 'Alterar') : (language === 'en' ? 'Upload' : 'Carregar')}
          </button>
          <input ref={stampInputRef} type="file" accept="image/png,image/jpeg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileRead(f, setStampBase64); }} />
        </div>
      </div>

      {/* Generate model */}
      <button type="button" onClick={onGenerateModel}
        className="w-full py-3 bg-secondary hover:bg-secondary/90 text-white text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm">
        <FileDown size={16} />
        {language === 'en' ? 'Generate PDF Model' : 'Gerar Modelo PDF'}
      </button>
      <p className="text-[11px] text-slate-400 text-center -mt-2">
        {language === 'en'
          ? 'Downloads a sample invoice with your current settings'
          : 'Descarrega uma factura de exemplo com as configurações actuais'}
      </p>
    </div>
  );

  const stepContent = [step1, step2, step3, step4, step5][currentStep - 1];

  // ─── Card ──────────────────────────────────────────────────────────────────

  const card = (
    <div className="bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden">

      {/* Top gradient accent */}
      <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />

      {/* Header */}
      <div className="px-4 pt-5 pb-4 sm:px-8 sm:pt-7 sm:pb-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {language === 'en' ? 'Company Setup' : 'Configuração da Empresa'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'en'
                ? 'Complete your profile before using the system'
                : 'Complete o seu perfil antes de usar o sistema'}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full mt-0.5 shrink-0">
            {currentStep} / {STEPS.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-5 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <motion.div className="bg-gradient-to-r from-primary to-secondary h-full rounded-full"
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.45, ease: 'easeInOut' }} />
        </div>

        {/* Step dots */}
        <div className="mt-4 flex items-center justify-between">
          {STEPS.map(step => {
            const done    = completedSteps.has(step.id);
            const current = currentStep === step.id;
            const Icon    = step.icon;
            return (
              <div key={step.id} className="flex flex-col items-center gap-1.5 flex-1">
                <motion.div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    done    ? 'bg-primary border-primary text-white shadow-md shadow-primary/25'
                    : current ? 'bg-white border-primary text-primary shadow-md shadow-primary/15'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                  }`}
                  animate={current ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={current ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } : {}}>
                  {done ? <Check size={15} /> : <Icon size={15} />}
                </motion.div>
                <span className={`text-[10px] font-semibold hidden sm:block text-center leading-tight ${
                  current ? 'text-primary' : done ? 'text-slate-500' : 'text-slate-300'
                }`}>
                  {language === 'en' ? step.labelEn : step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-100 mx-4 sm:mx-8" />

      {/* Step content */}
      <div className="px-4 py-5 sm:px-8 sm:py-6" style={{ minHeight: 340 }}>
        <AnimatePresence custom={direction} mode="wait">
          <motion.div key={currentStep} custom={direction} variants={variants}
            initial="enter" animate="center" exit="exit"
            transition={{ duration: 0.22, ease: 'easeInOut' }}>
            {stepContent}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 pb-5 pt-3 border-t border-slate-100 flex flex-col gap-3 sm:px-8 sm:pb-7 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={handleBack} disabled={currentStep === 1}
          className="order-2 flex items-center justify-center gap-1.5 px-5 py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-semibold text-sm rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed sm:order-1">
          <ChevronLeft size={15} />
          {language === 'en' ? 'Back' : 'Anterior'}
        </button>

        <div className="order-1 flex w-full flex-wrap items-center justify-between gap-2 sm:order-2 sm:w-auto sm:justify-end">
          {/* Step indicators mini */}
          <div className="flex gap-1.5 mr-0 sm:mr-3">
            {STEPS.map(s => (
              <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${
                s.id === currentStep ? 'w-5 bg-primary' : completedSteps.has(s.id) ? 'w-1.5 bg-primary/40' : 'w-1.5 bg-slate-200'
              }`} />
            ))}
          </div>

          {currentStep < STEPS.length ? (
            <button type="button" onClick={handleNext} disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-60 shadow-sm active:scale-98 sm:w-auto">
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>{language === 'en' ? 'Next' : 'Próximo'} <ChevronRight size={15} /></>}
            </button>
          ) : (
            <button type="button" onClick={handleComplete} disabled={saving}
              className="flex w-full items-center justify-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-60 shadow-sm active:scale-98 sm:w-auto">
              {saving
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><Check size={15} /> {language === 'en' ? 'Complete Setup' : 'Concluir'}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isFirstSetup) {
    return (
      <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
        <div className="min-h-screen flex items-center justify-center px-3 py-6 sm:px-4 sm:py-12">
          <div className="w-full max-w-[min(100vw-1rem,36rem)]">
            {card}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-3 sm:px-4 flex justify-center">
      <div className="w-full max-w-[min(100vw-1rem,36rem)]">
        {card}
      </div>
    </div>
  );
}
