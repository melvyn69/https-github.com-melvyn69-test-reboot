import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Injection des variables d'environnement pour l'usage dans le navigateur
    'process.env': {
      API_KEY: "AIzaSyB7fDa6Ua7ZBx6A9-w1dkr8axMSeZg_sfk",
      VITE_SUPABASE_URL: "https://olpgvdlwnipademsocvc.supabase.co",
      VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9scGd2ZGx3bmlwYWRlbXNvY3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzI3ODIsImV4cCI6MjA4MTQ0ODc4Mn0.v-8JTdoosrLMi63iXXGYlrkLvnI5nAz97XlUGs8cP4Q"
    }
  }
});