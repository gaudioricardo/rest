# Recriar o projecto Supabase

O ficheiro `supabase/schema.sql` reconstrói a estrutura usada pela versão actual da web e do mobile. Não é uma cópia do DDL perdido nem contém os dados antigos. Foi gerado a partir das duas migrações e deve ser executado **uma única vez num projecto Supabase novo e vazio**, no SQL Editor, com o conteúdo completo.

Não utilizar `tests/fixtures/schema.sql` em produção: esse ficheiro contém objectos de autenticação fictícios para testes.

## Instalação

1. Criar o novo projecto Supabase e guardar a palavra-passe da base de dados.
2. Abrir SQL Editor, criar uma consulta, colar TODO o conteúdo de `supabase/schema.sql` e executar. O ficheiro inclui tabelas, índices, RLS, triggers e as RPCs transaccionais; não executar novamente a migração `202609210001_backend_operations.sql` em separado.
3. Em Authentication, configurar email/password e os endereços de redireccionamento do site. Criar os utilizadores pela aplicação ou pelo painel Auth; não inserir palavras-passe nas tabelas públicas. O perfil é criado automaticamente. As configurações da empresa são guardadas pelo formulário de configuração da aplicação.
4. Na web (`.env` local e variáveis da Vercel), actualizar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. No mobile, actualizar `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Utilizar a chave cliente do projecto, nunca `service_role`. Recompilar/publicar as aplicações para incorporar as novas variáveis e iniciar uma nova sessão.
5. Configurar na nova instância os segredos B2 e publicar a função `receipt-url`, a partir deste repositório. A função requer `B2_REGION`, `B2_BUCKET_NAME`, `B2_KEY_ID`, `B2_APPLICATION_KEY`; Supabase fornece os segredos de plataforma usados pela função. Configurar CORS no bucket para o domínio web. Ver `docs/backend-production.md`.
6. Se o scraper UFSA for utilizado, publicar também `ufsa-scraper`. O esquema cria a tabela `oportunidades`, mas não agenda a recolha. As funções antigas de comprovativos só são necessárias para versões antigas das aplicações.
7. Validar cadastro/login, configuração da empresa, stock, factura com itens, pagamento parcial/final, venda e comprovativos. Não usar documentos comerciais reais como dados descartáveis de teste.

## Estrutura incluída

Tabelas públicas: `profiles`, `company_settings`, `stock_items`, `invoices`, `invoice_items`, `quotes`, `quote_items`, `receipts`, `expenses`, `general_sales`, `contacts`, `debt_clients`, `oportunidades`, `rest_requests`.

Contadores privados: `rest_private.document_counters`. A numeração FAC/COT/REC/EXP/VND é gerada no servidor, separadamente por utilizador e tipo de documento. Não fornecer `seq_number` nas inserções normais. O contador é actualizado atomicamente e a tabela tem unicidade `(user_id, seq_number)`. Não há trigger de stock duplicado: os movimentos continuam nas RPCs.

RLS: cada utilizador acede apenas aos seus registos; os itens seguem a propriedade do documento. Referências factura/recibo e stock/venda não podem atravessar utilizadores. A tabela UFSA permite leitura a utilizadores autenticados e escrita pelo serviço. Documentos referenciados por recibos e produtos referenciados por vendas não podem ser apagados directamente enquanto as referências existirem.

O modelo de partilha continua igual ao código actual: os dados pertencem ao `user_id`. Criar vários logins não os transforma automaticamente numa equipa com dados partilhados.

## Dados e comprovativos antigos

O SQL não recupera contas Auth, facturas, vendas nem recibos do projecto perdido. Se existir backup, avaliar primeiro a restauração completa, incluindo a identidade dos utilizadores. Este esquema é para uma base vazia, não para sobrepor a um backup.

Os ficheiros no Backblaze podem continuar a existir, mas os caminhos usam `expenses/<user-id>/...`. Contas recriadas normalmente recebem novos UUIDs; por isso, os comprovativos antigos precisam de recuperação das referências e de uma migração controlada dos proprietários/caminhos. Não desactivar a verificação de propriedade para contornar o problema.

## Manutenção e validação

`node scripts/build-schema.mjs` regenera o SQL completo a partir das migrações; editar as migrações, não o ficheiro gerado. Escolher um único processo de instalação: o SQL completo no painel OU as migrações em ordem, sem executar ambos.

`npm test` inclui a criação da estrutura completa numa base PostgreSQL PGlite vazia, com Auth simulado, e testes de todos os módulos, relações, numeração e RLS. Não é um teste de integração com a plataforma Supabase real ou o Backblaze.
