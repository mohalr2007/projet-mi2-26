'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, MapPin, Search, Sparkles, Star } from "lucide-react";
import { AI_DEFAULT_SPECIALTY, detectSpecialties, getAiSpecialtyOptions } from "./specialty";
import { fetchRecommendedDoctors } from "./recommendations";
import type { RecommendedDoctor, UserLocation } from "./types";

export default function AiAssistantView() {
  const [symptoms, setSymptoms] = useState("");
  const [manualSpecialty, setManualSpecialty] = useState("");
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState("Non activée");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedDoctor[]>([]);
  const [resolvedSpecialty, setResolvedSpecialty] = useState<string | null>(null);

  const detectedSpecialties = useMemo(() => detectSpecialties(symptoms), [symptoms]);
  const suggestedSpecialty = manualSpecialty || detectedSpecialties[0] || AI_DEFAULT_SPECIALTY;
  const specialtyOptions = useMemo(() => getAiSpecialtyOptions(), []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Géolocalisation non supportée");
      return;
    }

    setLocationStatus("Détection en cours...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("Position détectée");
      },
      () => {
        setLocationStatus("Position refusée ou indisponible");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim()) {
      setError("Décrivez vos symptômes pour lancer la recommandation.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { recommendations: recommendedDoctors } = await fetchRecommendedDoctors({
        symptoms,
        targetSpecialty: suggestedSpecialty,
        location,
      });
      setRecommendations(recommendedDoctors);
      setResolvedSpecialty(suggestedSpecialty);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Erreur inconnue";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="text-blue-500" size={24} />
            AI Assistant Santé
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Décrivez vos symptômes, nous suggérons une spécialité et des médecins proches.
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/70 dark:bg-amber-950/30 px-4 py-3 text-amber-800 dark:text-amber-300 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>
              Disclaimer: l&apos;assistant fournit une recommandation d&apos;orientation uniquement. Ce n&apos;est pas un diagnostic médical.
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Symptômes</label>
              <textarea
                value={symptoms}
                onChange={(event) => setSymptoms(event.target.value)}
                placeholder="Ex: douleur thoracique légère, essoufflement à l'effort..."
                className="w-full min-h-32 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
              {detectedSpecialties.length > 0 ? (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  Spécialités détectées: {detectedSpecialties.slice(0, 3).join(", ")}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Spécialité (optionnel)</label>
              <select
                value={manualSpecialty}
                onChange={(event) => setManualSpecialty(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-slate-800 dark:text-slate-100"
              >
                <option value="">Auto (déduite des symptômes)</option>
                {specialtyOptions.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Localisation</label>
              <button
                onClick={requestLocation}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <MapPin size={15} />
                Détecter ma position
              </button>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{locationStatus}</p>
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white px-4 py-2.5 text-sm font-semibold transition"
            >
              <Search size={15} />
              {loading ? "Analyse en cours..." : "Analyser et recommander"}
            </button>
            <Link
              href="/dashboardpatientlarabi?tab=search"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Ouvrir la recherche patient
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            Recommandations {resolvedSpecialty ? `· ${resolvedSpecialty}` : ""}
          </h2>
          {recommendations.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Lancez une analyse pour afficher des médecins recommandés.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {recommendations.map((doctor) => {
                const filledStars = Math.round(doctor.rating);
                return (
                  <div key={doctor.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      Dr. {doctor.full_name ?? "Médecin"}
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">{doctor.specialty ?? "Médecin généraliste"}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{doctor.address ?? "Adresse non renseignée"}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-yellow-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star key={`${doctor.id}-${index}`} size={12} className={index < filledStars ? "fill-current" : "text-slate-300 dark:text-slate-700"} />
                        ))}
                        <span className="ml-1 text-xs text-slate-600 dark:text-slate-300">
                          {doctor.reviews > 0 ? `${doctor.rating.toFixed(1)} (${doctor.reviews})` : "Nouveau"}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {doctor.distanceKm != null ? `${doctor.distanceKm.toFixed(1)} km` : "Distance N/A"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
