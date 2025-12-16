import React, { useState } from 'react';
import { Review, Tone, Location } from '../types';
import { StarRating } from './StarRating';
import { generateReviewResponse } from '../services/geminiService';

interface ReviewCardProps {
  review: Review;
  location: Location;
  onUpdateReview: (reviewId: string, response: string) => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, location, onUpdateReview }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [draftResponse, setDraftResponse] = useState(review.response || '');
  const [selectedTone, setSelectedTone] = useState<Tone>(Tone.PROFESSIONAL);
  const [isEditMode, setIsEditMode] = useState(!review.is_replied);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const generatedText = await generateReviewResponse(review, location.name, selectedTone);
      setDraftResponse(generatedText);
    } catch (err) {
      setError("Erreur lors de la génération. Veuillez réessayer.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    // In a real app, this would call Supabase 'reviews' table update
    onUpdateReview(review.id, draftResponse);
    setIsEditMode(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header: Author & Rating */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
            {review.author_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{review.author_name}</h3>
            <p className="text-xs text-gray-500">{review.date} • via {review.source}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
             <StarRating rating={review.rating} />
             <span className="text-xs text-gray-400 mt-1">{location.name}</span>
        </div>
      </div>

      {/* Review Content */}
      <p className="text-gray-700 mb-6 leading-relaxed">
        {review.text}
      </p>

      {/* Response Area */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        {isEditMode ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Réponse IA
              </h4>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value as Tone)}
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-1 pl-2 pr-8 bg-white"
                >
                  {Object.values(Tone).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Génération...
                    </>
                  ) : 'Générer'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
            )}

            <textarea
              value={draftResponse}
              onChange={(e) => setDraftResponse(e.target.value)}
              placeholder="Cliquez sur 'Générer' ou écrivez votre réponse ici..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm h-32 p-3"
            />

            <div className="flex justify-end gap-2">
                {review.is_replied && (
                    <button 
                    onClick={() => setIsEditMode(false)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                    Annuler
                    </button>
                )}
              <button
                onClick={handleSave}
                disabled={!draftResponse.trim()}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {review.is_replied ? 'Mettre à jour' : 'Publier la réponse'}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative group">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Votre réponse</h4>
            <p className="text-sm text-gray-800 whitespace-pre-line">{review.response}</p>
            <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setIsEditMode(true)}
                className="text-gray-400 hover:text-indigo-600 p-1"
                title="Modifier"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};