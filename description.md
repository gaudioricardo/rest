# Rest ERP — Descrição do Projecto

> **"Where growth finds space"**
> Sistema de Gestão Empresarial (ERP) para Moçambique, disponível em aplicação web e mobile.

---

## Visão Geral

**Rest ERP** é uma plataforma de gestão comercial completa, construída para pequenas e médias empresas moçambicanas. Cobre o ciclo completo de negócio — desde cotações até recibos — com suporte a múltiplas empresas, exportação de documentos fiscais (PDF) e relatórios contabilísticos detalhados.

A plataforma existe em duas versões que partilham o mesmo backend Supabase:

| Plataforma | Tecnologia | Localização |
|---|---|---|
| Web App | React 19 + Vite + Tailwind CSS v4 | `src/` |
| Mobile App | Expo 52 + Expo Router + React Native | `mobile_app/` |

---

## Stack Tecnológica

### Web App
- **Framework:** React 19 + Vite 6
- **Estilos:** Tailwind CSS v4
- **Backend/Auth:** Supabase (PostgreSQL + Auth)
- **PDF:** jsPDF + jsPDF-autoTable + html2canvas
- **Excel:** SheetJS (xlsx)
- **Ícones:** Lucide React
- **Animações:** Motion (Framer Motion v12)
- **Linguagem:** TypeScript

### Mobile App
- **Framework:** Expo SDK 52 + Expo Router 4
- **Estado:** Zustand (authStore, dataStore, settingsStore)
- **Backend/Auth:** @supabase/supabase-js + AsyncStorage
- **PDF:** expo-print + expo-sharing
- **Excel/CSV:** expo-file-system + expo-sharing
- **Fontes:** @expo-google-fonts/playfair-display
- **Linguagem:** TypeScript

---

## Arquitectura

```
rest_web_app/
├── src/
│   ├── App.tsx                  # Raiz da app — estado global, handlers, routing por tab
│   ├── types.ts                 # Tipos TypeScript partilhados
│   ├── data.ts                  # Helpers de formatação (formatValue)
│   ├── assets/                  # Logo.webp, Logo_extended.webp, dark.png
│   ├── components/
│   │   ├── AuthView.tsx         # Login / Registo
│   │   ├── DashboardView.tsx    # Painel principal com KPIs
│   │   ├── InvoicesView.tsx     # Gestão de Facturas
│   │   ├── QuotesView.tsx       # Gestão de Cotações
│   │   ├── ReceiptsView.tsx     # Gestão de Recibos
│   │   ├── ExpensesView.tsx     # Gestão de Despesas
│   │   ├── StockView.tsx        # Gestão de Inventário
│   │   ├── ContactsView.tsx     # Directório de Contactos
│   │   ├── ClientesView.tsx     # Clientes Devedores
│   │   ├── ReportsView.tsx      # Relatórios Financeiros (PDF + Excel)
│   │   ├── SettingsView.tsx     # Configurações da Empresa (wizard 5 passos)
│   │   ├── NewsView.tsx         # Notícias / Actualizações
│   │   ├── Header.tsx           # Cabeçalho dinâmico por tab
│   │   ├── SidebarLeft.tsx      # Barra de navegação inferior esquerda
│   │   ├── SidebarRight.tsx     # Barra de navegação inferior direita
│   │   ├── PdfOptionsModal.tsx  # Modal de opções de imposto para PDF
│   │   └── DeleteConfirmModal.tsx
│   └── lib/
│       ├── supabase.ts          # Cliente Supabase
│       ├── db.ts                # Todas as operações CRUD (Supabase)
│       ├── pdf.ts               # Geração de PDF (Facturas, Cotações, Recibos, Relatórios)
│       └── excel.ts             # Geração de Excel (Relatório financeiro, 5 sheets)
│
└── mobile_app/
    ├── app/
    │   ├── _layout.tsx          # Preloader + navegação raiz
    │   ├── (auth)/login.tsx     # Autenticação
    │   └── (app)/
    │       ├── _layout.tsx      # Layout autenticado
    │       ├── (tabs)/          # Tabs principais
    │       │   ├── index.tsx    # Dashboard
    │       │   ├── invoices.tsx
    │       │   ├── quotes.tsx
    │       │   ├── receipts.tsx
    │       │   ├── clients.tsx
    │       │   ├── reports.tsx  # Relatórios (PDF + CSV)
    │       │   └── more.tsx
    │       ├── invoice/         # Detalhe / criação de Factura
    │       ├── quote/           # Detalhe / criação de Cotação
    │       ├── receipt/         # Detalhe / criação de Recibo
    │       ├── stock/           # Gestão de Stock
    │       ├── expense/         # Registo de Despesas
    │       ├── contact/         # Contactos
    │       ├── client/          # Detalhe de Cliente Devedor
    │       └── settings/        # Configurações (wizard 5 passos)
    ├── stores/
    │   ├── authStore.ts
    │   ├── dataStore.ts
    │   └── settingsStore.ts
    ├── lib/
    │   ├── db.ts                # CRUD Supabase (mobile)
    │   └── pdf.ts               # Geração PDF via expo-print (HTML → PDF)
    ├── shared/
    │   ├── types.ts             # Tipos TypeScript partilhados
    │   ├── theme.ts             # Colors, Spacing, Radius, FontSize, Shadow
    │   └── i18n.ts             # Traduções PT/EN + formatCurrency + formatDate
    └── components/ui/           # Componentes reutilizáveis (Badge, TabBar, DocumentListItem, ...)
```

---

## Módulos / Funcionalidades

### Autenticação
- Login e registo via Supabase Auth
- Persistência de sessão (localStorage / AsyncStorage)
- Wizard de configuração inicial obrigatório na primeira utilização

### Dashboard
- KPI cards: Total Facturado, Recebido, Pendente, Stock Crítico
- Transacções recentes
- Itens em stock crítico
- Acções rápidas (Nova Factura, Novo Stock, Gerar Relatório)

### Cotações (`COT-XXXX`)
- Criação com linhas de item (descrição, quantidade, preço unitário)
- Estados: **Pendente → Aprovado → Liquidado / Rejeitado**
- Aprovação manual ou automática (ao criar Factura para o mesmo cliente)
- Liquidação automática ao pagar Factura
- Exportação PDF (A4 Portrait) — logótipo, carimbo, ISPC/IVA/Isento, valor por extenso
- Suporte a empresa primária / secundária

### Facturas (`FAC-XXXX`)
- Criação com linhas de item, NUIT, telefone e email do cliente
- Estados: **Pendente → Pago / Vencido**
- Ao marcar como pago: gera Recibo automaticamente + decrementa stock + liquida cotações do cliente
- Exportação PDF (A5 Landscape) — logótipo, carimbo, ISPC/IVA/Isento
- Suporte a empresa primária / secundária

### Recibos (`REC-XXXX`)
- Criação manual ou automática (ao pagar Factura)
- Métodos de pagamento: Transferência Bancária, M-Pesa, E-Mola, Numerário
- Ao criar recibo: vincula factura → marca como paga + liquida cotações + liquida cliente devedor
- Exportação PDF (A5 Landscape) — logótipo, carimbo, dados bancários/carteira móvel
- Suporte a empresa primária / secundária

### Despesas (`EXP-XXXX`)
- Registo por comerciante, categoria e data
- Categorias: Logística, Material de Escritório, Infraestrutura Cloud
- Estados: Aprovado / Pendente / Rejeitado

### Stock / Inventário
- Artigos com SKU, categoria, nível actual e máximo
- Indicadores visuais: Em Stock / Stock Baixo / Sem Stock
- Decremento automático ao liquidar Facturas

### Contactos
- Directório corporativo (nome, empresa, cargo, email, telefone)

### Clientes Devedores
- Lista de clientes com estado **Pendente / Liquidado**
- Registo automático ao criar Factura ou Cotação
- Liquidação automática ao emitir Recibo
- Contactos Movitel e Vodacom por cliente

### Relatórios Financeiros
- **Filtros de período:** Último mês (30 dias), Últimos 3 meses (90 dias), Intervalo personalizado
- **6 KPIs:** Total Facturado, Total Recebido, Pendente, Vencido, Total Despesas, Resultado Líquido
- **4 tabelas com breakdown de estado:**
  - Facturas (Pagas / Pendentes / Vencidas)
  - Cotações (Aprovadas / Pendentes / Rejeitadas / Liquidadas)
  - Recibos (por método de pagamento)
  - Despesas (por categoria)
- **Saldo Contabilístico** (Facturado · Recebido · Despesas · Resultado Líquido)
- **Exportação PDF** — landscape A4, logótipo da empresa, 6 KPIs, 4 tabelas com totais por secção
- **Exportação Excel** (web) — 5 sheets: Resumo, Facturas, Cotações, Recibos, Despesas
- **Exportação CSV** (mobile) — partilha via expo-sharing, compatível com Excel / Google Sheets

### Configurações da Empresa (wizard 5 passos)
1. **Empresa** — Nome, NUIT, morada, cidade
2. **Contactos** — Telefone, email
3. **Contas Bancárias** — Banco + IBAN (múltiplas contas)
4. **Pagamentos Móveis** — Movitel / Vodacom / M-Pesa / E-Mola
5. **Imagem/Marca** — Upload de logótipo e carimbo (base64), empresa secundária
- **Multi-empresa:** suporte a empresa primária + secundária (documentos emitidos por qualquer uma)
- **Tema escuro / claro**
- **Modelo de Factura** — gera PDF de exemplo com dados reais

---

## Documentos Fiscais — Opções de Imposto

Todos os documentos PDF (Factura, Cotação, Recibo) suportam três regimes de imposto:

| Opção | Descrição |
|---|---|
| **Sem Imposto** | Isento |
| **ISPC 3%** | Regime simplificado para pequenos contribuintes (Lei 5/2009) |
| **IVA 16%** | Taxa legal padrão |

---

## Internacionalização

- Suporte bilingue **Português (PT) / Inglês (EN)**
- Alternância instantânea via botão na sidebar ou atalho `Alt+L` (web)
- Moeda fixa: **Metical Moçambicano (MT / MZN)**
- Formatação de datas no padrão `pt-MZ`

---

## Preloader / Identidade Visual

- **Logo:** `Logo.png` / `Logo.webp` — usado no preloader e login
- **Logo estendido (claro):** `Logo_extended.png` / `Logo_extended.webp` — top bar do Dashboard
- **Logo estendido (escuro):** `dark.png` — top bar em dark mode
- **Fonte de títulos:** Playfair Display (Google Fonts)
- **Preloader:** Logo + tagline "Where growth finds space" + animação de 4 pontos a saltar

---

## Fluxo Automático de Negócio

```
Cotação (Pendente)
    │
    ├─→ [cliente cria Factura] → Cotação: Aprovado
    │
    └─→ [Factura paga] → Recibo gerado automaticamente
                       → Stock decrementado
                       → Cotação: Liquidado
                       → Cliente Devedor: Liquidado
```

---

## Base de Dados (Supabase)

Tabelas principais (partilhadas entre web e mobile via mesmo projecto Supabase):

| Tabela | Descrição |
|---|---|
| `invoices` | Facturas emitidas |
| `invoice_items` | Linhas de item das facturas |
| `quotes` | Cotações / propostas |
| `quote_items` | Linhas de item das cotações |
| `receipts` | Recibos de pagamento |
| `expenses` | Despesas operacionais |
| `stock_items` | Inventário |
| `contacts` | Directório de contactos |
| `debt_clients` | Clientes devedores |
| `company_settings` | Configurações por utilizador (JSONB) |

---

## Comandos de Desenvolvimento

```bash
# Web App
npm run dev          # Servidor de desenvolvimento (porta 3000)
npm run build        # Build de produção
npm run lint         # Verificação TypeScript

# Mobile App
cd mobile_app
npm start            # Expo dev server
npm run android      # Android
npm run ios          # iOS
```

---

## Histórico de Funcionalidades

| Data | Versão | Funcionalidade |
|---|---|---|
| 2026-06-16 | 1.1 | Aba **Relatórios Financeiros** (web + mobile) — filtros de período, 6 KPIs, 4 tabelas com breakdown de estado, exportação PDF + Excel (web) / PDF + CSV (mobile) |
| 2026-06-16 | 1.1 | **Logótipo da empresa** adicionado ao PDF do Relatório Financeiro (web jsPDF + mobile HTML) |
| — | 1.0 | Versão inicial — Autenticação, Dashboard, Cotações, Facturas, Recibos, Despesas, Stock, Contactos, Clientes Devedores, Configurações multi-empresa, PDF de documentos fiscais, Dark mode, PT/EN |
