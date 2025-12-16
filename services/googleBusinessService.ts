import { Location, Review, ReviewSource } from "../types";

const BASE_URL_ACCOUNTS = 'https://mybusinessaccountmanagement.googleapis.com/v1';
const BASE_URL_INFO = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const BASE_URL_REVIEWS = 'https://mybusiness.googleapis.com/v4'; 

// Helper pour gérer les réponses API
const handleResponse = async (response: Response, apiName: string) => {
  if (response.ok) return await response.json();

  let errorDetails = "";
  try {
    const json = await response.json();
    errorDetails = json.error?.message || JSON.stringify(json);
  } catch (e) {
    errorDetails = await response.text();
  }

  console.error(`❌ Erreur API ${apiName}:`, errorDetails);

  if (response.status === 429) {
    throw new Error(`API_NOT_ENABLED: ${apiName}`);
  }

  throw new Error(`Erreur ${apiName} (${response.status}): ${errorDetails}`);
};

export const fetchGoogleData = async (accessToken: string) => {
  console.log("🚀 Démarrage de la récupération des données Google (Mode Multi-Comptes)...");
  
  try {
    // 1. Récupérer TOUS les comptes (Accounts/Groupes)
    // C'est souvent ici que ça bloque si "My Business Account Management API" n'est pas activée
    const accountsResponse = await fetch(`${BASE_URL_ACCOUNTS}/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    
    const accountsData = await handleResponse(accountsResponse, "Account Management");
    console.log("✅ Comptes bruts récupérés:", accountsData);
    
    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      console.warn("Aucun compte Google Business trouvé.");
      return { locations: [], reviews: [] };
    }

    const locations: Location[] = [];
    let allReviews: Review[] = [];

    // 2. Pour CHAQUE compte, chercher les établissements
    for (const account of accountsData.accounts) {
        const accountName = account.name; // ex: "accounts/123456789"
        const accountId = accountName.split('/')[1];

        console.log(`🔎 Recherche d'établissements dans le compte : ${account.accountName} (${accountName})`);

        try {
            const locationsResponse = await fetch(`${BASE_URL_INFO}/${accountName}/locations?readMask=name,title,storeCode,latlng,languageCode,phoneNumbers,categories,storefrontAddress`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            // On gère l'erreur 429 ici aussi pour l'API "Business Information"
            if (!locationsResponse.ok && locationsResponse.status === 429) {
                 throw new Error("API_NOT_ENABLED: Business Information");
            }
            
            // Si vide ou autre erreur mineure, on ignore ce compte
            if (!locationsResponse.ok) {
                console.warn(`⚠️ Impossible de lire les lieux pour ${accountName}`);
                continue;
            }

            const locationsData = await locationsResponse.json();
            
            if (!locationsData.locations || locationsData.locations.length === 0) {
                console.log(`   -> Aucun établissement dans ce compte.`);
                continue;
            }

            console.log(`   -> ${locationsData.locations.length} établissement(s) trouvé(s) !`);

            // 3. Traiter les établissements
            for (const loc of locationsData.locations) {
                const locationId = loc.name.split('/')[1];
                
                const newLocation: Location = {
                    id: locationId,
                    name: loc.title,
                    address: loc.storefrontAddress 
                        ? `${loc.storefrontAddress.addressLines?.join(', ') || ''} ${loc.storefrontAddress.locality || ''}` 
                        : 'Adresse non définie',
                    organization_id: accountId
                };
                
                locations.push(newLocation);

                // 4. Récupérer les avis
                console.log(`   📥 Récupération avis pour ${loc.title}...`);
                
                try {
                    const reviewsUrl = `${BASE_URL_REVIEWS}/${accountName}/locations/${locationId}/reviews?pageSize=50`;
                    const reviewsResponse = await fetch(reviewsUrl, {
                        headers: { Authorization: `Bearer ${accessToken}` }
                    });

                    if (!reviewsResponse.ok && reviewsResponse.status === 429) {
                        console.warn("⚠️ API Reviews non activée (429)");
                        // On ne bloque pas tout, mais on signale
                    } else if (reviewsResponse.ok) {
                        const reviewsData = await reviewsResponse.json();
                        const reviewsCount = reviewsData.reviews?.length || 0;
                        console.log(`      ✅ ${reviewsCount} avis récupérés.`);

                        if (reviewsData.reviews) {
                            const mappedReviews = reviewsData.reviews.map((r: any) => ({
                                id: r.reviewId,
                                location_id: locationId,
                                author_name: r.reviewer.displayName,
                                rating: ["ONE", "TWO", "THREE", "FOUR", "FIVE"].indexOf(r.starRating) + 1,
                                text: r.comment || "(Pas de commentaire)",
                                date: r.createTime ? new Date(r.createTime).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'),
                                source: ReviewSource.GOOGLE,
                                is_replied: !!r.reviewReply,
                                response: r.reviewReply ? r.reviewReply.comment : undefined
                            }));
                            allReviews = [...allReviews, ...mappedReviews];
                        }
                    }
                } catch (reviewErr) {
                    console.error(`      ❌ Erreur fetch avis :`, reviewErr);
                }
            }

        } catch (locErr: any) {
            // Si c'est notre erreur API 429 critique, on la remonte
            if (locErr.message && locErr.message.includes("API_NOT_ENABLED")) {
                throw locErr;
            }
            console.error(`Erreur récupération lieux pour le compte ${accountName}`, locErr);
        }
    }

    return { locations, reviews: allReviews };

  } catch (error) {
    console.error("❌ Erreur Globale Google API:", error);
    throw error;
  }
};

export const replyToGoogleReview = async (
  accessToken: string,
  accountId: string,
  locationId: string,
  reviewId: string,
  replyText: string
) => {
  const url = `${BASE_URL_REVIEWS}/accounts/${accountId}/locations/${locationId}/reviews/${reviewId}/reply`;
  console.log("📤 Envoi réponse vers Google:", url);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ comment: replyText })
  });

  return await handleResponse(response, "Reply to Review");
};