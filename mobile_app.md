# Ugest ERP — Mobile App Specification

> Aplicativo nativo para iOS e Android, sincronizado em tempo real com o sistema web Ugest ERP.
> Foco em visualização de dados, comunicação com clientes e geração de documentos fiscais.

---

## 1. Visão Geral

O Ugest Mobile é a extensão nativa do sistema ERP web, desenhada para o gestor que precisa de operar em campo — emitir documentos, consultar clientes, aprovar cotações e acompanhar o desempenho financeiro — sem depender do desktop.

**Não é um PWA.** É uma aplicação nativa compilada com acesso a APIs do sistema operativo: câmara, galeria, sistema de ficheiros, notificações push, partilha nativa de PDFs e integração com apps de mensagens (WhatsApp, SMS).

**O mesmo backend Supabase** alimenta tanto o web como o mobile. Qualquer documento criado no mobile aparece instantaneamente no web e vice-versa.

---

## 2. Stack Técnica

| Camada | Tecnologia | Justificação |
|---|---|---|
| Framework | **React Native 0.74+** com **Expo SDK 51+** | Partilha TypeScript e lógica de negócio com o web; Expo fornece acesso a APIs nativas sem Xcode/Android Studio obrigatório |
| Navegação | **Expo Router v3** (file-based, tabs + stacks) | Convenção idêntica ao Next.js; deep linking nativo integrado |
| Backend / DB | **Supabase** (mesmo projecto do web) | Auth, realtime, storage e Postgres já configurados |
| Estado global | **Zustand** | Leve, sem boilerplate, substitui Context para dados partilhados |
| PDF | **react-native-html-to-pdf** + **expo-sharing** | Gera PDFs com os mesmos templates do web e partilha nativamente |
| UI Base | **NativeWind v4** (Tailwind para RN) | Mesma filosofia de classes do web; dark mode nativo |
| Animações | **react-native-reanimated v3** | 60/120fps, thread nativa, sem janks |
| Ícones | **@expo/vector-icons** (Lucide subset) | Mesmo conjunto de ícones do web |
| Câmara/Galeria | **expo-image-picker** | Upload de logo, carimbo, fotos de despesas |
| Notificações | **expo-notifications** | Push para aprovação de cotações, pagamentos recebidos |
| Biometria | **expo-local-authentication** | Face ID / Touch ID para acesso rápido |
| Storage local | **expo-secure-store** + **AsyncStorage** | Tokens de sessão (seguro) e preferências (assíncrono) |
| Formatação | **date-fns** + lógica partilhada do web | Mesmas funções `formatDocNumber`, `mapInvoice`, etc. |

---

## 3. Arquitectura de Dados

### 3.1 Partilha de código com o web

A pasta `src/lib/` e `src/types.ts` do projecto web são **partilhadas directamente** via um pacote interno (`@ugest/shared`) ou symlink de monorepo. O mobile não duplica lógica de DB.

```
ugest-monorepo/
├── packages/
│   └── shared/           ← tipos, db.ts, supabase.ts, formatters
│       ├── types.ts
│       ├── lib/db.ts
│       └── lib/supabase.ts
├── apps/
│   ├── web/              ← projecto React actual
│   └── mobile/           ← novo projecto Expo
```

Se não for monorepo imediato: copiar `types.ts` e `lib/` para o mobile e manter sincronização manual até migrar.

### 3.2 Realtime Sync

```
Supabase Realtime (WebSocket)
  └── invoices        → actualiza lista no ecrã sem pull-to-refresh
  └── quotes          → badge de notificação quando status muda
  └── debt_clients    → estado do cliente actualizado ao vivo
  └── receipts        → confirmação de pagamento instantânea
```

Implementado com `supabase.channel().on('postgres_changes', ...)` no Zustand store.

### 3.3 Modo Offline

| Recurso | Comportamento offline |
|---|---|
| Dashboard | Mostra dados do cache local (AsyncStorage, TTL 1h) |
| Listas | Lê do cache; indica "sincronização pendente" |
| Criar factura/cotação | Enfileirado localmente, enviado quando a rede voltar |
| PDFs | Gerados localmente com dados em cache |
| Push notifications | Entregues pelo APNs/FCM independentemente do app |

---

## 4. Estrutura de Navegação

```
(root)
├── (auth)/
│   ├── login.tsx           — Email + password + biometria
│   └── forgot-password.tsx
│
└── (app)/                  — Protegido por sessão
    ├── (tabs)/
    │   ├── index.tsx       — Dashboard  [tab 1]
    │   ├── documents.tsx   — Documentos [tab 2]
    │   ├── clients.tsx     — Clientes   [tab 3]
    │   ├── chat.tsx        — Chat Hub   [tab 4]
    │   └── more.tsx        — Mais       [tab 5]
    │
    ├── invoice/
    │   ├── [id].tsx        — Detalhe da factura
    │   └── new.tsx         — Criar factura
    ├── quote/
    │   ├── [id].tsx        — Detalhe da cotação
    │   └── new.tsx         — Criar cotação
    ├── receipt/[id].tsx    — Detalhe do recibo
    ├── client/[id].tsx     — Detalhe do cliente
    ├── stock/[id].tsx      — Detalhe do item
    └── settings/index.tsx  — Configurações
```

### Tab Bar (bottom navigation)

```
[ Dashboard ] [ Documentos ] [ + ] [ Clientes ] [ Mais ]
                               ↑
                        FAB central — cria documento
```

O botão `+` central abre um **Action Sheet** nativo com:
- Nova Factura
- Nova Cotação
- Registar Despesa
- Adicionar Cliente

---

## 5. Ecrãs e Funcionalidades

### 5.1 Dashboard

**Dados exibidos:**
- KPI cards: Receita do mês, Facturas pendentes, Cotações ativas, Clientes pendentes
- Gráfico de barras (últimos 6 meses) — react-native-gifted-charts
- Lista das 5 transações mais recentes
- Alerta de stock baixo (badge vermelho)

**Interacções nativas:**
- Pull-to-refresh com animação spring
- Tap em KPI → navega para lista filtrada correspondente
- Swipe lateral entre períodos (semana / mês / trimestre)

**Realtime:** canal Supabase actualiza KPIs sem acção do utilizador.

---

### 5.2 Documentos

Ecrã com **3 segmentos** (SegmentedControl nativo): Facturas | Cotações | Recibos

**Por cada item na lista:**
```
┌─────────────────────────────────────────┐
│ [INV] INV-0042           Pendente  •    │
│       TechSolutions S.A.                │
│       15 mai. 2026         85.000 MZN   │
└─────────────────────────────────────────┘
```

**Swipe actions (iOS-style / Material-style no Android):**
- Swipe esquerda → Apagar (com confirmação haptic)
- Swipe direita → Partilhar PDF / Marcar como Pago

**Detalhe da Factura (`invoice/[id].tsx`):**
- Header com número, cliente, status badge
- Tabela de itens com quantidade × preço
- Totais (subtotal, ISPC 3%, total)
- Dados bancários e carteiras móveis da empresa
- Botão **Gerar PDF** → gera e partilha via sistema nativo (WhatsApp, Gmail, Files, etc.)
- Botão **Marcar como Pago** (apenas se Pendente/Vencido) → abre picker de método de pagamento → gera recibo automaticamente → notificação push ao utilizador web

**Criação de documentos (`invoice/new.tsx` e `quote/new.tsx`):**
- Formulário em scroll, campos idênticos ao web
- Campo de cliente com **autocomplete** dos clientes existentes (busca na DB)
- Itens da factura com swipe para remover e botão + para adicionar
- Preview do total em tempo real
- Submit → cria no Supabase → auto-regista cliente → navega para detalhe

---

### 5.3 Clientes

Lista de clientes com separador **Pendentes / Liquidados**.

**Card do cliente:**
```
┌──────────────────────────────────────────┐
│  JM   João Manuel Machava    • Pendente  │
│       +258 84 123 4567                   │
│       joao@empresa.co.mz                 │
│  [SMS]  [WhatsApp]  [Liquidar]           │
└──────────────────────────────────────────┘
```

**Acções directas no card:**
- **SMS** → abre app de SMS nativa com mensagem de cobrança pré-preenchida
- **WhatsApp** → abre WhatsApp com deep link `wa.me/` e texto localizado
- **Liquidar** → confirma com haptic feedback, actualiza status em realtime

**Detalhe do cliente (`client/[id].tsx`):**
- Timeline de documentos associados (facturas, cotações, recibos) filtrados por nome do cliente
- Histórico de comunicações enviadas (log local)
- Botão para editar contacto

---

### 5.4 Chat Hub

Centro de comunicação com clientes — **não é um chat proprietário**, é um orquestrador de canais externos.

```
┌─────────────────────────────────────────┐
│  CHAT HUB                               │
│  ─────────────────────────────────────  │
│  Recentes                               │
│  ○ João Machava    WhatsApp  há 2h      │
│  ○ TechSolutions   SMS       há 1d      │
│  ─────────────────────────────────────  │
│  Todos os Clientes                      │
│  [🔍 Pesquisar cliente...]              │
│  Lista filtrada de clientes pendentes   │
└─────────────────────────────────────────┘
```

**Por cliente, acções de comunicação:**

| Canal | Implementação |
|---|---|
| SMS | `Linking.openURL('sms:+258...')` com body pré-preenchido |
| WhatsApp | `Linking.openURL('whatsapp://send?phone=...&text=...')` |
| Email | `expo-mail-composer` com PDF como anexo opcional |
| Chamada | `Linking.openURL('tel:+258...')` |

**Modelos de mensagem** (em PT e EN):
- Lembrete de pagamento pendente
- Confirmação de recebimento
- Envio de factura
- Envio de cotação para aprovação

O utilizador pode editar o texto antes de enviar. O app regista timestamp e canal de cada comunicação no AsyncStorage local.

---

### 5.5 Mais (More)

- **Inventário** — lista de stock com alerta visual de stock baixo; actualização de quantidade com stepper nativo
- **Despesas** — lista e registo de despesas; foto de recibo com câmara (`expo-image-picker`)
- **Relatório PDF** — gera relatório financeiro e partilha
- **Configurações**:
  - Perfil da empresa (lê/escreve no Supabase, mesmo que o web)
  - Logo e carimbo — selecção da galeria ou câmara
  - Tema claro/escuro (segue preferência do sistema + override manual)
  - Idioma (PT / EN)
  - Biometria (Face ID / Touch ID)
  - Notificações push (toggle por categoria)
  - Sair

---

## 6. Geração de PDFs

### Fluxo

```
Utilizador toca "Gerar PDF"
    │
    ▼
Dados do documento (fetched ou cached)
    │
    ▼
Template HTML preenchido (string)
    │
    ▼
react-native-html-to-pdf → ficheiro .pdf no FS temporário
    │
    ▼
expo-sharing → Sheet nativo de partilha
  ├── WhatsApp
  ├── Gmail / Outlook
  ├── Ficheiros / iCloud / Google Drive
  └── Imprimir (AirPrint / Google Cloud Print)
```

### Template HTML

O mesmo template usado no web (`src/lib/pdf.ts`) é portado para uma função `generateDocumentHTML(doc, items, settings): string`. Esta função é partilhada entre web e mobile via `packages/shared`.

### Campos do PDF (idêntico ao web)
- Logótipo e carimbo da empresa (base64 do Supabase)
- Dados da empresa (NUIT, endereço, contactos)
- Dados do cliente (nome, NUIT, telefone, email)
- Tabela de itens com subtotal, ISPC 3%, total
- Dados bancários e carteiras móveis
- Rodapé com número do documento e data

---

## 7. Notificações Push

Implementadas com **Expo Notifications** + **Supabase Edge Functions** como webhook.

### Categorias de notificação

| Evento | Título | Corpo |
|---|---|---|
| Nova factura criada (pelo web) | Factura emitida | `INV-0042 para TechSolutions — 85.000 MZN` |
| Cotação aprovada | Cotação aprovada | `QT-0017 foi aprovada pelo cliente` |
| Factura vencida | Pagamento em atraso | `INV-0038 está vencida há 3 dias` |
| Recibo gerado | Pagamento recebido | `85.000 MZN recebido de TechSolutions` |
| Stock baixo | Inventário crítico | `SKU PRC-44W-XT abaixo do mínimo` |

### Implementação

```
Supabase DB Webhook (pg_notify)
    │
    ▼
Supabase Edge Function (Deno)
    │
    ▼
Expo Push API (https://exp.host/--/api/v2/push/send)
    │
    ▼
APNs (iOS) / FCM (Android)
    │
    ▼
Dispositivo do utilizador
```

O token Expo Push do dispositivo é guardado em `user_push_tokens` no Supabase quando o utilizador faz login.

---

## 8. Autenticação e Segurança

### Fluxo de login

1. Email + password via `supabase.auth.signInWithPassword()`
2. Sessão guardada em `expo-secure-store` (encrypted keychain no iOS, Keystore no Android)
3. Refresh automático do token sem re-login
4. **Biometria opcional**: na segunda abertura, Face ID / Touch ID substitui a password

### Sessão partilhada

O utilizador usa as **mesmas credenciais** do web. Não há conta separada para o mobile. A sessão Supabase funciona em ambas as plataformas simultaneamente.

### Dados sensíveis

| Dado | Armazenamento |
|---|---|
| Token de sessão | `expo-secure-store` (AES-256) |
| Preferências UI | `AsyncStorage` |
| Cache de documentos | `AsyncStorage` com TTL |
| Ficheiros PDF gerados | FileSystem temporário, limpo ao sair |

---

## 9. UI / UX — Diretrizes Mobile

### Princípios

- **Thumb-friendly**: acções principais na zona inferior do ecrã
- **Haptic feedback**: em todas as acções destrutivas e confirmações
- **Native feel**: usar componentes nativos (ActionSheet, DatePicker, SegmentedControl) em vez de reimplementar
- **Skeleton loading**: nunca mostrar um ecrã vazio; usar placeholders animados enquanto carrega
- **Swipe gestures**: swipe para trás (iOS), swipe em cards para acções rápidas

### Paleta de cores (herda do web)

```
Primary:    #0c1c48   (azul corporativo)
Secondary:  #805522   (âmbar corporativo)
Background: #fbf8fd   (light) / #0d0f14 (dark)
Surface:    #ffffff   (light) / #111318 (dark)
```

Dark mode segue automaticamente o sistema (`useColorScheme()`) com override manual nas configurações.

### Tipografia

| Uso | Fonte | Peso |
|---|---|---|
| Headings | Montserrat | 700 / 800 |
| Body | Inter | 400 / 500 |
| Valores monetários | Inter | 700 (mono) |
| Labels de estado | Inter | 800 uppercase |

### Tamanhos de toque mínimos

Todos os elementos interactivos: mínimo **44 × 44 pt** (guideline Apple/Google).

---

## 10. Sincronização Web ↔ Mobile

| Acção no Mobile | Efeito no Web |
|---|---|
| Criar factura | Aparece imediatamente na lista do web (Supabase Realtime) |
| Marcar factura como paga | Status actualizado no web; recibo criado; cotações liquidadas |
| Criar cliente | Visível no web na tab Clientes |
| Actualizar stock | Reflectido no dashboard web |
| Alterar configurações da empresa | Logo e dados actualizados em ambas as plataformas |

| Acção no Web | Efeito no Mobile |
|---|---|
| Criar/editar documento | Notificação push + lista actualizada |
| Aprovar cotação | Notificação push |
| Factura vencer | Notificação push de alerta |
| Alterar configurações | Preferências sincronizadas no próximo login |

---

## 11. Estrutura de Pastas do Projecto Mobile

```
apps/mobile/
├── app/                        ← Expo Router (file-based routing)
│   ├── (auth)/
│   │   └── login.tsx
│   ├── (app)/
│   │   ├── (tabs)/
│   │   │   ├── index.tsx       ← Dashboard
│   │   │   ├── documents.tsx   ← Facturas / Cotações / Recibos
│   │   │   ├── clients.tsx     ← Clientes
│   │   │   ├── chat.tsx        ← Chat Hub
│   │   │   └── more.tsx        ← Stock, Despesas, Relatórios
│   │   ├── invoice/
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── quote/
│   │   │   ├── [id].tsx
│   │   │   └── new.tsx
│   │   ├── receipt/[id].tsx
│   │   ├── client/[id].tsx
│   │   └── settings/index.tsx
│   └── _layout.tsx             ← Root layout com AuthGuard
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── SkeletonLoader.tsx
│   │   ├── KpiCard.tsx
│   │   └── DocumentListItem.tsx
│   ├── forms/
│   │   ├── DocumentItemRow.tsx
│   │   ├── ClientAutocomplete.tsx
│   │   └── PaymentMethodPicker.tsx
│   └── chat/
│       ├── ChatClientCard.tsx
│       └── MessageTemplates.tsx
│
├── stores/                     ← Zustand stores
│   ├── authStore.ts
│   ├── invoiceStore.ts
│   ├── quoteStore.ts
│   ├── clientStore.ts
│   └── settingsStore.ts
│
├── lib/
│   ├── supabase.ts             ← cliente Supabase RN
│   ├── pdf.ts                  ← geração de PDF (template HTML partilhado)
│   ├── notifications.ts        ← gestão de tokens push
│   └── haptics.ts              ← wrapper de feedback háptico
│
├── hooks/
│   ├── useRealtimeInvoices.ts
│   ├── useRealtimeClients.ts
│   └── useBiometrics.ts
│
├── shared/                     ← symlink para packages/shared
│   ├── types.ts
│   └── db.ts
│
├── assets/
│   ├── Logo.webp
│   ├── Logo_extended.webp
│   └── logo_extended_darkmode.webp
│
├── app.json                    ← config Expo (bundle ID, ícone, splash)
├── tailwind.config.js          ← NativeWind config
└── package.json
```

---

## 12. Dependências Principais

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "react-native": "0.74.x",
    "@supabase/supabase-js": "^2.45.0",
    "nativewind": "^4.0.0",
    "zustand": "^4.5.0",
    "react-native-reanimated": "~3.10.0",
    "expo-notifications": "~0.28.0",
    "expo-local-authentication": "~14.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-image-picker": "~15.0.0",
    "expo-sharing": "~12.0.0",
    "expo-file-system": "~17.0.0",
    "expo-mail-composer": "~12.0.0",
    "react-native-html-to-pdf": "^0.12.0",
    "react-native-gifted-charts": "^1.4.0",
    "@expo/vector-icons": "^14.0.0",
    "date-fns": "^3.6.0",
    "@react-native-async-storage/async-storage": "^1.23.0",
    "react-native-gesture-handler": "~2.16.0"
  }
}
```

---

## 13. Fases de Desenvolvimento

### Fase 1 — Fundação (3-4 semanas)
- [ ] Setup Expo + Expo Router + NativeWind + Supabase
- [ ] Ecrã de login com sessão persistente e biometria
- [ ] Tab bar e navegação base
- [ ] Dashboard com KPIs (dados reais do Supabase)
- [ ] Lista de facturas, cotações e recibos (read-only)
- [ ] Dark mode

### Fase 2 — Documentos (3-4 semanas)
- [ ] Detalhe de factura/cotação/recibo
- [ ] Formulário de criação de factura com itens dinâmicos
- [ ] Formulário de criação de cotação
- [ ] Geração e partilha de PDFs nativos
- [ ] Marcar factura como paga → recibo automático
- [ ] Auto-registo de cliente ao criar documento

### Fase 3 — Clientes e Chat (2-3 semanas)
- [ ] Lista de clientes com separador Pendentes/Liquidados
- [ ] Detalhe do cliente com timeline de documentos
- [ ] Chat Hub com integração SMS/WhatsApp/Email
- [ ] Modelos de mensagem editáveis
- [ ] Liquidação automática em cascata

### Fase 4 — Realtime e Push (2 semanas)
- [ ] Supabase Realtime nos stores Zustand
- [ ] Supabase Edge Function para webhook de push
- [ ] Expo Notifications — token registration
- [ ] Notificações por categoria (facturas, stock, aprovações)
- [ ] Badge no ícone do app (iOS/Android)

### Fase 5 — Features Adicionais (2-3 semanas)
- [ ] Inventário com actualização de quantidade
- [ ] Registo de despesas com foto de recibo
- [ ] Relatório financeiro PDF
- [ ] Configurações da empresa (logo via câmara/galeria)
- [ ] Modo offline com cache e fila de envio
- [ ] Pull-to-refresh em todas as listas

### Fase 6 — Publicação (1-2 semanas)
- [ ] Build de produção via EAS Build (Expo)
- [ ] Submissão na App Store (iOS)
- [ ] Submissão na Google Play Store (Android)
- [ ] OTA updates configuradas (Expo Updates)

---

## 14. Configuração EAS (Build & Deploy)

```json
// eas.json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "dev@ugest.co.mz",
        "ascAppId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

```json
// app.json (excerto)
{
  "expo": {
    "name": "Ugest ERP",
    "slug": "ugest-erp",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/Logo.webp",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/Logo_extended.webp",
      "backgroundColor": "#0c1c48"
    },
    "ios": {
      "bundleIdentifier": "co.mz.ugest.erp",
      "supportsTablet": false
    },
    "android": {
      "package": "co.mz.ugest.erp",
      "adaptiveIcon": {
        "foregroundImage": "./assets/Logo.webp",
        "backgroundColor": "#0c1c48"
      }
    },
    "plugins": [
      "expo-router",
      "expo-notifications",
      "expo-local-authentication",
      "expo-secure-store"
    ]
  }
}
```

---

## 15. Supabase — Tabela de Tokens Push

```sql
CREATE TABLE user_push_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user can manage own tokens"
  ON user_push_tokens FOR ALL
  USING (auth.uid() = user_id);
```

---

## 16. Decisões de Arquitectura

| Decisão | Escolha | Alternativa descartada | Razão |
|---|---|---|---|
| Framework nativo | React Native + Expo | Flutter | Partilha de código TypeScript e Supabase SDK com o web |
| Routing | Expo Router | React Navigation manual | File-based, deep linking automático, melhor DX |
| Estado | Zustand | Redux / Context | Sem boilerplate, subscriptions por selector, realtime-friendly |
| PDF | HTML → PDF nativo | react-pdf (web only) | Mesmo template do web; partilha via sheet nativo |
| Push | Expo Notifications + Edge Function | OneSignal | Sem dependência de terceiros para dados sensíveis |
| Auth | Supabase (mesmas credenciais do web) | Auth separado | Uma única conta, sessão partilhada entre web e mobile |
| UI | NativeWind (Tailwind classes) | StyleSheet nativo | Consistência visual com o web; dark mode trivial |

---

*Documento gerado em 2026-06-01 — Ugest ERP Mobile Specification v1.0*
