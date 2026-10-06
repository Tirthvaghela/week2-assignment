import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5175,
      strictPort: true,
      // Requests to /api are forwarded to the Flask server. The browser then
      // sees the page and the API on one address, so the login cookie is a
      // normal same-site cookie and no cross-origin setup is needed.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:5001',
          changeOrigin: true,
        },
      },
    },
  };
});
