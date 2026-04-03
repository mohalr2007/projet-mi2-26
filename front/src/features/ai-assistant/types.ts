export type UserLocation = {
  lat: number;
  lng: number;
};

export type DoctorRow = {
  id: string;
  full_name: string | null;
  specialty: string | null;
  address: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_accepting_appointments?: boolean | null;
};

export type RatingRow = {
  doctor_id: string;
  avg_rating: number;
  total_reviews: number;
};

export type RecommendedDoctor = DoctorRow & {
  rating: number;
  reviews: number;
  distanceKm: number | null;
};
