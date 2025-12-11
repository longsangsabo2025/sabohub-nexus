import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 9000,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Disable source maps in production for smaller bundle
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        // Create separate chunks for vendor libraries
        manualChunks: (id) => {
          // Critical: React must be loaded first and separately
          if (id.includes('node_modules')) {
            // React core and essential dependencies - MUST be first
            if (id.includes('/node_modules/react/') || 
                id.includes('/node_modules/react-dom/') || 
                id.includes('/node_modules/react-router-dom/') ||
                id.includes('/node_modules/scheduler/') ||
                id.includes('/node_modules/prop-types/') ||
                id.includes('/node_modules/react-is/')) {
              return 'vendor-react';
            }
            
            // Let Vite/Rollup handle the rest automatically to avoid circular dependencies
            // and "undefined" errors caused by aggressive manual chunking.
            // This might result in larger chunks but ensures stability.
          }
        },
        // Optimize asset naming
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Optimize build size
    minify: 'esbuild',
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Target modern browsers for smaller bundle
    target: 'esnext',
    // CSS code splitting
    cssCodeSplit: true,
  },
  // Enable gzip compression
  preview: {
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    },
  },
}));
