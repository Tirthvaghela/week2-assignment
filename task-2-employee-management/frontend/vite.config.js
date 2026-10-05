import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // The Flask API only accepts requests from this origin (see CORS_ORIGINS
    // in backend/.env.example), so the port is fixed instead of auto-picked.
    port: 5173,
    strictPort: true,
  },
});
