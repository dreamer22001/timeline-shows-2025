import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Para GitHub Pages: se o repositório for "username.github.io", use base: '/'
// Se for um repositório normal, use base: '/nome-do-repositorio/'
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' 
    ? (process.env.VITE_BASE_PATH || '/timeline-shows-2025/')
    : '/',
})
