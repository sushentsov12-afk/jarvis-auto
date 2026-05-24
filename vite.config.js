import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-transform-runtime', { useESModules: true }],
        ],
      },
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  server: {
    port: 3000,
    open: true,
    cors: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'production' ? false : true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'recharts': ['recharts'],
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
        },
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: ({ name }) => {
          if (/\.css$/i.test(name)) {
            return 'css/[name]-[hash][extname]';
          } else if (/\.woff2?$/i.test(name)) {
            return 'fonts/[name]-[hash][extname]';
          } else if (/\.(png|jpg|svg)$/i.test(name)) {
            return 'img/[name]-[hash][extname]';
          }
          return '[name]-[hash][extname]';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'firebase'],
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
