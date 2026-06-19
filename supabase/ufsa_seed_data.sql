-- ═══════════════════════════════════════════════════════════════════════════
-- Seed: dados de exemplo para tabela oportunidades (concursos UFSA)
-- Colar no Supabase SQL Editor → Run
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO public.oportunidades (
  referencia, numero_concurso, regime, modalidade, classe,
  objeto_geral, ugea, moeda, valor_estimado, garantia_provisoria,
  criterio_adjudicacao, data_lancamento, numero_lotes, entrega_propostas,
  data_abertura, hora_entrega, hora_abertura, observacoes, data_publicacao, actualizado_em
) VALUES

(
  '0001/ESJ/072.2/DAQ/2026',
  '0001/ESJ/072.2/DAQ/2026',
  'GERAL', 'CONCURSO PUBLICO', 'BENS E SERVICOS',
  'FORNECIMENTO DE PASSAGENS AÉREAS',
  'ESCOLA SUPERIOR DE JORNALISMO',
  'MZN', 1400000.00, 0.00,
  'CONJUGADO', '2026-01-20', 'LOTE UNICO',
  'AV. AHMED SEKOU TOURE (INSTITUTO INDUSTRIAL). MAPUTO-CIDADE. TELEFONE: +258875288389 - SECRETARIA-GERAL DA ESJ',
  '2026-02-02', '09H00', '09H15', NULL, '2026-01-19 18:48:40+00', now()
),

(
  '0002/UEM/010.1/DAQ/2026',
  '0002/UEM/010.1/DAQ/2026',
  'GERAL', 'CONCURSO PUBLICO', 'BENS E SERVICOS',
  'AQUISIÇÃO DE EQUIPAMENTOS INFORMÁTICOS E PERIFÉRICOS',
  'UNIVERSIDADE EDUARDO MONDLANE',
  'MZN', 4850000.00, 97000.00,
  'MENOR PREÇO', '2026-02-03', 'DOIS LOTES',
  'REITORIA DA UEM - AV. JULIUS NYERERE, Nº 3453, MAPUTO',
  '2026-02-24', '10H00', '10H30', NULL, '2026-02-02 09:00:00+00', now()
),

(
  '0003/MISAU/014.3/DAQ/2026',
  '0003/MISAU/014.3/DAQ/2026',
  'GERAL', 'CONCURSO LIMITADO', 'BENS E SERVICOS',
  'FORNECIMENTO DE MEDICAMENTOS ESSENCIAIS E MATERIAL DE CONSUMO CLÍNICO',
  'MINISTÉRIO DA SAÚDE - CENTRAL DE MEDICAMENTOS E ARTIGOS MÉDICOS',
  'USD', 320000.00, 6400.00,
  'CONJUGADO', '2026-02-10', 'TRÊS LOTES',
  'CMAM - AV. ACORDO DE LUSAKA, Nº 1180, MAPUTO. FAX: +258 21 421 617',
  '2026-03-03', '09H30', '10H00', NULL, '2026-02-09 14:30:00+00', now()
),

(
  '0004/ANE/058.1/DAQ/2026',
  '0004/ANE/058.1/DAQ/2026',
  'GERAL', 'CONCURSO PUBLICO', 'EMPREITADAS',
  'REABILITAÇÃO DE ESTRADAS TERCIÁRIAS NA PROVÍNCIA DE SOFALA',
  'ADMINISTRAÇÃO NACIONAL DE ESTRADAS',
  'MZN', 38500000.00, 770000.00,
  'MENOR PREÇO', '2026-02-14', 'DOIS LOTES',
  'ANE - AV. DE MOÇAMBIQUE, Nº 1225, MACHAVA, MATOLA. TEL: +258 21 460 100',
  '2026-03-10', '08H00', '08H30', 'Exige-se experiência mínima de 5 anos em obras rodoviárias.', '2026-02-13 16:00:00+00', now()
),

(
  '0005/MINFIN/002.4/DAQ/2026',
  '0005/MINFIN/002.4/DAQ/2026',
  'GERAL', 'CONCURSO POR COTACOES', 'BENS E SERVICOS',
  'SERVIÇOS DE MANUTENÇÃO PREVENTIVA DE VEÍCULOS AUTOMÓVEIS',
  'MINISTÉRIO DAS FINANÇAS',
  'MZN', 850000.00, 0.00,
  'MENOR PREÇO', '2026-02-18', 'LOTE UNICO',
  'MINISTÉRIO DAS FINANÇAS - PRAÇA DA MARINHA POPULAR, Nº 1, MAPUTO',
  '2026-03-05', '11H00', '11H30', NULL, '2026-02-17 10:00:00+00', now()
),

(
  '0006/INE/033.2/DAQ/2026',
  '0006/INE/033.2/DAQ/2026',
  'GERAL', 'CONCURSO PUBLICO', 'BENS E SERVICOS',
  'AQUISIÇÃO DE SERVIÇOS DE IMPRESSÃO DE QUESTIONÁRIOS E MANUAIS DO IV RECENSEAMENTO GERAL DA POPULAÇÃO',
  'INSTITUTO NACIONAL DE ESTATÍSTICA',
  'MZN', 12600000.00, 252000.00,
  'MENOR PREÇO', '2026-01-28', 'LOTE UNICO',
  'INE - AV. 24 DE JULHO, Nº 1989, 2º ANDAR, MAPUTO. TEL: +258 21 490 028',
  '2026-02-18', '09H00', '09H30', NULL, '2026-01-27 11:00:00+00', now()
),

(
  '0007/ACIS/091.1/DAQ/2026',
  '0007/ACIS/091.1/DAQ/2026',
  'GERAL', 'CONCURSO PUBLICO', 'BENS E SERVICOS',
  'CONTRATAÇÃO DE SERVIÇOS DE CONSULTORIA PARA IMPLEMENTAÇÃO DE SISTEMA ERP',
  'ASSOCIAÇÃO COMERCIAL E INDUSTRIAL DE SOFALA',
  'USD', 175000.00, 3500.00,
  'CONJUGADO', '2026-02-20', 'LOTE UNICO',
  'ACIS - RUA DOS MERCADORES, Nº 35, BEIRA. TEL: +258 23 323 625',
  '2026-03-12', '10H00', '10H30', NULL, '2026-02-19 08:00:00+00', now()
),

(
  '0008/FIPAG/044.1/DAQ/2026',
  '0008/FIPAG/044.1/DAQ/2026',
  'GERAL', 'CONCURSO LIMITADO', 'EMPREITADAS',
  'EXTENSÃO DA REDE DE ABASTECIMENTO DE ÁGUA POTÁVEL NOS DISTRITOS DE MOAMBA E MANHIÇA',
  'FUNDO DE INVESTIMENTO E PATRIMÓNIO DO ABASTECIMENTO DE ÁGUA',
  'MZN', 64000000.00, 1280000.00,
  'MENOR PREÇO', '2026-02-06', 'DOIS LOTES',
  'FIPAG - AV. GUERRA POPULAR, Nº 989, 6º ANDAR, MAPUTO. TEL: +258 21 313 650',
  '2026-03-02', '09H00', '09H30', 'Exige-se certificado de registo de empreiteiro de obras públicas de 1ª ou 2ª classe.', '2026-02-05 15:00:00+00', now()
),

(
  '0009/MITADER/077.3/DAQ/2026',
  '0009/MITADER/077.3/DAQ/2026',
  'GERAL', 'CONCURSO PUBLICO', 'BENS E SERVICOS',
  'FORNECIMENTO E INSTALAÇÃO DE PAINÉIS SOLARES PARA COMUNIDADES RURAIS NA ZAMBÉZIA',
  'MINISTÉRIO DA TERRA, AMBIENTE E DESENVOLVIMENTO RURAL',
  'USD', 490000.00, 9800.00,
  'CONJUGADO', '2026-02-24', 'QUATRO LOTES',
  'MITADER - RUA DA RÁDIO MOÇAMBIQUE, Nº 2, MAPUTO. TEL: +258 21 466 013',
  '2026-03-18', '08H30', '09H00', NULL, '2026-02-23 09:00:00+00', now()
),

(
  '0010/CFM/022.5/DAQ/2026',
  '0010/CFM/022.5/DAQ/2026',
  'GERAL', 'CONCURSO PUBLICO', 'EMPREITADAS',
  'REABILITAÇÃO E MODERNIZAÇÃO DA LINHA FÉRREA NACALA-MOATIZE (FASE II)',
  'CAMINHOS DE FERRO DE MOÇAMBIQUE - E.P.',
  'USD', 8500000.00, 170000.00,
  'CONJUGADO', '2026-01-30', 'TRÊS LOTES',
  'CFM - PRAÇA DOS TRABALHADORES, Nº 1, MAPUTO. TEL: +258 21 327 671',
  '2026-02-28', '10H00', '10H30', 'Documentação disponível mediante pagamento de 5.000 MZN.', '2026-01-29 07:00:00+00', now()
)

ON CONFLICT (referencia) DO UPDATE SET
  numero_concurso     = EXCLUDED.numero_concurso,
  regime              = EXCLUDED.regime,
  modalidade          = EXCLUDED.modalidade,
  classe              = EXCLUDED.classe,
  objeto_geral        = EXCLUDED.objeto_geral,
  ugea                = EXCLUDED.ugea,
  moeda               = EXCLUDED.moeda,
  valor_estimado      = EXCLUDED.valor_estimado,
  garantia_provisoria = EXCLUDED.garantia_provisoria,
  criterio_adjudicacao = EXCLUDED.criterio_adjudicacao,
  data_lancamento     = EXCLUDED.data_lancamento,
  numero_lotes        = EXCLUDED.numero_lotes,
  entrega_propostas   = EXCLUDED.entrega_propostas,
  data_abertura       = EXCLUDED.data_abertura,
  hora_entrega        = EXCLUDED.hora_entrega,
  hora_abertura       = EXCLUDED.hora_abertura,
  observacoes         = EXCLUDED.observacoes,
  data_publicacao     = EXCLUDED.data_publicacao,
  actualizado_em      = now();
