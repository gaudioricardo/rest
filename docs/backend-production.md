# Backend: paginação, comprovativos e transacções

## Alterações

- Web e Expo partilham leituras em lotes de 100 registos, ordenação com desempate por ID, cache em memória de 30 segundos e invalidação nas escritas/mudanças de sessão. Erros de leitura não se transformam em relatórios vazios.
- `fetch*` (web) e `get*` (mobile) aceitam `ReadOptions`: `page` começa em zero; `search`, `status`, `fromDate` e `toDate` são aplicados na API. Sem `page`, percorrem todas as páginas para preservar os indicadores e exportações existentes. Isto elimina truncamento pelo limite da API e transferências repetidas imediatas, mas **não elimina o carregamento completo inicial dos ecrãs actuais nem limita o total de bytes de um relatório**. Converter os indicadores para agregações SQL e as listas para carregamento por navegação é uma evolução distinta.
- A função `receipt-url` recebe apenas metadados. Emite URLs S3 de PUT/GET com validade de 120 segundos. PUT assina o caminho, Content-Type e Content-Length. Limite: 10 MiB. Nenhum token B2 com acesso ao bucket é entregue ao cliente. Web e mobile transferem directamente com B2.
- Referências novas guardam a chave permanente `expenses/<user-id>/<uuid>.<ext>`. URLs B2 antigas continuam a ser reconhecidas. Nunca guardar a URL assinada na base de dados.
- As RPCs gravam documentos+itens, vendas+stock e recibos+pagamentos+stock numa transacção. Calculam totais no servidor, validam o proprietário e usam `SECURITY INVOKER`/RLS.
- Pagamentos parciais mantêm a factura aberta; a liquidação final abate stock uma só vez. Exceder o saldo ou vender acima do stock disponível falha sem gravações parciais.
- A edição de facturas com pagamentos é recusada. O sistema antigo identifica os produtos das linhas pelo nome: serviços sem correspondência não mexem no stock; nomes de produto ambíguos falham. Uma futura ligação por `product_id` seria preferível.
- Pedidos transaccionais têm ID de operação. A repetição do mesmo ID/payload devolve o resultado já gravado; não repete o débito de stock. O cliente conserva IDs de pedidos com resultado de rede incerto durante 30 minutos. Depois desse prazo, confirmar o documento antes de reenviar.

## Ordem de instalação em cada projecto

1. Obter uma cópia de teste e o esquema real do cliente. O repositório original não contém o DDL completo. Confirmar tipos, RLS, permissões e triggers existentes; se houver triggers que já actualizam stock, reconciliá-los antes de instalar para evitar débitos duplicados. A migração pressupõe IDs UUID e os nomes de tabelas/colunas usados pelo código actual.
2. Aplicar `supabase/migrations/202609210001_backend_operations.sql` nessa cópia e executar os casos de validação abaixo. Depois aplicar ao projecto de destino com a ferramenta de migrações habitual. Não executar a migração repetidamente no SQL Editor: ela marca facturas antigas já pagas como `stock_deducted=true` e cria uma política de RLS.
3. Configurar segredos de servidor `B2_REGION` (ex.: `us-west-004`, usar a região REAL do bucket), `B2_BUCKET_NAME`, `B2_KEY_ID` e `B2_APPLICATION_KEY`. A chave B2 deve estar limitada ao bucket privado, com leitura e escrita. Não usar variáveis `VITE_*` para estes segredos.
4. No bucket B2, adicionar CORS para as origens web exactas, incluindo localhost se necessário. Exemplo no formato S3:

```json
{
  "CORSRules": [{
    "AllowedOrigins": ["https://app.exemplo.co.mz", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type", "content-length", "x-amz-*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }]
}
```

5. Publicar `receipt-url` com a CLI Supabase autenticada: `supabase functions deploy receipt-url --project-ref <referencia>`. A função também valida a sessão com `auth.getUser()`.
6. Só depois publicar a web e distribuir o novo mobile. As novas versões **requerem as RPCs e receipt-url**; não fazem fallback para gravações separadas ou proxy binário quando faltar configuração.
7. Confirmar upload/download de um ficheiro antigo e um novo na web e num dispositivo Expo. No painel de rede, o PUT/GET do ficheiro deve ter destino `backblazeb2.com`; apenas metadados vão para Supabase. Testar CORS, expiração e um PUT com tamanho diferente do assinado.
8. As funções antigas `upload-receipt`/`view-receipt` foram preservadas para permitir distribuição gradual do mobile. Quando todas as instalações estiverem actualizadas, desactivar esses endpoints para eliminar o percurso binário legado. O proxy Vite local já foi retirado.

## Validação

```powershell
npm test
npm run lint
npm run build
npm exec --prefix mobile_app -- tsc --noEmit -p mobile_app/tsconfig.json
```

Os testes executam PostgreSQL através de PGlite com um esquema mínimo **inferido**, sem dados de produção. Cobrem paginação acima de 1.000 linhas, páginas menores que o solicitado, falhas, cache, assinaturas, propriedade, idempotência, pagamentos parciais, edição e rollback com stock insuficiente. Não substituem validação do esquema real, concorrência entre conexões PostgreSQL nem transferência real B2 em browser/dispositivo.

Confirmar em staging duas sessões a liquidar a mesma factura ou a vender as últimas unidades: apenas a operação válida deve concluir, sem stock negativo. Verificar também as políticas RLS dos itens e as permissões de sequências usadas pelos documentos.

## Operação

- A tabela `rest_requests` preserva resultados para repetição segura. Arquivar/eliminar entradas antigas através de uma tarefa administrativa, mantendo pelo menos 24 horas (recomendação: 30 dias). Não apagar entradas recentes ou em processamento. Esta tabela também consome disco.
- Configurar alertas/limites de utilização no fornecedor. O limite por ficheiro não é uma quota global por cliente; URLs assinadas podem ser reutilizadas durante a sua validade.
- Uploads interrompidos entre o B2 e a gravação da despesa podem deixar ficheiros órfãos. Planear uma limpeza que compare as referências da base de dados com os objectos, com período de tolerância; nunca apagar apenas pela data.
- Manter backups e testar recuperação antes da migração. Para reverter a aplicação, conservar temporariamente as funções antigas; não remover colunas/tabelas novas com operações de clientes em curso.
