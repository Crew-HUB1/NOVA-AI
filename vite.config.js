import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Repo name — required so assets resolve at https://<user>.github.io/NOVA-AI/
  base: '/NOVA-AI/',
  plugins: [react()],
  server: { port: 5173, open: true },
})
