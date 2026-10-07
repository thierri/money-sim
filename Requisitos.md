# Requisitos — Simulador de Patrimônio

Sep 30, 2026 · @Thierri

## Visão geral

Um webapp de página única que projeta o patrimônio mês a mês a partir de um saldo inicial, uma taxa de rendimento mensal e aportes mensais e/ou anuais, mostrando o resultado em gráfico e tabela.

- **Usuário:** apenas eu. Sem login, sem cadastro, sem backend obrigatório.
- **Objetivo:** responder rápido a perguntas como "quanto terei em 10 anos se aportar R$ 2.000 por mês?" e comparar o efeito de mudar cada variável.
- **Moeda e idioma:** reais (R$) e português do Brasil, com separador decimal vírgula.

## Entradas da simulação

Todos os campos são editáveis a qualquer momento e vêm preenchidos com valores padrão.

| Campo | Tipo | Unidade | Padrão | Validação |
| --- | --- | --- | --- | --- |
| Patrimônio inicial | Moeda | R$ | 10.000,00 | ≥ 0 |
| Rendimento mensal | Percentual | % a.m. | 0,80 | -100 < x ≤ 100 |
| Aporte mensal | Moeda | R$ | 1.000,00 | ≥ 0 |
| Aporte anual | Moeda | R$ | 0,00 | ≥ 0 |
| Mês do aporte anual | Lista (jan–dez) | mês | Dezembro | um dos 12 meses |
| Horizonte | Inteiro | anos | 10 | 1 a 60 |
| Retirada segura | Percentual (campo + slider 0–10) | % a.a. | 4,00 | 0 a 100 |

- A simulação sempre começa no mês atual; não há campo de data de início.
- Aporte mensal e anual podem coexistir; zerar um deles o desliga.
- Um atalho converte taxa anual em mensal: (1 + a.a.)^(1/12) − 1, exibindo as duas.
- Campos de moeda aceitam digitação livre ("2000", "2.000,50") e formatam ao sair do campo.

## Regras de cálculo

A simulação é mês a mês: o rendimento incide sobre o saldo do início do mês e os aportes entram no fim do mês (rendem a partir do mês seguinte).

```latex
S_t = S_{t-1} \cdot (1 + r) + A_m + A_a \cdot [\text{mês}(t) = \text{mês do aporte anual}]
```

Onde S₀ = patrimônio inicial, r = rendimento mensal em decimal, A\_m = aporte mensal e A\_a = aporte anual.

Para cada mês o app guarda: saldo inicial, rendimento do mês, aportes do mês, saldo final, total aportado acumulado e total de rendimento acumulado. Saldo final = patrimônio inicial + aportes acumulados + rendimentos acumulados (verificação interna).

**Exemplo de conferência** (R$ 10.000 iniciais, 0,8% a.m., R$ 1.000/mês, sem aporte anual):

| Mês | Rendimento (R$) | Saldo final (R$) |
| --- | --- | --- |
| 1 | 80,00 | 11.080,00 |
| 2 | 88,64 | 12.168,64 |
| 12 | 178,93 | 23.545,72 |

Em 12 meses: R$ 12.000 aportados e R$ 1.545,72 de rendimento. Esse caso vira um teste automatizado.

Não entram na versão 1: inflação, impostos (IR) e taxas. Valores exibidos são arredondados a 2 casas; o cálculo usa precisão total.

## Requisitos funcionais

| ID | Requisito | Prioridade |
| --- | --- | --- |
| RF01 | Painel de entradas com todos os campos da seção Entradas, editáveis | Must |
| RF02 | Recálculo automático a cada alteração (sem botão "calcular"), em menos de 100 ms | Must |
| RF03 | Cartões de resumo: patrimônio final, total aportado, total de rendimentos, % do patrimônio vindo de rendimentos | Must |
| RF04 | Gráfico de evolução do patrimônio (ver Visualização gráfica) | Must |
| RF05 | Tabela de evolução com alternância mensal/anual, colunas: período, aportes, rendimento, saldo final, retirada segura mensal (saldo final × taxa de retirada ÷ 12) | Must |
| RF06 | Botão "restaurar padrões" | Should |
| RF07 | Salvar cenários com nome e reabri-los depois | Should |
| RF08 | Comparar até 3 cenários no mesmo gráfico | Could |
| RF09 | Exportar a tabela em CSV | Could |
| RF10 | Meta de patrimônio: informar um valor-alvo e mostrar em que mês ele é atingido | Could |
| RF11 | Botão em cada linha da tabela (ao lado da retirada segura) que sobrepõe nos gráficos uma simulação em que, após aquele mês, os aportes param e a retirada segura daquela data sai todo mês (até o saldo zerar) | Could |

Campos inválidos ficam destacados com mensagem curta, e o último resultado válido continua na tela.

## Visualização gráfica

O gráfico principal é de barras empilhadas por ano, separando o que é dinheiro colocado (inicial + aportes) do que é rendimento, para mostrar o efeito dos juros compostos ao longo do tempo.

&#91;embedded content: Exemplo calculado pelas regras acima · R$ 10 mil iniciais, 0,8% a.m., R$ 1.000/mês, 10 anos\]

- **Eixo X:** data do fim de cada período, no formato mmm/aa (ex.: ago/27, ago/28), anual ou mensal quando o horizonte for de até 3 anos; **eixo Y:** R$.
- **Tooltip** ao passar o mouse: período, saldo final, aportes e rendimentos acumulados.
- **Alternância** para gráfico de linha do saldo total, útil para comparar cenários (RF08).
- **Linha de meta** horizontal tracejada quando a meta de patrimônio (RF10) estiver preenchida.
- O gráfico acompanha as entradas em tempo real, sem animação longa.

## Requisitos não funcionais

- **Sem autenticação e sem servidor:** app 100% no navegador; nenhum dado sai da máquina.
- **Persistência:** últimas entradas e cenários salvos em `localStorage`; ao reabrir, o app volta ao estado anterior.
- **Stack sugerida:** React + TypeScript + Vite, gráfico com Recharts (ou Chart.js), estilo com Tailwind. Hospedagem estática opcional (Vercel/Netlify) ou rodar local.
- **Responsivo:** funciona no MacBook e no celular; no celular, entradas acima e gráfico abaixo.
- **Formatação:** `Intl.NumberFormat('pt-BR')` para moeda e percentuais.
- **Desempenho:** até 720 meses (60 anos) calculados e desenhados sem travar a digitação.
- **Testes:** função de cálculo pura, isolada da UI, com testes unitários (Vitest) incluindo o exemplo de conferência.
- **Tema:** claro e escuro, seguindo o sistema.

### Qualidade de layout

Nenhum controle pode vazar do seu contorno nem esconder texto, em qualquer navegador, idioma ou largura.

- **Controles:** `box-sizing: border-box` global; `min-width: 0` nos itens do grid; `<select>` com `appearance: none` e seta própria dentro do `padding-right`. Nada de `<input type="month">` nativo.
- **Regressão visual:** Playwright `toHaveScreenshot()` do formulário na matriz Chromium/WebKit/Firefox × 375/768/1280 px × tema claro/escuro × navegador em pt-BR/en-US.
- **Checagem de geometria:** teste que percorre `input` e `select` e falha se `scrollWidth > clientWidth` (texto cortado) ou se o campo ou seu ícone passar da borda do container (`getBoundingClientRect`).
- **Estresse de conteúdo:** os mesmos testes com R$ 999.999.999,99, o mês de nome mais longo, horizonte de 60 anos e retirada de 100%, em zoom de 200% e largura de 320 px (WCAG 1.4.10).

## Fora de escopo e evoluções futuras

Fora da versão 1: login, multiusuário, sincronização entre dispositivos e integração com bancos ou corretoras.

Candidatos para depois:

- Inflação (IPCA) para ver o patrimônio em valores de hoje
- Imposto de renda por tabela regressiva
- Aporte com reajuste anual (ex.: +5% ao ano)
- Taxa variável por período (ex.: Selic projetada)

## Critérios de aceite

- [ ] Com os valores do exemplo de conferência, o mês 12 mostra saldo de R$ 23.545,72
- [ ] Alterar qualquer campo atualiza resumo, gráfico e tabela sem clicar em nada
- [ ] Aporte anual entra só no mês escolhido de cada ano
- [ ] Com rendimento 0%, o saldo final = inicial + aportes
- [ ] Fechar e reabrir o navegador mantém os últimos valores
- [ ] Horizonte de 60 anos renderiza sem atraso perceptível
- [ ] Campos inválidos mostram erro e não quebram o gráfico
- [ ] A seta do select de mês do aporte anual fica inteira dentro do campo em Chromium, WebKit e Firefox
- [ ] A simulação começa no mês atual e o eixo X do gráfico mostra datas (mmm/aa)
- [ ] Com R$ 120.000 e retirada de 4%, a coluna de retirada segura mostra R$ 400,00
- [ ] Testes de regressão visual e de geometria passam em toda a matriz de layout
