import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => {
  const pagesBuild = process.env.VITE_PAGES === 'true'

  return {
    base: pagesBuild ? '/music_pulse/' : '/',
    build: {
      outDir: pagesBuild ? 'docs' : 'dist',
      emptyOutDir: true,
    },
    plugins: [react()],
  }
})
