import { createClient } from '@supabase/supabase-js';

// Utilisation des variables d'environnement Vite (Vercel injectera ces valeurs)
// Cast de import.meta pour éviter l'erreur TS "Property 'env' does not exist on type 'ImportMeta'"
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ Les clés Supabase sont manquantes dans les variables d'environnement.");
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
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