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
          'whatsapp': ['./src/components/WhatsAppConnection.jsx'],
          'stock': ['./src/components/ProductStock.jsx']
        }
      }
    },
    // Otimizações adicionais
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log em produção
        drop_debugger: true
      }
    }
  }
})
