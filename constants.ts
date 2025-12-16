import { Location, Review, ReviewSource } from "./types";

export const MOCK_LOCATIONS: Location[] = [
  {
    id: 'loc_1',
    name: 'Le Petit Bistrot Paris',
    address: '12 Rue de Rivoli, 75001 Paris',
    organization_id: 'org_1'
  },
  {
    id: 'loc_2',
    name: 'Reviewflow HQ',
    address: 'Station F, 75013 Paris',
    organization_id: 'org_1'
  }
];

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rev_1',
    location_id: 'loc_1',
    author_name: 'Jean Dupont',
    rating: 5,
    text: "Excellent repas ! Le service était impeccable et les plats délicieux. Je recommande vivement le bœuf bourguignon.",
    date: '2023-10-25',
    source: ReviewSource.GOOGLE,
    is_replied: false
  },
  {
    id: 'rev_2',
    location_id: 'loc_1',
    author_name: 'Marie Curie',
    rating: 2,
    text: "Assez déçu. Nous avons attendu 45 minutes pour être servis et c'était froid.",
    date: '2023-10-24',
    source: ReviewSource.GOOGLE,
    is_replied: false
  },
  {
    id: 'rev_3',
    location_id: 'loc_2',
    author_name: 'Startup Lover',
    rating: 5,
    text: "Super outil pour gérer nos avis. L'interface est claire et rapide.",
    date: '2023-10-23',
    source: ReviewSource.GOOGLE,
    is_replied: true,
    response: "Merci beaucoup ! Nous sommes ravis que Reviewflow vous aide au quotidien. L'équipe Reviewflow."
  },
  {
    id: 'rev_4',
    location_id: 'loc_1',
    author_name: 'Pierre Martin',
    rating: 4,
    text: "Très bon, mais un peu bruyant le samedi soir.",
    date: '2023-10-20',
    source: ReviewSource.GOOGLE,
    is_replied: false
  }
];