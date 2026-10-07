# Simulador de Patrimônio

Webapp de página única (React + TypeScript + Vite + Recharts + Tailwind) que projeta o patrimônio mês a mês. O cálculo roda no navegador. Os cenários salvos ficam num banco SQLite local (`data/money-sim.db`), servido por uma API embutida no próprio Vite; o resto das preferências fica em `localStorage`.

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:5173
npm test         # testes do cálculo (Vitest)
npm run build    # build em dist/ (sirva com `npm run preview` para ter a API de cenários)
```

- `src/lib/simulate.ts`: função de cálculo pura (S_t = S_{t-1}·(1+r) + A_m + A_a·[mês = mês do aporte anual])
- `src/lib/form.ts`: validação das entradas
- `server/`: banco SQLite (`node:sqlite`, Node ≥ 22.13) e API REST `/api/scenarios`. Use `MONEY_SIM_DB=caminho.db` para trocar o arquivo
- `src/lib/scenarios.ts`: hook que lê/grava os cenários na API e migra os que estavam no `localStorage`
- `src/components/`: painel de entradas, resumo, gráfico, tabela, cenários
