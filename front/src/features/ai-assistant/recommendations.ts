import { supabase } from "@/utils/supabase/client";
import { logAuditEvent, logPerformanceEvent } from "@/utils/telemetry";
import { computeDistanceKm } from "./distance";
import type { DoctorRow, RatingRow, RecommendedDoctor, UserLocation } from "./types";

type FetchRecommendationsInput = {
  symptoms: string;
  targetSpecialty: string;
  location: UserLocation | null;
};

type FetchRecommendationsOutput = {
  recommendations: RecommendedDoctor[];
  actorId: string | null;
};

export async function fetchRecommendedDoctors(
  input: FetchRecommendationsInput
): Promise<FetchRecommendationsOutput> {
  const startedAt = performance.now();
  const { data: authData } = await supabase.auth.getUser();
  const actorId = authData.user?.id ?? null;
  const { targetSpecialty, location, symptoms } = input;

  let doctors: DoctorRow[] = [];

  if (location) {
    const { data, error: rpcError } = await supabase.rpc("get_nearby_doctors", {
      user_lat: location.lat,
      user_lon: location.lng,
      radius_km: 35,
    });

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    doctors = ((data ?? []) as DoctorRow[]).filter((doctor) =>
      (doctor.specialty ?? "").toLowerCase().includes(targetSpecialty.toLowerCase())
    );
  } else {
    const { data, error: doctorsError } = await supabase
      .from("profiles")
      .select("id, full_name, specialty, address, avatar_url, latitude, longitude, is_accepting_appointments")
      .eq("account_type", "doctor")
      .ilike("specialty", `%${targetSpecialty}%`)
      .limit(20);

    if (doctorsError) {
      throw new Error(doctorsError.message);
    }

    doctors = (data ?? []) as DoctorRow[];
  }

  if (doctors.length === 0) {
    const { data, error: fallbackError } = await supabase
      .from("profiles")
      .select("id, full_name, specialty, address, avatar_url, latitude, longitude, is_accepting_appointments")
      .eq("account_type", "doctor")
      .limit(20);

    if (fallbackError) {
      throw new Error(fallbackError.message);
    }

    doctors = (data ?? []) as DoctorRow[];
  }

  const doctorIds = doctors.map((doctor) => doctor.id);
  const ratingsByDoctorId: Record<string, RatingRow> = {};

  if (doctorIds.length > 0) {
    const { data: ratingsData } = await supabase
      .from("doctor_ratings")
      .select("doctor_id, avg_rating, total_reviews")
      .in("doctor_id", doctorIds);

    (ratingsData ?? []).forEach((row) => {
      ratingsByDoctorId[row.doctor_id] = {
        doctor_id: row.doctor_id,
        avg_rating: Number(row.avg_rating ?? 0),
        total_reviews: Number(row.total_reviews ?? 0),
      };
    });
  }

  const recommendations = doctors
    .map((doctor) => {
      const ratingEntry = ratingsByDoctorId[doctor.id];
      return {
        ...doctor,
        rating: ratingEntry?.avg_rating ?? 0,
        reviews: ratingEntry?.total_reviews ?? 0,
        distanceKm: computeDistanceKm(location, doctor),
      };
    })
    .sort((left, right) => {
      if ((left.specialty ?? "") === targetSpecialty && (right.specialty ?? "") !== targetSpecialty) {
        return -1;
      }
      if ((right.specialty ?? "") === targetSpecialty && (left.specialty ?? "") !== targetSpecialty) {
        return 1;
      }
      if (right.rating !== left.rating) {
        return right.rating - left.rating;
      }
      if (left.distanceKm != null && right.distanceKm != null) {
        return left.distanceKm - right.distanceKm;
      }
      return 0;
    })
    .slice(0, 8);

  await logAuditEvent({
    actorId,
    action: "ai_recommendation_requested",
    entityType: "ai_assistant",
    metadata: {
      specialty: targetSpecialty,
      symptoms_length: symptoms.trim().length,
      location_enabled: Boolean(location),
    },
  });

  await logPerformanceEvent({
    actorId,
    pageKey: "ai_assistant",
    metricName: "recommendation_latency",
    metricMs: performance.now() - startedAt,
    context: {
      location_enabled: Boolean(location),
      result_count: recommendations.length,
    },
  });

  return {
    recommendations,
    actorId,
  };
}
