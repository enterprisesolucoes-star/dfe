import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks(id) {
            // Vendor splits
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';
            if (id.includes('node_modules/motion/')) return 'vendor-motion';
            if (id.includes('node_modules/lucide-react/')) return 'vendor-lucide';
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) return 'vendor-charts';

            // App module splits
            if (id.includes('FiscalModule') || id.includes('NfeDashboard')) return 'chunk-fiscal';
            if (id.includes('FinanceiroModule') || id.includes('CobrancaModule') || id.includes('ComissoesModule')) return 'chunk-financeiro';
            if (id.includes('CadastrosModule')) return 'chunk-cadastros';
            if (id.includes('VendaModule') || id.includes('OrdemServicoModule') || id.includes('PedidoModule') || id.includes('ComprasModule')) return 'chunk-comercial';
            if (id.includes('DashboardModule') || id.includes('RelatorioTefModule') || id.includes('UIComponents')) return 'chunk-ui';
          },
        },
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
