import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],

  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
  },

  preview: {
    host: '0.0.0.0',
    port: 4173,
  },

  build: {
    outDir: 'dist',
    sourcemap: !isProduction,
    minify: 'terser',
    chunkSizeWarningLimit: 1200,

    terserOptions: {
      compress: {
        drop_console: isProduction,
        drop_debugger: isProduction,
      },
    },

    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('firebase')) {
            return 'firebase';
          }

          if (id.includes('react')) {
            return 'react-vendor';
          }

          if (id.includes('recharts')) {
            return 'charts';
          }
        },

        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.css$/i.test(name ?? '')) {
            return 'css/[name]-[hash][extname]';
          }

          if (/\.woff2?$/i.test(name ?? '')) {
            return 'fonts/[name]-[hash][extname]';
          }

          if (/\.(png|jpg|jpeg|svg|webp)$/i.test(name ?? '')) {
            return 'img/[name]-[hash][extname]';
          }

          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },

  optimizeDeps: {
    include: ['react', 'react-dom'],
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});