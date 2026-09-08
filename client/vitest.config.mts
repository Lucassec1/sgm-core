import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Testes de componente/unidade do client. Componentes usam jsdom; o alias `@/` vem do
// tsconfig (resolve.tsconfigPaths). E2E dos fluxos críticos fica fora daqui (ver
// docs/arquitetura.md, seção 5).
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.tsx'],
    include: ['{app,components,lib}/**/*.{test,spec}.{ts,tsx}'],
  },
});
