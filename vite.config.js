import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - bibliotecas externas
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],
          'vendor-socket': ['socket.io-client'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-date': ['date-fns'],

          // Chunks por funcionalidade
          'chat': [
            './src/components/ChatWindow.jsx',
            './src/components/AudioRecorder.jsx',
            './src/components/FileUploader.jsx',
            './src/components/CustomAudioPlayer.jsx',
            './src/components/QuickMessagesBar.jsx',
            './src/components/QuickMessagesManager.jsx',
            './src/components/SignatureManager.jsx'
          ],
          'kanban': ['./src/components/KanbanBoard.jsx'],
          'analytics': ['./src/components/Analytics.jsx'],
          'stock': ['./src/components/ProductStock.jsx']
        }
      }
    },
    // Otimizações de performance
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info']
      }
    },
    // Otimizações para carregamento mais rápido
    cssCodeSplit: true,
    reportCompressedSize: false,
    sourcemap: false
  },
  // Otimizar dependências
  optimizeDeps: {
    include: ['react', 'react-dom', 'socket.io-client'],
    exclude: []
  }
})
