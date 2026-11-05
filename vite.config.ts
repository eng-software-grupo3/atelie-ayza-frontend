import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');

  return {
    plugins: [react()],
    server: {
      // Expõe o dev server na rede local para abrir no celular pelo IP do PC.
      host: true,
      // Mantém a porta fixa: se 5173 estiver ocupada, falha em vez de mudar a URL.
      strictPort: true,
      port: Number(env.VITE_DEV_PORT) || 5173,
    },
  };
});
