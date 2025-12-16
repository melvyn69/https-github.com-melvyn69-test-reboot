import React, { useState } from 'react';
import { Integration } from '../types';
import { signInWithGoogle, supabase } from '../lib/supabaseClient';

interface IntegrationCardProps {
  integration: Integration;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({ integration, onConnect, onDisconnect }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    
    if (integration.platform === 'google_business') {
        try {
            // Appel réel à Supabase Auth
            const { error } = await signInWithGoogle();
            if (error) {
              console.error("Erreur de connexion:", error);
              alert("Erreur lors de la connexion Google: " + error.message);
              setIsLoading(false);
              return;
            }
            // Le redirect va se faire, pas besoin de suite ici
        } catch (e) {
            console.error("Erreur inattendue:", e);
            setIsLoading(false);
        }
    } else {
        // Simulation pour les autres plateformes
        setTimeout(() => {
          onConnect(integration.id);
          setIsLoading(false);
        }, 1500);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${integration.isConnected ? 'bg-green-100' : 'bg-gray-100'}`}>
           {/* Render SVG Icon based on platform */}
           {integration.platform === 'google_business' && (
             <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
               <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
               <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
               <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
               <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
             </svg>
           )}
           {integration.platform === 'facebook' && (
              <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
           )}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{integration.name}</h3>
          <p className="text-sm text-gray-500">
            {integration.isConnected 
              ? `Connecté en tant que ${integration.connectedAs || 'utilisateur'}` 
              : "Non connecté"}
          </p>
        </div>
      </div>

      <button
        onClick={integration.isConnected ? () => onDisconnect(integration.id) : handleConnect}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
          integration.isConnected
            ? "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
            : "border-transparent text-white bg-indigo-600 hover:bg-indigo-700"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <span className="flex items-center">
             <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
             </svg>
             Connexion...
          </span>
        ) : integration.isConnected ? (
          "Déconnecter"
        ) : (
          "Connecter"
        )}
      </button>
    </div>
  );
};