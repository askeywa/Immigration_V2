import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2015',
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Source maps only for production debugging
    sourcemap: false,
    
    // Chunk size warning limit
    chunkSizeWarningLimit: 500,
    
    // Rollup options for optimal code splitting
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // Core React libraries (rarely change)
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Data fetching (medium priority)
          'query': ['@tanstack/react-query'],
          
          // Heavy libraries (lazy load these)
          'motion': ['framer-motion'],
          'charts': ['recharts'],
          
          // State management (small, can be in main)
          'state': ['zustand'],
          
          // Icons (medium size)
          'icons': ['lucide-react'],
          
          // UI components (if using headless-ui heavily)
          'ui': ['@headlessui/react', '@heroicons/react'],
          
          // Sentry (non-critical, separate chunk)
          'monitoring': ['@sentry/react', '@sentry/tracing'],
        },
        
        // Asset file names with hash for cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          // Put fonts in fonts folder
          if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          
          // Put images in images folder
          if (/\.(png|jpe?g|svg|gif|webp|avif)$/.test(assetInfo.name)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          
          // Default
          return `assets/[name]-[hash][extname]`;
        },
        
        // Chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    
    // Optimize deps
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'zustand',
      'axios',
    ],
    exclude: [
      // Exclude heavy libraries from pre-bundling
      'pdfjs-dist', // Lazy load this
    ],
  },
  
  // Performance
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
});