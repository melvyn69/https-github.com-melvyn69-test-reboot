import { createClient } from '@supabase/supabase-js';

// Utilisation sécurisée des variables d'environnement avec fallback
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://olpgvdlwnipademsocvc.supabase.co";
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9scGd2ZGx3bmlwYWRlbXNvY3ZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NzI3ODIsImV4cCI6MjA4MTQ0ODc4Mn0.v-8JTdoosrLMi63iXXGYlrkLvnI5nAz97XlUGs8cP4Q";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Les clés Supabase sont manquantes.");
}

export const supabase = createClient(
  supabaseUrl, 
  supabaseAnonKey
);

export const signInWithGoogle = async () => {
  // Déclenche le flux OAuth pour Google Business Profile
  // Le scope business.manage est requis pour lire/répondre aux avis
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin, // Vercel détectera automatiquement le bon domaine
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      scopes: 'https://www.googleapis.com/auth/business.manage' 
    }
  });
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};