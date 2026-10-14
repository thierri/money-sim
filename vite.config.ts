import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Caminhos relativos: o build em dist/ funciona em qualquer host estático, inclusive em subpasta.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
