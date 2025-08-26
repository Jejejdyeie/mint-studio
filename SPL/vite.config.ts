import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import nodePolyfills from 'rollup-plugin-polyfill-node';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    // Add a plugin to inject polyfills
    {
      name: 'buffer-polyfill',
      transformIndexHtml: {
        order: 'pre' as const,
        handler(html: string) {
          return html.replace(
            '<head>',
            `<head>
            <script>
              // Polyfill Buffer and global for Solana compatibility
              if (typeof globalThis.global === 'undefined') {
                globalThis.global = globalThis;
              }
              if (typeof globalThis.process === 'undefined') {
                globalThis.process = { env: {} };
              }
            </script>`
          );
        },
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      buffer: 'buffer',
      process: 'process/browser',
      util: 'util',
    },
  },
  optimizeDeps: {
    include: [
      'buffer', 
      'process',
      '@solana/web3.js',
      '@solana/spl-token',
      '@solana/wallet-adapter-base',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-react-ui',
      '@solana/wallet-adapter-phantom',
      '@solana/wallet-adapter-solflare'
    ],
    esbuildOptions: {
      target: 'es2022',
      define: {
        global: 'globalThis',
        'process.env': '{}',
      },
      plugins: [
        (NodeGlobalsPolyfillPlugin({ buffer: true, process: true }) as unknown) as any,
        (NodeModulesPolyfillPlugin() as unknown) as any,
      ],
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      plugins: [ (nodePolyfills() as unknown) as any ],
    },
  }
}));