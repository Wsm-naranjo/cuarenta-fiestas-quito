import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base './' = rutas relativas: funciona en https://usuario.github.io/<repositorio>/ sin configurar nada más
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    // Pruebas locales: el emulador de Firebase (puerto 9000) se sirve por el mismo puerto de Vite
    proxy: {
      '/.ws': { target: 'ws://127.0.0.1:9000', ws: true, changeOrigin: true },
      '/.lp': { target: 'http://127.0.0.1:9000', changeOrigin: true },
      // y el emulador de Authentication (puerto 9099), para la página de administración
      '/identitytoolkit.googleapis.com': { target: 'http://127.0.0.1:9099', changeOrigin: true },
      '/securetoken.googleapis.com': { target: 'http://127.0.0.1:9099', changeOrigin: true },
      '/emulator': { target: 'http://127.0.0.1:9099', changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
})
