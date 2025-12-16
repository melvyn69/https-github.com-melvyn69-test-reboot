export enum ReviewSource {
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
  TRIPADVISOR = 'TRIPADVISOR'
}

export enum Tone {
  PROFESSIONAL = 'Professionnel',
  FRIENDLY = 'Amical',
  EMPATHETIC = 'Empathique',
  WITTY = 'Spirituel'
}

export interface Location {
  id: string;
  name: string;
  address: string;
  organization_id: string; // Matches your Supabase logic
}

export interface Review {
  id: string;
  location_id: string;
  author_name: string;
  rating: number;
  text: string;
  date: string;
  source: ReviewSource;
  response?: string;
  is_replied: boolean;
}

export interface Organization {
  id: string;
  name: string;
}

export interface Integration {
  id: string;
  platform: 'google_business' | 'facebook' | 'tripadvisor';
  name: string;
  icon: string;
  isConnected: boolean;
  connectedAs?: string; // Email de l'utilisateur connecté
  lastSync?: string;
}

export type ViewState = 'reviews' | 'locations' | 'settings';