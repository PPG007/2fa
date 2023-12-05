import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import {resolve} from 'path';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '^/api/.*': {
        target: 'http://127.0.0.1:8080',
        rewrite: path => path.replace(/^\/api/, ''),
      }
    }
  },
  resolve: {
    alias: {
      'crypto': resolve(__dirname, 'node_modules/crypto-browserify')
    }
  }
})
