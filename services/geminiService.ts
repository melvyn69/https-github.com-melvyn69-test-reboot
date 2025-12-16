import { GoogleGenAI } from "@google/genai";
import { Review, Tone } from "../types";

// Initialisation de Gemini avec la clé fournie
// Dans un environnement de prod, cette clé devrait être sécurisée côté serveur (Supabase Edge Function)
const apiKey = process.env.API_KEY || 'AIzaSyB7fDa6Ua7ZBx6A9-w1dkr8axMSeZg_sfk';
const ai = new GoogleGenAI({ apiKey });

export const generateReviewResponse = async (
  review: Review,
  businessName: string,
  tone: Tone
): Promise<string> => {
  try {
    const model = 'gemini-2.5-flash';
    
    const prompt = `
      Tu es un expert en relation client pour l'établissement "${businessName}".
      
      Rédige une réponse pour l'avis client suivant.
      
      Détails de l'avis :
      - Client : ${review.author_name}
      - Note : ${review.rating}/5
      - Commentaire : "${review.text}"
      
      Consignes pour la réponse :
      - Ton : ${tone}
      - Langue : Français
      - Sois concis, poli et personnalisé.
      - Si l'avis est négatif, sois empathique et propose une solution ou invite à contacter le support.
      - Si l'avis est positif, remercie chaleureusement.
      - Ne signe pas avec des placeholders comme "[Votre Nom]", signe simplement "L'équipe ${businessName}".
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "Impossible de générer une réponse pour le moment.";
  } catch (error) {
    console.error("Erreur lors de la génération de la réponse Gemini:", error);
    throw new Error("Erreur de l'IA. Vérifiez votre clé API.");
  }
};