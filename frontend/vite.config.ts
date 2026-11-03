import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const vendorChunks: Record<string, string[]> = {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-antd': ['antd', '@ant-design/icons'],
            'vendor-charts': ['chart.js', 'react-chartjs-2'],
            'vendor-utils': ['axios', 'dayjs', 'lucide-react'],
          };
          for (const [chunk, pkgs] of Object.entries(vendorChunks)) {
            if (
              pkgs.some(
                (pkg) =>
                  id.includes(`/node_modules/${pkg}/`) ||
                  id.includes(`\\node_modules\\${pkg}\\`) ||
                  (pkg === 'react-router-dom' &&
                    (id.includes('/node_modules/react-router/') ||
                      id.includes('\\node_modules\\react-router\\')))
              )
            ) {
              return chunk;
            }
          }
        },
      },
    },
  },
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.tutorhub.id.vn',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
