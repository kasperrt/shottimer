import solid from '@solidjs/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const env = { ...process.env, ...fileEnv };
  const clientPort = Number.parseInt(env.VITE_CLIENT_PORT ?? '', 10);

  return {
    plugins: [tailwindcss(), solid()],
    resolve: { alias: { '@': '/src' } },
    server: {
      port: Number.isFinite(clientPort) ? clientPort : 3000,
    },
  };
});
