# Simulador de Patrimônio

Webapp de página única (React + TypeScript + Vite + Recharts + Tailwind) que projeta o patrimônio mês a mês. Tudo roda no navegador; os dados ficam em `localStorage`.

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:5173
npm test         # testes do cálculo (Vitest)
npm run build    # build estático em dist/
```

- `src/lib/simulate.ts`: função de cálculo pura (S_t = S_{t-1}·(1+r) + A_m + A_a·[mês = mês do aporte anual])
- `src/lib/form.ts`: validação das entradas
- `src/components/`: painel de entradas, resumo, gráfico, tabela, cenários
