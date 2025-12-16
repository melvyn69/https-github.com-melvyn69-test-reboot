import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Permet d'utiliser process.env dans le code client si nécessaire, 
    // bien que Vite préfère import.meta.env
    'process.env': process.env
  }
});