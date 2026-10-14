# Base de conhecimento — Simulador de Patrimônio

Referência de todas as funcionalidades do app: o que cada uma faz, como usar e as regras por trás.

**Sumário**

1. [Visão geral](#1-visão-geral)
2. [Como rodar](#2-como-rodar)
3. [Parâmetros da simulação](#3-parâmetros-da-simulação)
4. [Regras de cálculo](#4-regras-de-cálculo)
5. [Cartões de resumo](#5-cartões-de-resumo)
6. [Gráfico de evolução](#6-gráfico-de-evolução)
7. [Tabela de evolução](#7-tabela-de-evolução)
8. [Meta de patrimônio](#8-meta-de-patrimônio)
9. [Retirada segura e simulação de usufruto](#9-retirada-segura-e-simulação-de-usufruto)
10. [Cenários salvos](#10-cenários-salvos)
11. [Comparação de cenários](#11-comparação-de-cenários)
12. [Exportar CSV](#12-exportar-csv)
13. [Persistência de dados](#13-persistência-de-dados)
14. [Validação e mensagens de erro](#14-validação-e-mensagens-de-erro)
15. [Layout, tema e acessibilidade](#15-layout-tema-e-acessibilidade)
16. [Testes](#16-testes)
17. [Arquitetura e arquivos](#17-arquitetura-e-arquivos)
18. [Limitações e perguntas frequentes](#18-limitações-e-perguntas-frequentes)

---

## 1. Visão geral

Webapp de página única que projeta o patrimônio **mês a mês** a partir de um saldo inicial, uma taxa de rendimento mensal e aportes mensais e/ou anuais. O resultado aparece em cartões de resumo, num gráfico e numa tabela, e tudo é recalculado automaticamente a cada alteração — não existe botão "calcular".

- **Idioma e moeda:** português do Brasil, valores em reais (R$), vírgula como separador decimal.
- **Usuário:** uso pessoal, sem login nem cadastro.
- **Início da simulação:** sempre o mês atual. O mês 1 é o mês corrente.
- **Stack:** React 19 + TypeScript + Vite, gráficos com Recharts, estilos com Tailwind 4, sem servidor nem banco de dados: tudo roda e fica salvo no navegador.

## 2. Como rodar

O Node só é usado para desenvolver e gerar o build (o projeto usa Node 24).

```bash
npm install
npm run dev       # app em http://localhost:5173
npm test          # testes unitários (Vitest)
npm run e2e       # testes de interface (Playwright: Chromium, Firefox, WebKit)
npm run build     # build em dist/
npm run preview   # serve o build localmente para conferir
```

O resultado de `npm run build` é um site **100% estático**: a pasta `dist/` pode ser publicada em qualquer host de arquivos (GitHub Pages, Netlify, S3, um servidor web qualquer), inclusive numa subpasta, porque os caminhos são relativos. Não há API, banco de dados nem variáveis de ambiente.

A versão publicada fica em **https://thierri.github.io/money-sim/**. Todo push na branch `main` roda os testes unitários, gera o build e publica no GitHub Pages (workflow `.github/workflows/deploy.yml`).

## 3. Parâmetros da simulação

Painel **Parâmetros**, à esquerda (no celular, acima do gráfico). Todos os campos vêm preenchidos e podem ser editados a qualquer momento.

| Campo | Unidade | Padrão | Faixa válida | Observações |
| --- | --- | --- | --- | --- |
| Patrimônio inicial | R$ | 10.000,00 | ≥ 0 | Saldo no início do mês 1. |
| Rendimento mensal | % a.m. | 0,80 | > −100 e ≤ 100 | Aceita taxa negativa. |
| Equivalente anual | % a.a. | (derivado) | > −100 | Mostra e permite editar a taxa anual equivalente (ver abaixo). |
| Aporte mensal | R$ | 1.000,00 | ≥ 0 | Campo + slider (0 a R$ 20 mil, passo R$ 100). |
| Aporte anual | R$ | 0,00 | ≥ 0 | Campo + slider (0 a R$ 100 mil, passo R$ 500). |
| Mês do aporte anual | mês | Dezembro | jan–dez | Mês em que o aporte anual entra, todo ano. |
| Horizonte | anos | 10 | inteiro de 1 a 60 | Até 720 meses. |
| Meta de patrimônio | R$ | vazio | > 0 | Opcional. Ver [seção 8](#8-meta-de-patrimônio). |
| Retirada segura | % a.a. | 4,00 | 0 a 100 | Campo + slider (0 a 10%, passo 0,1). Ver [seção 9](#9-retirada-segura-e-simulação-de-usufruto). |

### Digitação de valores

- Os campos de moeda aceitam digitação livre: `2000`, `2.000`, `2.000,50`, `2000,5`, `R$ 1.234`.
- Ao sair do campo, o valor é reformatado no padrão brasileiro (ex.: `2000` → `2.000,00`). Texto inválido é mantido como está, com a mensagem de erro.
- Taxas são formatadas com 2 a 4 casas decimais (ex.: `0,80`, `10,0339`).

### Conversão de taxa anual ↔ mensal

O campo **Equivalente anual** fica ao lado do rendimento mensal:

- Ao mudar a taxa mensal, a anual é recalculada: `(1 + a.m.)^12 − 1`.
- Ao digitar uma taxa anual, a mensal é atualizada: `(1 + a.a.)^(1/12) − 1`.

Exemplo: 0,80% a.m. ≈ 10,0339% a.a.

### Sliders

- Os sliders de aporte e o de retirada andam junto com o campo: mexer num atualiza o outro.
- Se você digitar um valor acima do máximo do slider, a faixa do slider se estende até esse valor.

### Restaurar padrões

O botão **Restaurar padrões** volta todos os campos do painel aos valores padrão. Não apaga cenários salvos.

## 4. Regras de cálculo

A simulação é mês a mês. O rendimento incide sobre o saldo do início do mês e os aportes entram **no fim do mês** (começam a render no mês seguinte):

```
S_t = S_{t-1} · (1 + r) + A_m + A_a · [mês(t) = mês do aporte anual]
```

- `S_0` = patrimônio inicial
- `r` = rendimento mensal em decimal (0,8% → 0,008)
- `A_m` = aporte mensal
- `A_a` = aporte anual, somado só no mês escolhido de cada ano

Para cada mês o app guarda: saldo inicial, rendimento do mês, aportes do mês, retirada do mês, saldo final, aportes acumulados, rendimentos acumulados e retiradas acumuladas.

- Os valores exibidos são arredondados a 2 casas; o cálculo usa precisão total.
- Não entram no cálculo: inflação, imposto de renda e taxas.

**Exemplo de conferência** (R$ 10.000 iniciais, 0,8% a.m., R$ 1.000/mês, sem aporte anual):

| Mês | Rendimento | Saldo final |
| --- | --- | --- |
| 1 | R$ 80,00 | R$ 11.080,00 |
| 2 | R$ 88,64 | R$ 12.168,64 |
| 12 | R$ 178,93 | R$ 23.545,72 |

Em 12 meses: R$ 12.000 aportados e R$ 1.545,72 de rendimento. Esse caso é coberto por teste automatizado.

## 5. Cartões de resumo

Quatro cartões no topo, sempre refletindo o fim do horizonte:

| Cartão | Conteúdo |
| --- | --- |
| **Patrimônio final** | Saldo no último mês. |
| **Total aportado** | Soma de todos os aportes (mensais + anuais). A linha de baixo mostra o patrimônio inicial à parte. |
| **Total de rendimentos** | Soma de todos os rendimentos. |
| **Vindo de rendimentos** | Fração do patrimônio final que veio de rendimentos (rendimentos ÷ patrimônio final). |

Valores muito grandes encolhem a fonte para caber numa linha, em vez de quebrar ou vazar do cartão.

## 6. Gráfico de evolução

O gráfico é **mês a mês** em qualquer horizonte: um ponto por mês, de 12 a 720 pontos.

### Modos

Alternados pelos botões **Barras** / **Linha** no canto do gráfico.

- **Barras** (título "Dinheiro colocado × rendimentos"): barras empilhadas com **Inicial + aportes** (azul) embaixo e **Rendimentos acumulados** (laranja) em cima. Mostra o efeito dos juros compostos ao longo do tempo.
- **Linha** (título "Saldo total"): linha do saldo final mês a mês. É o modo usado para comparar cenários (título passa a "Comparação de cenários").

Com mais de 120 meses, as barras ficam sem espaço e sem contorno entre si, formando uma área contínua — senão ficariam finas demais para enxergar.

### Eixos e tooltip

- **Eixo X:** mês no formato `mmm/aa` (ex.: `set/26`). Os rótulos são espaçados automaticamente para não se sobreporem.
- **Eixo Y:** valores em R$ no formato compacto (ex.: `R$ 120 mil`, `R$ 6 mi`).
- **Tooltip** ao passar o mouse:
  - Barras: mês, saldo final, inicial + aportes, aportes acumulados, rendimentos acumulados e, se ativa, o saldo com retiradas.
  - Linha: o saldo de cada série naquele mês.

### Sobreposições

- **Linha de meta:** linha horizontal tracejada com o rótulo "Meta R$ …", quando há meta preenchida ([seção 8](#8-meta-de-patrimônio)).
- **Simulação de retiradas:** linha tracejada "Com retiradas" e marcador vertical "Retiradas" no mês de início ([seção 9](#9-retirada-segura-e-simulação-de-usufruto)).

O gráfico acompanha as entradas em tempo real, sem animação.

## 7. Tabela de evolução

Seção **Evolução**, abaixo do gráfico.

### Agrupamento

Botões **Mensal** / **Anual**:

Exemplos considerando início em setembro de 2026:

- **Anual:** uma linha por bloco de 12 meses a partir do início — `Ano 1 · até ago/27`, `Ano 2 · até ago/28`…
- **Mensal:** uma linha por mês, numerada — `1. set/26`, `2. out/26`…

### Colunas

| Coluna | Conteúdo |
| --- | --- |
| Período | Ano N (com o mês final) ou o mês. |
| Aportes | Aportes feitos no período. |
| Rendimento | Rendimento gerado no período. |
| Saldo final | Saldo no fim do período. |
| Retirada segura/mês | Saldo final × taxa de retirada ÷ 12, com o botão de simulação de retiradas ao lado. |

- A tabela rola dentro de uma área de altura fixa, com o cabeçalho fixo no topo.
- A linha em que a meta é atingida fica destacada com o selo **meta**.
- A linha em que a simulação de retiradas começa também fica destacada.

## 8. Meta de patrimônio

Campo opcional **Meta de patrimônio** no painel de parâmetros.

Com uma meta preenchida:

- O gráfico mostra uma **linha horizontal tracejada** no valor da meta. O eixo Y se estende se a meta estiver acima do maior saldo.
- Na tabela, o período em que o saldo final atinge a meta pela primeira vez fica destacado com o selo **meta** (no modo anual, o ano que contém esse mês).
- Se o patrimônio inicial já for maior ou igual à meta, ela conta como atingida desde o início.

Deixe o campo vazio para desligar a meta. Um valor inválido (zero, negativo ou texto) mostra erro só no campo, sem travar o resto da simulação.

## 9. Retirada segura e simulação de usufruto

### Retirada segura

O campo **Retirada segura** (padrão 4% a.a., a "regra dos 4%") define quanto do patrimônio poderia ser retirado por ano. A tabela mostra o equivalente mensal de cada período:

```
retirada segura/mês = saldo final × taxa anual ÷ 12
```

Exemplo: com R$ 120.000 e 4%, a retirada segura é R$ 400,00/mês.

### Simulação de usufruto (retiradas)

Cada linha da tabela (menos a última) tem um botão com ícone de seta ao lado da retirada segura. Ao clicar nele:

1. A partir do mês seguinte ao fim daquele período, **os aportes param**.
2. Todo mês sai uma retirada fixa igual à **retirada segura calculada naquele mês** (saldo × taxa ÷ 12).
3. A retirada nunca passa do saldo disponível: se o dinheiro acabar, o saldo fica em zero.

Essa simulação aparece **sobreposta** ao cenário atual, sem substituí-lo:

- Linha tracejada **Com retiradas** no gráfico (em barras e em linha).
- Marcador vertical **Retiradas** no mês em que começam.
- Legenda abaixo do gráfico: "Sem aportes e retirando R$ X/mês após mmm/aa", com o botão **Remover**.

Para desligar, clique de novo no mesmo botão da tabela ou em **Remover**. Clicar no botão de outra linha move o início das retiradas. A simulação se desliga sozinha se o horizonte diminuir e o mês escolhido deixar de existir.

## 10. Cenários salvos

Painel **Cenários Salvos**, acima dos parâmetros. Um cenário é um conjunto nomeado de todos os parâmetros do painel.

- **Salvar:** digite um nome (até 40 caracteres) e clique em **Salvar** (ou Enter). Grava os parâmetros atuais. O botão fica desabilitado se houver campos inválidos.
- **Abrir:** substitui os parâmetros atuais pelos do cenário.
- **Excluir:** remove o cenário (e da comparação, se estiver marcado).

### Onde ficam

Os cenários ficam no **`localStorage` do navegador**, na chave `money-sim:scenarios`, na ordem em que foram criados. Valem só para aquele navegador, naquele computador: outro navegador, outro perfil ou uma janela anônima começam com a lista vazia. Limpar os dados do site apaga os cenários — exporte antes se quiser guardá-los.

### Exportar e importar

No rodapé do painel:

- **Exportar** baixa um arquivo `money-sim-cenarios-AAAA-MM-DD.json` com todos os cenários salvos. Fica desabilitado quando não há cenários.
- **Importar** abre um arquivo exportado e junta os cenários dele aos atuais:
  - um cenário com o mesmo `id` de um existente **substitui** o existente, na mesma posição;
  - os demais entram no fim da lista;
  - itens inválidos são ignorados, e a mensagem diz quantos foram importados, atualizados e ignorados (ex.: "2 cenários importados, 1 atualizado.").
  - Se o arquivo não for JSON nem tiver cenários válidos, aparece um erro e nada muda.

Use para fazer backup ou levar os cenários para outro navegador ou computador.

Formato do arquivo:

```json
{
  "format": "money-sim/cenarios",
  "version": 1,
  "exportedAt": "2026-10-14T12:00:00.000Z",
  "scenarios": [
    { "id": "…", "name": "Aposentadoria", "form": { "initial": "10.000,00", "rate": "0,80", "…": "…" } }
  ]
}
```

A importação também aceita uma lista simples de cenários (`[{ "id", "name", "form" }, …]`). Cada cenário precisa de `id`, nome de 1 a 40 caracteres e todos os campos do formulário como texto; campos extras são descartados.

## 11. Comparação de cenários

Com cenários salvos, cada um tem uma caixa de seleção para comparação:

- Marque até **2 cenários** para comparar com o atual (3 linhas no total).
- Ao marcar o primeiro, o gráfico muda sozinho para o modo **Linha**.
- Cada cenário marcado ganha uma cor, mostrada ao lado do nome e na legenda. A série do cenário atual se chama **Atual**.
- Cenários com horizontes diferentes são alinhados pelo mês de início; o eixo X vai até o maior horizonte.
- No modo **Barras**, a comparação não aparece; uma nota abaixo do gráfico avisa que ela fica no gráfico de linha.

## 12. Exportar CSV

O botão **Exportar CSV**, na tabela, baixa os dados do agrupamento visível no momento:

- Arquivo `simulacao-anual.csv` ou `simulacao-mensal.csv`.
- Colunas: Período, Aportes, Rendimento, Saldo final, Retirada segura mensal, Aportes acumulados, Rendimentos acumulados.
- Formato pensado para o Excel em português: separador `;`, vírgula decimal, sem ponto de milhar, UTF-8 com BOM (acentos aparecem certos).

## 13. Persistência de dados

Fechar e reabrir o navegador mantém o estado. Onde cada coisa fica:

| Dado | Onde | Chave / local |
| --- | --- | --- |
| Cenários salvos | `localStorage` | `money-sim:scenarios` |
| Últimos parâmetros digitados | `localStorage` | `money-sim:form` |
| Cenários marcados para comparação | `localStorage` | `money-sim:compared` |
| Modo do gráfico (barras/linha) | `localStorage` | `money-sim:chart` |
| Agrupamento da tabela (mensal/anual) | `localStorage` | `money-sim:table` |
| Mês da simulação de retiradas | `localStorage` | `money-sim:retire` |

Se o `localStorage` estiver indisponível (ex.: janela anônima com bloqueio), o app funciona normalmente, só não lembra as preferências nem os cenários depois de recarregar.

## 14. Validação e mensagens de erro

- Campo inválido fica destacado com uma mensagem curta logo abaixo (ex.: "Valor inválido", "Não pode ser negativo", "Inteiro de 1 a 60").
- Enquanto houver erro num campo que afeta a simulação, aparece o aviso **"Há campos inválidos — exibindo o último resultado válido."** e resumo, gráfico e tabela continuam mostrando o último resultado válido, em vez de quebrar.
- Erros em **Meta** e **Retirada segura** não congelam a simulação, porque esses campos não mudam o cálculo do saldo.

| Campo | Mensagem |
| --- | --- |
| Patrimônio inicial, aportes | "Valor inválido" / "Não pode ser negativo" |
| Rendimento mensal | "Taxa inválida" / "Entre -100 (excl.) e 100" |
| Horizonte | "Inteiro de 1 a 60" |
| Meta | "Meta inválida" |
| Retirada segura | "Entre 0 e 100" |

## 15. Layout, tema e acessibilidade

- **Responsivo:** no desktop, parâmetros à esquerda e resultados à direita; no celular, parâmetros acima e resultados abaixo. Funciona a partir de 320 px de largura e com zoom de 200%.
- **Tema claro e escuro**, seguindo a configuração do sistema.
- **Sem vazamento de layout:** nenhum campo, seta de select ou valor pode sair do contorno ou cortar texto, em qualquer navegador, idioma ou largura — garantido por testes de geometria e de regressão visual.
- **Acessibilidade:** campos com rótulos, erros ligados aos campos (`aria-describedby`) e anunciados (`role="alert"`), sliders com valor falado em reais, botões de alternância com `aria-pressed`, gráfico com descrição textual.

## 16. Testes

| Tipo | Ferramenta | O que cobre |
| --- | --- | --- |
| Unitário | Vitest (`npm test`) | Função de cálculo (incluindo o exemplo de conferência), validação, formatação e cenários (validação, exportação, importação e junção). |
| Interface | Playwright (`npm run e2e`) | Critérios de aceite, cenários (salvar, recarregar, exportar, importar, sem requisições a servidor), sliders, cartões de resumo com valores enormes, simulação de retiradas, geometria dos campos e regressão visual. |

Os testes de interface rodam em Chromium, Firefox e WebKit, com o navegador em pt-BR e en-US, temas claro e escuro, e larguras de 320 a 1280 px. Cada teste começa com o `localStorage` vazio e usa uma data fixa (15/09/2026).

Para atualizar os screenshots de referência após uma mudança visual intencional: `npm run e2e:update`.

## 17. Arquitetura e arquivos

```
src/
  App.tsx                    estado da página e ligação entre os componentes
  components/
    InputsPanel.tsx          painel de parâmetros, sliders, conversão de taxa
    SummaryCards.tsx         cartões de resumo
    EvolutionChart.tsx       gráfico (barras/linha, meta, retiradas, comparação)
    EvolutionTable.tsx       tabela, botão de retiradas, exportação CSV
    ScenariosPanel.tsx       lista de cenários, salvar/abrir/excluir/comparar, exportar/importar
    FitText.tsx              texto que encolhe para caber numa linha
  lib/
    simulate.ts              cálculo puro, agrupamento por mês/ano, meta, conversão de taxas
    form.ts                  valores padrão e validação dos campos
    format.ts                formatação pt-BR e leitura de números digitados
    scenarios.ts             cenários no localStorage, validação, exportação/importação JSON
    storage.ts               estado persistido em localStorage
vite.config.ts               configuração do Vite (base relativa para hospedagem estática)
e2e/                         testes Playwright e screenshots de referência
```

O cálculo (`src/lib/simulate.ts`) é uma função pura, isolada da interface, o que permite testá-lo diretamente.

## 18. Limitações e perguntas frequentes

**O app considera inflação ou imposto de renda?**
Não. Os valores são nominais e brutos. Inflação, IR regressivo, aporte com reajuste anual e taxa variável por período são evoluções candidatas.

**Posso escolher o mês de início?**
Não. A simulação sempre começa no mês atual.

**Os cenários sincronizam entre computadores?**
Não. Ficam no `localStorage` do navegador. Para levar para outro navegador ou computador, use **Exportar** e depois **Importar**.

**Meus cenários sumiram.**
Provavelmente os dados do site foram limpos, ou você abriu o app em outro navegador, perfil, janela anônima ou endereço (cada endereço tem o seu `localStorage`). Se tiver um arquivo exportado, importe-o.

**Como zerar tudo?**
- Parâmetros: botão **Restaurar padrões**.
- Cenários: exclua pelo painel ou limpe o `localStorage` do site.
- Preferências do navegador: limpe o `localStorage` do site.
