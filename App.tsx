import React, { useState, useMemo, useEffect } from 'react';
import { MOCK_LOCATIONS, MOCK_REVIEWS } from './constants';
import { Review, Location, ViewState, Integration, ReviewSource } from './types';
import { ReviewCard } from './components/ReviewCard';
import { IntegrationCard } from './components/IntegrationCard';
import { supabase, signOut } from './lib/supabaseClient';
import { fetchGoogleData, replyToGoogleReview } from './services/googleBusinessService';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('reviews');
  
  // Data State
  const [locations, setLocations] = useState<Location[]>(MOCK_LOCATIONS);
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isUsingRealData, setIsUsingRealData] = useState(false);
  
  // Error State pour affichage UX
  const [apiError, setApiError] = useState<{ type: 'API_NOT_ENABLED' | 'AUTH_EXPIRED' | 'OTHER', message?: string } | null>(null);

  const [integrations, setIntegrations] = useState<Integration[]>([
    { id: '1', platform: 'google_business', name: 'Google Business Profile', icon: 'google', isConnected: false },
    { id: '2', platform: 'facebook', name: 'Facebook Pages', icon: 'facebook', isConnected: false },
  ]);

  // Auth State Listener
  useEffect(() => {
    if (!supabase) return;

    // 1. Vérifier si on a déjà un token sauvegardé en local
    const storedToken = localStorage.getItem('google_provider_token');
    if (storedToken) {
        setGoogleToken(storedToken);
    }

    // 2. Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth Event: ${event}`);
      
      if (session) {
        if (session.provider_token) {
            console.log("🔑 Nouveau Token Google reçu !");
            setGoogleToken(session.provider_token);
            localStorage.setItem('google_provider_token', session.provider_token);
            
            // Redirection auto vers les avis pour voir le résultat immédiatement
            setCurrentView('reviews');
        }
        updateGoogleIntegrationUI(session, session.provider_token || storedToken);
      } else if (event === 'SIGNED_OUT') {
        setGoogleToken(null);
        setIsUsingRealData(false);
        localStorage.removeItem('google_provider_token');
        updateGoogleIntegrationUI(null, null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Déclencheur pour charger les données
  useEffect(() => {
    if (googleToken) {
        handleFetchRealData(googleToken);
    }
  }, [googleToken]);

  const updateGoogleIntegrationUI = (session: any, token: string | null) => {
    const isConnected = !!session;
    const email = session?.user?.email;

    setIntegrations(prev => prev.map(int => 
      int.platform === 'google_business' 
        ? { 
            ...int, 
            isConnected, 
            connectedAs: email,
            lastSync: isConnected ? new Date().toLocaleDateString('fr-FR') : undefined 
          } 
        : int
    ));
  };

  const handleFetchRealData = async (token: string) => {
    setIsLoadingData(true);
    setApiError(null); // Reset des erreurs
    try {
      const { locations: realLocations, reviews: realReviews } = await fetchGoogleData(token);
      
      if (realLocations.length > 0) {
        console.log("Integration réussie :", realLocations.length, "locations et", realReviews.length, "avis.");
        setLocations(realLocations);
        setReviews(realReviews); // On remplace totalement les mocks
        setIsUsingRealData(true);
      } else {
        console.warn("Connexion réussie mais aucune donnée trouvée.");
        if (currentView === 'reviews' && !isUsingRealData) {
            // Warning soft
            alert("Connexion Google réussie, mais aucun établissement trouvé. Vérifiez que ce compte est bien administrateur d'une fiche validée.");
        }
      }
      
    } catch (error: any) {
      console.error("Erreur récupération données Google:", error);
      
      // Gestion spécifique API non activée (429)
      if (error.message && error.message.includes('API_NOT_ENABLED')) {
          setApiError({ 
              type: 'API_NOT_ENABLED', 
              message: error.message.split(':')[1]?.trim() || 'API Inconnue' 
          });
      }
      // Gestion Token Expiré (401)
      else if (error.message && (error.message.includes('401') || error.message.includes('UNAUTHENTICATED'))) {
          setApiError({ type: 'AUTH_EXPIRED' });
          localStorage.removeItem('google_provider_token');
          setGoogleToken(null);
      }
      // Autres erreurs
      else {
          alert(`Erreur technique : ${error.message}`);
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  const manualRefresh = () => {
      if (googleToken) {
          handleFetchRealData(googleToken);
      } else {
          alert("Veuillez connecter votre compte Google dans les Paramètres d'abord.");
      }
  };

  // View State
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'replied' | 'pending'>('all');

  // Filter Logic
  const filteredReviews = useMemo(() => {
    return reviews.filter(review => {
      const matchLocation = selectedLocationId === 'all' || review.location_id === selectedLocationId;
      const matchStatus = 
        filterStatus === 'all' ? true :
        filterStatus === 'replied' ? review.is_replied :
        !review.is_replied;
      return matchLocation && matchStatus;
    });
  }, [reviews, selectedLocationId, filterStatus]);

  // Actions
  const handleUpdateReview = async (reviewId: string, responseText: string) => {
    // Optimistic update
    setReviews(prev => prev.map(r => {
      if (r.id === reviewId) {
        return { ...r, response: responseText, is_replied: true };
      }
      return r;
    }));

    // Appel API Réel
    const review = reviews.find(r => r.id === reviewId);
    if (review && review.source === ReviewSource.GOOGLE) {
       if (!googleToken) {
           alert("Mode Démo : La réponse est enregistrée localement uniquement.");
           return;
       }

       const location = locations.find(l => l.id === review.location_id);
       if (location && location.organization_id) {
          try {
             await replyToGoogleReview(
                googleToken, 
                location.organization_id, // accountId
                location.id, // locationId
                review.id, // reviewId
                responseText
             );
             console.log("✅ Réponse publiée sur Google avec succès !");
             alert("Réponse publiée avec succès sur Google !");
          } catch (error: any) {
             console.error("Erreur publication Google:", error);
             alert("Erreur lors de l'envoi à Google: " + error.message);
          }
       }
    }
  };

  const handleConnectIntegration = (id: string) => {
    const integration = integrations.find(i => i.id === id);
    if (integration?.platform !== 'google_business') {
      setIntegrations(prev => prev.map(int => 
        int.id === id ? { ...int, isConnected: true, lastSync: new Date().toLocaleDateString('fr-FR') } : int
      ));
    }
  };

  const handleDisconnectIntegration = async (id: string) => {
    const integration = integrations.find(i => i.id === id);
    
    if (integration?.platform === 'google_business') {
      await signOut();
      setGoogleToken(null);
      setIsUsingRealData(false);
      localStorage.removeItem('google_provider_token');
      localStorage.removeItem('google_refresh_token');
      setLocations(MOCK_LOCATIONS);
      setReviews(MOCK_REVIEWS);
      setApiError(null);
    } else {
      setIntegrations(prev => prev.map(int => 
        int.id === id ? { ...int, isConnected: false, lastSync: undefined } : int
      ));
    }
  };

  const pendingCount = reviews.filter(r => !r.is_replied).length;

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-900">
      
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-2 border-b border-gray-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
               <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
               <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
             </svg>
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">Reviewflow</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <button 
            onClick={() => setCurrentView('reviews')}
            className={`${currentView === 'reviews' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'} w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`${currentView === 'reviews' ? 'text-indigo-500' : 'text-gray-400'} mr-3 flex-shrink-0 h-5 w-5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Avis Clients
            {pendingCount > 0 && (
              <span className="ml-auto bg-indigo-200 text-indigo-800 py-0.5 px-2 rounded-full text-xs font-semibold">
                {pendingCount}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => setCurrentView('locations')}
            className={`${currentView === 'locations' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'} w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
          >
             <svg xmlns="http://www.w3.org/2000/svg" className={`${currentView === 'locations' ? 'text-indigo-500' : 'text-gray-400'} mr-3 flex-shrink-0 h-5 w-5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Établissements
          </button>

          <button 
            onClick={() => setCurrentView('settings')}
            className={`${currentView === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'} w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`${currentView === 'settings' ? 'text-indigo-500' : 'text-gray-400'} mr-3 flex-shrink-0 h-5 w-5`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Paramètres
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8">

        {/* --- BANDEAU ERREUR API NON ACTIVÉE --- */}
        {apiError?.type === 'API_NOT_ENABLED' && (
          <div className="mb-8 rounded-lg bg-red-50 p-4 border-l-4 border-red-500 shadow-sm">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 w-full">
                <h3 className="text-lg font-bold text-red-800">
                  Action requise : Accès à l'API non validé
                </h3>
                <div className="mt-3 text-sm text-red-800">
                  <p className="mb-3">
                    Votre API est activée et la facturation est liée, mais Google n'a pas encore validé votre accès aux données Business Profile. C'est une étape de sécurité obligatoire.
                  </p>

                  <a 
                    href="https://developers.google.com/my-business/content/prereqs#request-access" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block bg-red-700 text-white px-6 py-3 rounded-md font-bold hover:bg-red-800 transition-colors shadow-md"
                  >
                    📑 Ouvrir le formulaire de demande d'accès
                  </a>
                  
                  <p className="mt-3 text-xs text-red-600">
                    * Cliquez sur "Request Access" ou "Prerequisites" dans la page qui s'ouvre pour trouver le formulaire Google Forms.
                  </p>
                  
                  <button 
                    onClick={() => googleToken && handleFetchRealData(googleToken)}
                    className="mt-4 block text-red-800 underline hover:text-red-900 font-medium"
                  >
                    J'ai rempli le formulaire, réessayer la connexion
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- BANDEAU AUTH EXPIRÉE --- */}
        {apiError?.type === 'AUTH_EXPIRED' && (
          <div className="mb-8 rounded-lg bg-yellow-50 p-4 border-l-4 border-yellow-400 shadow-sm">
             <div className="flex">
               <div className="flex-shrink-0">
                 <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                 </svg>
               </div>
               <div className="ml-3">
                 <h3 className="text-sm font-medium text-yellow-800">Session expirée</h3>
                 <div className="mt-2 text-sm text-yellow-700">
                   <p>Votre connexion Google a expiré pour des raisons de sécurité. Veuillez vous reconnecter via l'onglet Paramètres.</p>
                 </div>
               </div>
             </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto">
          
          {/* REVIEWS VIEW */}
          {currentView === 'reviews' && (
            <>
              {/* Top Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">Avis Clients</h1>
                    {isUsingRealData ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                        ● Live Data
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Mode Démo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {isLoadingData ? 'Synchronisation avec Google en cours...' : 'Gérez et répondez aux avis de vos établissements.'}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm bg-white border"
                    >
                      <option value="all">Tous les établissements</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={manualRefresh}
                    className="p-2 bg-white border border-gray-300 rounded-md text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
                    title="Rafraîchir les données"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLoadingData ? 'animate-spin text-indigo-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Filters Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <button 
                    onClick={() => setFilterStatus('all')}
                    className={`p-4 rounded-xl border transition-colors text-left ${filterStatus === 'all' ? 'bg-white border-indigo-500 ring-1 ring-indigo-500 shadow-sm' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
                >
                  <span className="block text-sm font-medium text-gray-500">Total Avis</span>
                  <span className="block mt-1 text-2xl font-bold text-gray-900">
                    {isLoadingData ? '...' : reviews.length}
                  </span>
                </button>
                <button 
                    onClick={() => setFilterStatus('pending')}
                    className={`p-4 rounded-xl border transition-colors text-left ${filterStatus === 'pending' ? 'bg-white border-yellow-500 ring-1 ring-yellow-500 shadow-sm' : 'bg-white border-gray-200 hover:border-yellow-300'}`}
                >
                  <span className="block text-sm font-medium text-gray-500">À traiter</span>
                  <span className="block mt-1 text-2xl font-bold text-yellow-600">
                    {isLoadingData ? '...' : pendingCount}
                  </span>
                </button>
                <button 
                    onClick={() => setFilterStatus('replied')}
                    className={`p-4 rounded-xl border transition-colors text-left ${filterStatus === 'replied' ? 'bg-white border-green-500 ring-1 ring-green-500 shadow-sm' : 'bg-white border-gray-200 hover:border-green-300'}`}
                >
                  <span className="block text-sm font-medium text-gray-500">Répondus</span>
                  <span className="block mt-1 text-2xl font-bold text-green-600">
                    {isLoadingData ? '...' : reviews.length - pendingCount}
                  </span>
                </button>
              </div>

              {/* Review List */}
              <div className="space-y-6">
                {isLoadingData ? (
                  <div className="text-center py-12">
                     <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     <p className="mt-2 text-gray-500">Chargement des avis Google...</p>
                  </div>
                ) : filteredReviews.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun avis trouvé</h3>
                    <p className="mt-1 text-sm text-gray-500">Essayez de modifier les filtres ou connectez une intégration.</p>
                  </div>
                ) : (
                  filteredReviews.map(review => {
                    const location = locations.find(l => l.id === review.location_id) || locations[0];
                    return (
                      <ReviewCard 
                        key={review.id} 
                        review={review} 
                        location={location} 
                        onUpdateReview={handleUpdateReview}
                      />
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* LOCATIONS VIEW */}
          {currentView === 'locations' && (
            <div>
               <h1 className="text-2xl font-bold text-gray-900 mb-6">Établissements</h1>
               <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                 <ul className="divide-y divide-gray-200">
                   {locations.map(loc => (
                     <li key={loc.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                       <div>
                         <h3 className="text-sm font-medium text-indigo-600">ID: {loc.id}</h3>
                         <p className="text-lg font-semibold text-gray-900">{loc.name}</p>
                         <p className="text-gray-500">{loc.address}</p>
                       </div>
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isUsingRealData ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                         {isUsingRealData ? 'Synchro Google' : 'Démo'}
                       </span>
                     </li>
                   ))}
                 </ul>
               </div>
            </div>
          )}

          {/* SETTINGS VIEW */}
          {currentView === 'settings' && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
                <p className="text-sm text-gray-500 mt-1">Gérez vos intégrations et préférences.</p>
              </div>

              <div className="space-y-6">
                <section>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Intégrations</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {integrations.map(integration => (
                      <IntegrationCard 
                        key={integration.id} 
                        integration={integration} 
                        onConnect={handleConnectIntegration}
                        onDisconnect={handleDisconnectIntegration}
                      />
                    ))}
                  </div>
                </section>

                <section className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Préférences IA</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Réponse automatique</p>
                        <p className="text-sm text-gray-500">Proposer automatiquement des brouillons pour les nouveaux avis</p>
                      </div>
                      <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                          <input type="checkbox" name="toggle" id="toggle" className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-indigo-600 left-4"/>
                          <label htmlFor="toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-indigo-600 cursor-pointer"></label>
                      </div>
                    </div>
                  </div>
                </section>

                 {/* Dépannage Section */}
                 <section className="bg-white rounded-xl border border-yellow-200 p-6 mt-6">
                  <h2 className="text-lg font-medium text-yellow-800 mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Dépannage API
                  </h2>
                  <div className="text-sm text-gray-600">
                    <p className="mb-4">
                      Si vous rencontrez des problèmes de connexion (Quota 0, Erreur 429) malgré l'activation de la facturation, c'est que Google n'a pas encore validé votre accès aux APIs Business Profile.
                    </p>
                    <a 
                      href="https://developers.google.com/my-business/content/prereqs#request-access" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-medium underline"
                    >
                      Accéder au formulaire de demande d'accès (GBP API Form) &rarr;
                    </a>
                  </div>
                </section>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}