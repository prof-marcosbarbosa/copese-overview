# COPESE Overview

Dashboard de análise de inscrições do COPESE, desenvolvido com React + TypeScript + Vite para oferecer uma visualização institucional, legível e orientada a decisão.

## Visão geral

Este projeto foi pensado para processar planilhas XLSX/XLS localmente no navegador, agregando dados acadêmicos e apresentando KPIs, gráficos e tabelas em uma interface limpa inspirada em boas práticas de dashboard analítico e Power BI.

Ele foi estruturado para:

- facilitar a análise operacional das inscrições;
- reduzir ruído visual e priorizar métricas-chave;
- manter os dados no cliente, sem backend nem persistência externa;
- permitir exportação em PDF do relatório final;
- ser facilmente implantado em Netlify como app estático.

## Boas práticas aplicadas

### React e arquitetura de interface

- uso de React com TypeScript;
- separação clara entre páginas, componentes reutilizáveis e lógica de domínio;
- pouco acoplamento entre renderização e processamento dos dados;
- componentes com responsabilidades bem definidas, como upload, cards de KPI, tabelas e gráficos;
- estado local e cálculos derivados com `useMemo` para evitar recomputação desnecessária.
- Tailwind CSS 4 para estilos utilitários e tokens de design;
- componentes locais no padrão shadcn/ui, com primitivas Radix UI e variantes tipadas;
- ícones Lucide para manter consistência visual entre navegação, ações e indicadores.

### Power BI e dashboard analítico

O layout foi organizado seguindo princípios de dashboards analíticos recomendados em ferramentas de BI:

- métricas principais destacadas em cards (KPI);
- leitura rápida por blocos visualmente consistentes;
- comparação por curso, cidade e escola;
- gráficos e tabelas com foco em percepção de tendências e distribuição;
- uso de paleta institucional com verde e dourado, mantendo alto contraste e legibilidade.

A estrutura visual busca priorizar decisão, e não apenas exibição de dados.

## Estrutura do projeto

```text
src/
  components/
    BarChartCard.tsx
    DataTable.tsx
    StatCard.tsx
    StatusDonutChart.tsx
    UploadPanel.tsx
  lib/
    dashboard.ts
    pdfReport.ts
  pages/
    DashboardPage.tsx
  App.tsx
  main.tsx
index.html
netlify.toml
package.json
vite.config.js
```

### Pastas principais

- `src/pages`: contém a página principal do dashboard.
- `src/components`: blocos reutilizáveis da interface.
- `src/components/ui`: primitivas de interface reaproveitáveis no padrão shadcn/ui.
- `src/lib`: lógica de processamento dos dados, utilitários de estilo e geração do relatório PDF.

Essa separação ajuda a manter o projeto escalável, testável e fácil de evoluir.

## Funcionalidades

- upload de planilhas `.xlsx` e `.xls`;
- validação automática de colunas obrigatórias;
- cálculo de inscrição total, confirmados e taxa de conversão;
- agregação por curso, cidade, escola e status de pagamento;
- análise de concorrência por vaga;
- gráfico de rosca de status com legenda de contagem e percentual;
- comparação horizontal de cidades e escolas, com contagem e participação no total;
- recorte visual das até 20 linhas finais da planilha, agrupado por cidade e escola, com números absolutos e participação no recorte;
- exportação de relatório PDF com KPIs, gráficos vetoriais (incluindo o recorte final), tabelas e paginação.

## Fluxo de uso

1. Faça o upload da planilha com os dados de inscrição.
2. O sistema valida as colunas esperadas.
3. A análise é gerada automaticamente no navegador.
4. O usuário acompanha KPIs, gráficos e comparações por curso.
5. O relatório pode ser exportado em PDF para compartilhamento.

## Stack tecnológica

- React 19
- TypeScript
- Vite
- Tailwind CSS 4 + componentes shadcn/ui (Radix UI)
- Recharts para os gráficos interativos do dashboard
- Lucide React para ícones
- XLSX
- jsPDF

## Pesquisa de bibliotecas e paleta

A seleção prioriza ferramentas amplamente usadas no ecossistema React e suportadas por documentação oficial. Em uma consulta feita em 10/10/2026, a API pública de downloads do npm retornou, aproximadamente, 134 milhões de downloads na semana para Tailwind CSS, 108 milhões para Lucide React e 56 milhões para Recharts. Downloads incluem instalações automatizadas e não representam usuários únicos ou participação de mercado; são apenas um sinal de adoção.

- [Tailwind CSS com Vite](https://tailwindcss.com/docs/installation/using-vite): framework de estilos e plugin oficial do Vite.
- [shadcn/ui para Vite](https://ui.shadcn.com/docs/installation/vite): padrão de componentes acessíveis e customizáveis usado nas primitivas locais.
- [Recharts](https://recharts.github.io/): componentes de gráficos React; a rosca de pagamento tem legenda com volume absoluto e percentual.
- [Lucide React](https://lucide.dev/guide/packages/lucide-react): ícones SVG consistentes e treeshakable.

Paleta proposta para este dashboard — inspirada em tons institucionais e ajustada para contraste em telas e relatórios:

| Uso | Cor |
| --- | --- |
| Verde floresta / marca | `#174C3A` |
| Verde profundo | `#103B2D` |
| Verde de dados | `#267653` |
| Dourado de destaque | `#D5A83D` |
| Verde suave | `#DCEFE2` |
| Fundo neutro | `#F5F7F4` |
| Texto principal | `#1B3028` |

Os tons são uma proposta visual para o produto, não uma declaração de equivalência aos códigos oficiais de identidade visual do IFSULDEMINAS.

O PDF usa o mesmo conjunto de cores e desenha os gráficos como vetores para manter nitidez na impressão. A primeira página reúne KPIs e gráficos de status, cidades, escolas e cidades nas linhas finais; as páginas seguintes apresentam tabelas detalhadas com números brutos e percentuais, inclusive a origem combinada (cidade e escola) no recorte de até 20 linhas. Como a planilha não inclui data de inscrição, esse recorte segue a ordem das linhas e não deve ser interpretado como uma série temporal.

## Execução local

```bash
cd /workspaces/copese-overview
npm install
npm run dev -- --host 0.0.0.0
```

A aplicação fica disponível em:

```text
http://localhost:3000
```

## Build de produção

```bash
npm run build
```

O resultado da build será gerado na pasta `dist/`.

## Deploy no Netlify

Este projeto é compatível com o Netlify em ambiente estático moderno.

A configuração recomendada é:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Basta conectar o repositório ao Netlify e apontar para o projeto.

## Observações importantes

- Os dados são processados localmente no navegador, sem envio para servidor.
- A solução é apropriada para relatórios analíticos internos e apresentações acadêmicas.
- O dashboard foi desenhado para manter clareza, estabilidade visual e organização em telas de apresentação.

## Referência inspiracional

O projeto segue os princípios de dashboard analítico observados em boas práticas de BI e visualização de dados, como no material de referência sobre dashboards Power BI: https://blog.coupler.io/pt/exemplos-de-dashboard-power-bi/

A inspiração reforça foco em legibilidade, priorização de métricas e estrutura clara de informações.

Para validar o layout responsivo, confira em desktop, tablet e celular; tabelas largas mantêm rolagem horizontal dentro do próprio painel, sem ampliar a página inteira.
