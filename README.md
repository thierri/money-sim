# Simulador de Patrimônio

**Site:** https://thierri.github.io/money-sim/

Webapp de página única (React + TypeScript + Vite + Recharts + Tailwind) que projeta o patrimônio mês a mês. 100% estático: o cálculo roda no navegador e os cenários salvos e as preferências ficam no `localStorage`. Os cenários podem ser exportados e importados como arquivo JSON.

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:5173
npm test         # testes do cálculo (Vitest)
npm run build    # build estático em dist/ (publique em qualquer host estático)
```

- `src/lib/simulate.ts`: função de cálculo pura (S_t = S_{t-1}·(1+r) + A_m + A_a·[mês = mês do aporte anual])
- `src/lib/form.ts`: validação das entradas
- `src/lib/scenarios.ts`: hook dos cenários no `localStorage`, exportação e importação em JSON
- `src/components/`: painel de entradas, resumo, gráfico, tabela, cenários

Documentação completa das funcionalidades: [`docs/KB.md`](docs/KB.md).
