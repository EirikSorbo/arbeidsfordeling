import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' gjør at bygget fungerer uansett hvilken sti appen
// serveres fra (GitHub Pages legger den under /<repo-navn>/).
export default defineConfig({
  plugins: [react()],
  base: './',
})
