// Google Places API (legacy) — arama + detay/yorum çekme.
// Not: Google, Place Details üzerinden en fazla 5 yorum döner (API kısıtı,
// bizim tarafımızdan değil) — tüm yorumları göstermek mümkün değil.

export type GooglePlaceCandidate = {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
};

export type GoogleReview = {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
  time: number;
};

export async function searchGooglePlaces(query: string): Promise<GooglePlaceCandidate[]> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY tanımlı değil");

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=tr&key=${key}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "OK" && json.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places arama hatası: ${json.status} ${json.error_message || ""}`);
  }
  return (json.results || []).slice(0, 5).map((r: any) => ({
    place_id: r.place_id,
    name: r.name,
    formatted_address: r.formatted_address,
    rating: r.rating,
    user_ratings_total: r.user_ratings_total,
  }));
}

export async function fetchGooglePlaceDetails(placeId: string): Promise<{
  rating: number | null;
  review_count: number | null;
  reviews: GoogleReview[];
}> {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error("GOOGLE_PLACES_API_KEY tanımlı değil");

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,reviews&language=tr&key=${key}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "OK") {
    throw new Error(`Google Places detay hatası: ${json.status} ${json.error_message || ""}`);
  }
  const r = json.result || {};
  const reviews: GoogleReview[] = (r.reviews || []).map((rev: any) => ({
    author_name: rev.author_name,
    rating: rev.rating,
    text: rev.text,
    relative_time_description: rev.relative_time_description,
    time: rev.time,
  }));
  return {
    rating: typeof r.rating === "number" ? r.rating : null,
    review_count: typeof r.user_ratings_total === "number" ? r.user_ratings_total : null,
    reviews,
  };
}
