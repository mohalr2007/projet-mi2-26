// made by larabi
'use client';
import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../utils/supabase/client";
import { logAuditEvent, logPerformanceEvent } from "../../utils/telemetry";
import { Logo } from "../../components/Logo";
import { 
  Calendar, Search, FileText, Star, MapIcon, MapPin, 
  LogOut, Clock, CheckCircle, ChevronRight, Activity, Settings, Crosshair, RefreshCw, Upload, Heart, Bookmark, MessageCircle, Send, Flag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('../../components/MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500 font-medium rounded-3xl">Chargement de la carte (OpenStreetMap gratuit)...</div>
});

type BookingSelectionMode = "patient_datetime" | "patient_date_only" | "doctor_datetime";

type PatientProfile = {
  id: string;
  full_name: string | null;
  latitude: number | null;
  longitude: number | null;
  avatar_url: string | null;
  email?: string | null;
};

type DoctorSummary = {
  id: string;
  full_name: string | null;
  specialty: string | null;
  address: string | null;
  avatar_url: string | null;
  gender: string | null;
  latitude: number | null;
  longitude: number | null;
  is_accepting_appointments: boolean | null;
  appointment_duration_minutes: number | null;
  max_appointments_per_day: number | null;
  vacation_start: string | null;
  vacation_end: string | null;
  is_on_vacation: boolean | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  appointment_booking_mode: BookingSelectionMode | null;
};

type PatientAppointment = {
  id: string;
  appointment_date: string;
  status: string;
  doctor_id: string;
  booking_selection_mode: BookingSelectionMode | null;
  requested_date: string | null;
  requested_time: string | null;
  doctor: {
    full_name: string | null;
    specialty: string | null;
    address: string | null;
  } | null;
};

type CommunityComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
};

type PublicationImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

type PatientArticle = {
  id: string;
  doctor_id: string;
  category: "conseil" | "maladie";
  title: string;
  content: string;
  created_at: string;
  likes_count: number;
  saves_count: number;
  comments_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  images: PublicationImage[];
  comments: CommunityComment[];
  author: {
    full_name: string | null;
    specialty: string | null;
    avatar_url?: string | null;
  } | null;
};

type DoctorRatingRow = {
  doctor_id: string;
  avg_rating: number;
  total_reviews: number;
};

type ReviewEntry = {
  id: string;
  appointment_id: string;
  doctor_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

type DoctorReviewDetail = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name: string | null;
};

function normalizeDoctorRelation(
  doctor: PatientAppointment["doctor"] | PatientAppointment["doctor"][] | null | undefined
): PatientAppointment["doctor"] {
  if (Array.isArray(doctor)) {
    return doctor[0] ?? null;
  }
  return doctor ?? null;
}

function isDoctorOnVacation(doctor: DoctorSummary | null, date = new Date()) {
  if (!doctor) {
    return false;
  }

  if (doctor.is_on_vacation) {
    return true;
  }

  if (!doctor.vacation_start || !doctor.vacation_end) {
    return false;
  }

  const start = new Date(doctor.vacation_start);
  const end = new Date(doctor.vacation_end);
  end.setHours(23, 59, 59, 999);

  return date >= start && date <= end;
}

function getVacationLabel(doctor: DoctorSummary | null) {
  if (doctor?.vacation_end) {
    return `Ce docteur est en congé jusqu'au ${new Date(doctor.vacation_end).toLocaleDateString('fr-FR')}.`;
  }

  return "Ce docteur est actuellement en congé.";
}

function computeDistanceKm(
  from: { lat: number; lng: number } | null,
  doctor: DoctorSummary | null
): number | null {
  if (!from || doctor?.latitude == null || doctor?.longitude == null) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(doctor.latitude - from.lat);
  const dLon = toRadians(doctor.longitude - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(doctor.latitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function normalizeTimeValue(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) {
    return fallback;
  }

  return `${match[1]}:${match[2]}`;
}

function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLocalDateTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

type NoticeType = "success" | "error" | "info";

export default function PatientDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get("embed") === "1";

  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    const normalizedTab = tab === "articles" ? "community" : tab;
    const allowedTabs = new Set(["overview", "search", "appointments", "community", "settings"]);
    return normalizedTab && allowedTabs.has(normalizedTab) ? normalizedTab : "overview";
  });

  // Data
  const [doctors, setDoctors] = useState<DoctorSummary[]>([]);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [articles, setArticles] = useState<PatientArticle[]>([]);
  const [doctorRatings, setDoctorRatings] = useState<Record<string, DoctorRatingRow>>({});
  const [reviewsByAppointmentId, setReviewsByAppointmentId] = useState<Record<string, ReviewEntry>>({});
  const [doctorReviewsByDoctorId, setDoctorReviewsByDoctorId] = useState<Record<string, DoctorReviewDetail[]>>({});
  
  // Search & Filter & Geoloc
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [minimumRating, setMinimumRating] = useState(0);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const searchRadius = 25;

  // Booking Modal
  const [selectedDoctorToBook, setSelectedDoctorToBook] = useState<DoctorSummary | null>(null);
  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState<DoctorSummary | null>(null);
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [isLoadingDoctorDetails, setIsLoadingDoctorDetails] = useState(false);
  const [appointmentToReview, setAppointmentToReview] = useState<PatientAppointment | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [settingsFullName, setSettingsFullName] = useState("");
  const [settingsAvatarUrl, setSettingsAvatarUrl] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [commentDraftsByPostId, setCommentDraftsByPostId] = useState<Record<string, string>>({});
  const [commentSubmittingPostId, setCommentSubmittingPostId] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [notice, setNotice] = useState<{ type: NoticeType; message: string } | null>(null);
  const [isAutoSavingAccount, setIsAutoSavingAccount] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState("Contenu inapproprié");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const hasHydratedSettingsRef = useRef(false);
  const accountSettingsSnapshotRef = useRef("");
  const noticeTimerRef = useRef<number | null>(null);
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const normalizedTab = tab === "articles" ? "community" : tab;
    const allowedTabs = new Set(["overview", "search", "appointments", "community", "settings"]);
    if (normalizedTab && allowedTabs.has(normalizedTab)) {
      setActiveTab(normalizedTab);
    }
  }, [searchParams]);

  const showNotice = (message: string, type: NoticeType = "info") => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }

    setNotice({ message, type });
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      noticeTimerRef.current = null;
    }, 4200);
  };

  const queueRealtimeRefresh = () => {
    if (realtimeRefreshTimerRef.current) {
      return;
    }
    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      setRefreshCounter((current) => current + 1);
      realtimeRefreshTimerRef.current = null;
    }, 450);
  };

  const inferNoticeType = (text: string): NoticeType => {
    const lower = text.toLowerCase();
    if (
      lower.includes("erreur") ||
      lower.includes("impossible") ||
      lower.includes("invalid") ||
      lower.includes("refus")
    ) {
      return "error";
    }
    if (
      lower.includes("succès") ||
      lower.includes("merci") ||
      lower.includes("mis à jour") ||
      lower.includes("envoy")
    ) {
      return "success";
    }
    return "info";
  };

  const alert = (message: unknown) => {
    const text = String(message ?? "Une erreur est survenue.");
    showNotice(text, inferNoticeType(text));
  };

  const computeAccountSettingsSnapshot = (name: string, avatar: string) =>
    JSON.stringify({
      full_name: name.trim() || null,
      avatar_url: avatar.trim() || null,
    });

  const fetchDoctorRatings = async (doctorIds: string[]) => {
    if (doctorIds.length === 0) {
      return {};
    }

    const { data, error } = await supabase
      .from("doctor_ratings")
      .select("doctor_id, avg_rating, total_reviews")
      .in("doctor_id", doctorIds);

    if (error || !data) {
      return {};
    }

    return data.reduce<Record<string, DoctorRatingRow>>((accumulator, row) => {
      accumulator[row.doctor_id] = {
        doctor_id: row.doctor_id,
        avg_rating: Number(row.avg_rating ?? 0),
        total_reviews: Number(row.total_reviews ?? 0),
      };
      return accumulator;
    }, {});
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const startedAt = performance.now();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data: userProfile } = await supabase
        .from("profiles")
        .select("id, full_name, latitude, longitude, avatar_url")
        .eq("id", user.id)
        .single();

      if (!isMounted) {
        return;
      }

      setProfile({
        id: user.id,
        full_name: userProfile?.full_name ?? null,
        latitude: userProfile?.latitude ?? null,
        longitude: userProfile?.longitude ?? null,
        avatar_url: userProfile?.avatar_url ?? null,
        email: user.email 
      });
      if (!hasHydratedSettingsRef.current) {
        setSettingsFullName(userProfile?.full_name ?? "");
        setSettingsAvatarUrl(userProfile?.avatar_url ?? "");
        accountSettingsSnapshotRef.current = computeAccountSettingsSnapshot(
          userProfile?.full_name ?? "",
          userProfile?.avatar_url ?? ""
        );
        hasHydratedSettingsRef.current = true;
      }

      // S'il avait deja une geoloc
      const initialLat = userProfile?.latitude;
      const initialLng = userProfile?.longitude;

      if (typeof initialLat === "number" && typeof initialLng === "number") {
        setUserLocation({ lat: initialLat, lng: initialLng });
      }

      const [docs, appts, posts, reviews] = await Promise.all([
        fetchDoctors(initialLat, initialLng, searchRadius),
        supabase
          .from("appointments")
          .select("id, appointment_date, status, doctor_id, booking_selection_mode, requested_date, requested_time, doctor:profiles!doctor_id(full_name, specialty, address)")
          .eq("patient_id", user.id)
          .order("appointment_date", { ascending: true })
          .then(({ data }) => data ?? []),
        supabase
          .from("community_posts")
          .select("id, doctor_id, category, title, content, created_at, author:profiles!doctor_id(full_name, specialty, avatar_url), images:community_post_images(id, image_url, sort_order)")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .then(({ data }) => data ?? []),
        supabase
          .from("reviews")
          .select("id, appointment_id, doctor_id, rating, comment, created_at")
          .eq("patient_id", user.id)
          .then(({ data }) => data ?? []),
      ]);

      if (!isMounted) {
        return;
      }

      const normalizedAppointments: PatientAppointment[] = appts.map((appointment) => ({
        id: appointment.id,
        appointment_date: appointment.appointment_date,
        status: appointment.status,
        doctor_id: appointment.doctor_id,
        booking_selection_mode: (appointment.booking_selection_mode ?? "patient_datetime") as BookingSelectionMode,
        requested_date: appointment.requested_date ?? null,
        requested_time: appointment.requested_time ?? null,
        doctor: normalizeDoctorRelation(appointment.doctor),
      }));

      const postIds = posts.map((post) => post.id);
      const [likesRows, savesRows, commentsRows] = postIds.length
        ? await Promise.all([
            supabase
              .from("community_post_likes")
              .select("post_id, user_id")
              .in("post_id", postIds)
              .then(({ data }) => data ?? []),
            supabase
              .from("community_post_saves")
              .select("post_id, user_id")
              .in("post_id", postIds)
              .then(({ data }) => data ?? []),
            supabase
              .from("community_post_comments")
              .select("id, post_id, user_id, content, created_at, user:profiles!user_id(full_name, avatar_url)")
              .in("post_id", postIds)
              .eq("is_hidden", false)
              .order("created_at", { ascending: true })
              .then(({ data }) => data ?? []),
          ])
        : [[], [], []];

      const likesByPost = likesRows.reduce<Record<string, { count: number; likedByMe: boolean }>>((accumulator, like) => {
        if (!accumulator[like.post_id]) {
          accumulator[like.post_id] = { count: 0, likedByMe: false };
        }
        accumulator[like.post_id].count += 1;
        if (like.user_id === user.id) {
          accumulator[like.post_id].likedByMe = true;
        }
        return accumulator;
      }, {});

      const savesByPost = savesRows.reduce<Record<string, { count: number; savedByMe: boolean }>>((accumulator, save) => {
        if (!accumulator[save.post_id]) {
          accumulator[save.post_id] = { count: 0, savedByMe: false };
        }
        accumulator[save.post_id].count += 1;
        if (save.user_id === user.id) {
          accumulator[save.post_id].savedByMe = true;
        }
        return accumulator;
      }, {});

      const commentsByPost = commentsRows.reduce<Record<string, CommunityComment[]>>((accumulator, comment) => {
        if (!accumulator[comment.post_id]) {
          accumulator[comment.post_id] = [];
        }

        const commentAuthor = Array.isArray(comment.user) ? comment.user[0] : comment.user;
        accumulator[comment.post_id].push({
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          content: comment.content,
          created_at: comment.created_at,
          author_name: commentAuthor?.full_name ?? "Utilisateur",
          author_avatar: commentAuthor?.avatar_url ?? null,
        });
        return accumulator;
      }, {});

      const normalizedArticles: PatientArticle[] = posts.map((post) => {
        const likesEntry = likesByPost[post.id] ?? { count: 0, likedByMe: false };
        const savesEntry = savesByPost[post.id] ?? { count: 0, savedByMe: false };
        const postComments = commentsByPost[post.id] ?? [];
        return {
          id: post.id,
          doctor_id: post.doctor_id,
          category: (post.category ?? "conseil") as "conseil" | "maladie",
          title: post.title,
          content: post.content,
          created_at: post.created_at,
          likes_count: likesEntry.count,
          saves_count: savesEntry.count,
          comments_count: postComments.length,
          liked_by_me: likesEntry.likedByMe,
          saved_by_me: savesEntry.savedByMe,
          images: (Array.isArray(post.images) ? post.images : [])
            .map((image) => ({
              id: image.id,
              image_url: image.image_url,
              sort_order: image.sort_order ?? 0,
            }))
            .sort((a, b) => a.sort_order - b.sort_order),
          comments: postComments,
          author: Array.isArray(post.author) ? (post.author[0] ?? null) : (post.author ?? null),
        };
      });

      const reviewsMap = reviews.reduce<Record<string, ReviewEntry>>((accumulator, review) => {
        if (review.appointment_id) {
          accumulator[review.appointment_id] = {
            id: review.id,
            appointment_id: review.appointment_id,
            doctor_id: review.doctor_id,
            rating: review.rating,
            comment: review.comment ?? null,
            created_at: review.created_at,
          };
        }
        return accumulator;
      }, {});

      const ratingsMap = await fetchDoctorRatings(docs.map((doctor) => doctor.id));

      setDoctors(docs);
      setAppointments(normalizedAppointments);
      setArticles(normalizedArticles);
      setReviewsByAppointmentId(reviewsMap);
      setDoctorRatings(ratingsMap);

      await logPerformanceEvent({
        actorId: user.id,
        pageKey: "dashboard_patient",
        metricName: "initial_data_load",
        metricMs: performance.now() - startedAt,
        context: {
          doctors_count: docs.length,
          appointments_count: normalizedAppointments.length,
          posts_count: normalizedArticles.length,
        },
      });

      setLoading(false);
    }
    void loadData();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchRadius, refreshCounter]);

  const fetchDoctors = async (lat?: number, lng?: number, radius?: number): Promise<DoctorSummary[]> => {
    const startedAt = performance.now();
    if (typeof lat === "number" && typeof lng === "number" && typeof radius === "number") {
       const { data: docs } = await supabase.rpc('get_nearby_doctors', {
         user_lat: lat,
         user_lon: lng,
         radius_km: radius
       });
       const mappedDocs = ((docs as DoctorSummary[] | null) ?? []).map((doctor) => ({
         ...doctor,
         working_hours_start: normalizeTimeValue(doctor.working_hours_start, "08:00"),
         working_hours_end: normalizeTimeValue(doctor.working_hours_end, "17:00"),
       }));
       await logPerformanceEvent({
         actorId: profile?.id ?? null,
         pageKey: "dashboard_patient",
         metricName: "search_map_result_latency",
         metricMs: performance.now() - startedAt,
         context: { geolocated: true, radius_km: radius, result_count: mappedDocs.length },
       });
       return mappedDocs;
    }

    const { data: docs } = await supabase
      .from("profiles")
      .select("id, full_name, specialty, address, avatar_url, gender, latitude, longitude, is_accepting_appointments, appointment_duration_minutes, max_appointments_per_day, vacation_start, vacation_end, is_on_vacation, working_hours_start, working_hours_end, appointment_booking_mode")
      .eq("account_type", "doctor");
    const mappedDocs = ((docs as DoctorSummary[] | null) ?? []).map((doctor) => ({
      ...doctor,
      working_hours_start: normalizeTimeValue(doctor.working_hours_start, "08:00"),
      working_hours_end: normalizeTimeValue(doctor.working_hours_end, "17:00"),
    }));
    await logPerformanceEvent({
      actorId: profile?.id ?? null,
      pageKey: "dashboard_patient",
      metricName: "search_map_result_latency",
      metricMs: performance.now() - startedAt,
      context: { geolocated: false, result_count: mappedDocs.length },
    });
    return mappedDocs;
  };

  const handleGeolocate = () => {
    if (navigator.geolocation) {
       navigator.geolocation.getCurrentPosition(async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });
          setProfile((current) => current ? { ...current, latitude: lat, longitude: lng } : current);
          
          // Maj base de donnees 
          if (profile) {
              await supabase.from('profiles').update({ latitude: lat, longitude: lng }).eq('id', profile.id);
          }
          
          // Recharger les medecins proches
          const docs = await fetchDoctors(lat, lng, searchRadius);
          const ratingsMap = await fetchDoctorRatings(docs.map((doctor) => doctor.id));
          setDoctors(docs);
          setDoctorRatings(ratingsMap);
          alert("Position mise à jour ! Liste des médecins réactualisée.");
       }, () => {
          alert("Erreur de localisation. Activez le GPS et autorisez le navigateur.");
       });
    } else {
      alert("Géolocalisation non supportée par votre navigateur.");
    }
  };

  const handleSignOut = async () => {
    if (profile?.id) {
      await logAuditEvent({
        actorId: profile.id,
        action: "user_signed_out",
        entityType: "auth",
      });
    }
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleManualRefresh = () => {
    setRefreshCounter((current) => current + 1);
  };

  useEffect(() => {
    if (activeTab === "settings") {
      return;
    }

    const intervalMs = activeTab === "appointments" ? 15000 : activeTab === "search" ? 20000 : 30000;
    const timerId = setInterval(() => {
      setRefreshCounter((current) => current + 1);
    }, intervalMs);
    return () => clearInterval(timerId);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!profile?.id) {
      return;
    }

    const appointmentsChannel = supabase
      .channel(`patient-appointments-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `patient_id=eq.${profile.id}`,
        },
        () => {
          queueRealtimeRefresh();
        }
      )
      .subscribe();

    const globalRefreshChannel = supabase
      .channel(`patient-global-refresh-${profile.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, queueRealtimeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, queueRealtimeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_posts" }, queueRealtimeRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_post_comments" }, queueRealtimeRefresh)
      .subscribe();

    return () => {
      void supabase.removeChannel(appointmentsChannel);
      void supabase.removeChannel(globalRefreshChannel);
    };
  }, [profile?.id]);

  const openDoctorDetails = async (doctor: DoctorSummary) => {
    setSelectedDoctorDetails(doctor);

    setIsLoadingDoctorDetails(true);
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, patient:profiles!patient_id(full_name)")
        .eq("doctor_id", doctor.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const normalizedReviews: DoctorReviewDetail[] = (data ?? []).map((review) => {
        const patientProfile = Array.isArray(review.patient) ? review.patient[0] : review.patient;
        return {
          id: review.id,
          rating: review.rating,
          comment: review.comment ?? null,
          created_at: review.created_at,
          patient_name: patientProfile?.full_name ?? "Patient",
        };
      });

      setDoctorReviewsByDoctorId((current) => ({
        ...current,
        [doctor.id]: normalizedReviews,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de charger les avis.";
      alert("Erreur: " + message);
    } finally {
      setIsLoadingDoctorDetails(false);
    }
  };

  const closeDoctorDetails = () => {
    setSelectedDoctorDetails(null);
  };

  const bookFromDetails = (doctor: DoctorSummary) => {
    setSelectedDoctorDetails(null);
    openBookingModal(doctor);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!profile) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Veuillez choisir un fichier image (JPG, PNG, WebP...).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("La taille maximale autorisée est de 5 MB.");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${profile.id}/${Date.now()}-${safeFilename}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-avatars")
        .upload(filePath, file, {
          upsert: true,
          cacheControl: "3600",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profile-avatars")
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error("Impossible de récupérer l'URL publique de l'image.");
      }

      setSettingsAvatarUrl(publicUrlData.publicUrl);
      showNotice("Photo téléversée avec succès.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Échec du téléversement de la photo.";
      alert("Erreur: " + message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const persistAccountSettings = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!profile) {
      return false;
    }

    const payload = {
      full_name: settingsFullName.trim() || null,
      avatar_url: settingsAvatarUrl.trim() || null,
    };
    const snapshot = computeAccountSettingsSnapshot(settingsFullName, settingsAvatarUrl);
    if (snapshot === accountSettingsSnapshotRef.current) {
      setIsAutoSavingAccount(false);
      return true;
    }

    setIsSavingAccount(true);
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id);
    setIsSavingAccount(false);
    setIsAutoSavingAccount(false);

    if (error) {
      showNotice("Erreur: " + error.message, "error");
      return false;
    }

    accountSettingsSnapshotRef.current = snapshot;
    setProfile((current) =>
      current
        ? {
            ...current,
            ...payload,
          }
        : current
    );

    if (!silent) {
      await logAuditEvent({
        actorId: profile.id,
        action: "profile_updated",
        entityType: "profile",
        entityId: profile.id,
        metadata: { context: "patient_settings" },
      });
      showNotice("Profil mis à jour.", "success");
    }

    return true;
  };

  const handleSaveAccountSettings = async () => {
    await persistAccountSettings();
  };

  useEffect(() => {
    if (!profile?.id || !hasHydratedSettingsRef.current || activeTab !== "settings") {
      return;
    }

    const snapshot = computeAccountSettingsSnapshot(settingsFullName, settingsAvatarUrl);
    if (snapshot === accountSettingsSnapshotRef.current) {
      return;
    }

    setIsAutoSavingAccount(true);
    const timerId = window.setTimeout(() => {
      void persistAccountSettings({ silent: true });
    }, 700);

    return () => {
      window.clearTimeout(timerId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, activeTab, settingsFullName, settingsAvatarUrl]);

  const toggleLikePost = async (postId: string) => {
    if (!profile) {
      return;
    }

    const targetPost = articles.find((post) => post.id === postId);
    if (!targetPost) {
      return;
    }

    if (targetPost.liked_by_me) {
      const { error } = await supabase
        .from("community_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", profile.id);
      if (error) {
        alert("Erreur: " + error.message);
        return;
      }

      setArticles((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, liked_by_me: false, likes_count: Math.max(0, post.likes_count - 1) }
            : post
        )
      );
      return;
    }

    const { error } = await supabase.from("community_post_likes").insert({
      post_id: postId,
      user_id: profile.id,
    });

    if (error) {
      alert("Erreur: " + error.message);
      return;
    }

    setArticles((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, liked_by_me: true, likes_count: post.likes_count + 1 }
          : post
      )
    );

    await logAuditEvent({
      actorId: profile.id,
      action: "community_post_liked",
      entityType: "community_post_like",
      entityId: postId,
      metadata: { post_id: postId },
    });
  };

  const toggleSavePost = async (postId: string) => {
    if (!profile) {
      return;
    }

    const targetPost = articles.find((post) => post.id === postId);
    if (!targetPost) {
      return;
    }

    if (targetPost.saved_by_me) {
      const { error } = await supabase
        .from("community_post_saves")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", profile.id);
      if (error) {
        alert("Erreur: " + error.message);
        return;
      }

      setArticles((current) =>
        current.map((post) =>
          post.id === postId
            ? { ...post, saved_by_me: false, saves_count: Math.max(0, post.saves_count - 1) }
            : post
        )
      );
      return;
    }

    const { error } = await supabase.from("community_post_saves").insert({
      post_id: postId,
      user_id: profile.id,
    });

    if (error) {
      alert("Erreur: " + error.message);
      return;
    }

    setArticles((current) =>
      current.map((post) =>
        post.id === postId
          ? { ...post, saved_by_me: true, saves_count: post.saves_count + 1 }
          : post
      )
    );
  };

  const reportPost = async (postId: string) => {
    setReportTarget({ type: "post", id: postId });
    setReportReason("Contenu inapproprié");
  };

  const reportComment = async (commentId: string) => {
    setReportTarget({ type: "comment", id: commentId });
    setReportReason("Commentaire inapproprié");
  };

  const closeReportModal = () => {
    if (isSubmittingReport) {
      return;
    }
    setReportTarget(null);
    setReportReason("Contenu inapproprié");
  };

  const submitReport = async () => {
    if (!profile || !reportTarget) {
      return;
    }

    const reason = reportReason.trim();
    if (!reason) {
      showNotice("Merci de préciser la raison du signalement.", "error");
      return;
    }

    setIsSubmittingReport(true);
    try {
      if (reportTarget.type === "post") {
        const { error } = await supabase.from("community_post_reports").insert({
          post_id: reportTarget.id,
          reporter_id: profile.id,
          reason,
        });
        if (error) {
          throw error;
        }

        await logAuditEvent({
          actorId: profile.id,
          action: "community_post_reported",
          entityType: "community_post_report",
          metadata: { post_id: reportTarget.id },
        });
      } else {
        const { error } = await supabase.from("community_comment_reports").insert({
          comment_id: reportTarget.id,
          reporter_id: profile.id,
          reason,
        });
        if (error) {
          throw error;
        }

        await logAuditEvent({
          actorId: profile.id,
          action: "community_comment_reported",
          entityType: "community_comment_report",
          metadata: { comment_id: reportTarget.id },
        });
      }

      showNotice("Signalement envoyé. Merci.", "success");
      setReportTarget(null);
      setReportReason("Contenu inapproprié");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'envoyer le signalement.";
      showNotice(`Erreur signalement: ${message}`, "error");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const submitCommunityComment = async (postId: string) => {
    if (!profile) {
      return;
    }

    const draft = (commentDraftsByPostId[postId] ?? "").trim();
    if (!draft) {
      return;
    }

    setCommentSubmittingPostId(postId);
    const { data, error } = await supabase
      .from("community_post_comments")
      .insert({
        post_id: postId,
        user_id: profile.id,
        content: draft,
      })
      .select("id, post_id, user_id, content, created_at, user:profiles!user_id(full_name, avatar_url)")
      .single();
    setCommentSubmittingPostId(null);

    if (error || !data) {
      alert("Erreur: " + (error?.message ?? "Impossible d'envoyer le commentaire."));
      return;
    }

    const commentAuthor = Array.isArray(data.user) ? data.user[0] : data.user;
    const normalizedComment: CommunityComment = {
      id: data.id,
      post_id: data.post_id,
      user_id: data.user_id,
      content: data.content,
      created_at: data.created_at,
      author_name: commentAuthor?.full_name ?? profile.full_name ?? "Utilisateur",
      author_avatar: commentAuthor?.avatar_url ?? profile.avatar_url ?? null,
    };

    setCommentDraftsByPostId((current) => ({
      ...current,
      [postId]: "",
    }));

    setArticles((current) =>
      current.map((post) =>
        post.id === postId
          ? {
              ...post,
              comments: [...post.comments, normalizedComment],
              comments_count: post.comments_count + 1,
            }
          : post
      )
    );
  };

  const openBookingModal = (doctor: DoctorSummary) => {
    setSelectedDoctorToBook(doctor);
    setAppointmentDate("");
    setAppointmentTime("");
  };

  const closeBookingModal = () => {
    setSelectedDoctorToBook(null);
  };

  const openReviewModal = (appointment: PatientAppointment) => {
    setAppointmentToReview(appointment);
    setReviewRating(5);
    setReviewComment("");
  };

  const closeReviewModal = () => {
    setAppointmentToReview(null);
  };

  const submitReview = async () => {
    if (!appointmentToReview || !profile) {
      return;
    }

    setIsSubmittingReview(true);
    try {
      const { data: newReview, error } = await supabase
        .from("reviews")
        .insert({
          appointment_id: appointmentToReview.id,
          patient_id: profile.id,
          doctor_id: appointmentToReview.doctor_id,
          rating: reviewRating,
          comment: reviewComment.trim() || null,
        })
        .select("id, appointment_id, doctor_id, rating, comment, created_at")
        .single();

      if (error) {
        throw error;
      }

      if (newReview?.appointment_id) {
        setReviewsByAppointmentId((current) => ({
          ...current,
          [newReview.appointment_id]: {
            id: newReview.id,
            appointment_id: newReview.appointment_id,
            doctor_id: newReview.doctor_id,
            rating: newReview.rating,
            comment: newReview.comment ?? null,
            created_at: newReview.created_at,
          },
        }));
      }

      const updatedRatings = await fetchDoctorRatings([appointmentToReview.doctor_id]);
      setDoctorRatings((current) => ({ ...current, ...updatedRatings }));
      setDoctorReviewsByDoctorId((current) => {
        const existingReviews = current[appointmentToReview.doctor_id] ?? [];
        if (existingReviews.some((review) => review.id === newReview.id)) {
          return current;
        }

        return {
          ...current,
          [appointmentToReview.doctor_id]: [
            {
              id: newReview.id,
              rating: newReview.rating,
              comment: newReview.comment ?? null,
              created_at: newReview.created_at,
              patient_name: profile.full_name ?? "Patient",
            },
            ...existingReviews,
          ],
        };
      });

      closeReviewModal();
      await logAuditEvent({
        actorId: profile.id,
        action: "review_submitted",
        entityType: "review",
        entityId: newReview.id,
        metadata: {
          appointment_id: appointmentToReview.id,
          doctor_id: appointmentToReview.doctor_id,
          rating: reviewRating,
        },
      });
      alert("Merci, votre avis a été enregistré.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'envoyer l'avis.";
      alert("Erreur: " + message);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const confirmBooking = async () => {
    if (!selectedDoctorToBook || !profile) {
      return;
    }

    const bookingMode = selectedDoctorToBook.appointment_booking_mode ?? "patient_datetime";

    if (bookingMode === "patient_datetime" && (!appointmentDate || !appointmentTime)) {
      alert("Veuillez choisir une date et une heure valides.");
      return;
    }

    if (bookingMode === "patient_date_only" && !appointmentDate) {
      alert("Veuillez choisir une date valide.");
      return;
    }

    setIsBookingLoading(true);
    try {
      const workStartStr = normalizeTimeValue(selectedDoctorToBook.working_hours_start, '08:00');
      const workEndStr = normalizeTimeValue(selectedDoctorToBook.working_hours_end, '17:00');
      const [startH, startM] = workStartStr.split(':').map(Number);
      const [endH, endM] = workEndStr.split(':').map(Number);
      const duration = selectedDoctorToBook.appointment_duration_minutes || 30;

      let chosenDate: Date;
      let requestedDate: string | null = null;
      let requestedTime: string | null = null;

      if (bookingMode === "patient_datetime") {
        const normalizedAppointmentTime = normalizeTimeValue(appointmentTime, workStartStr);
        chosenDate = buildLocalDateTime(appointmentDate, normalizedAppointmentTime);
        requestedDate = appointmentDate;
        requestedTime = `${normalizedAppointmentTime}:00`;
      } else if (bookingMode === "patient_date_only") {
        chosenDate = buildLocalDateTime(appointmentDate, workStartStr);
        requestedDate = appointmentDate;
        requestedTime = null;
      } else {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const draftDate = getLocalIsoDate(tomorrow);
        chosenDate = buildLocalDateTime(draftDate, workStartStr);
        requestedDate = null;
        requestedTime = null;
      }

      if (isNaN(chosenDate.getTime())) throw new Error("Date ou heure invalide");

      // 1. Vérification "Acceptation RDV désactivée"
      if (selectedDoctorToBook.is_accepting_appointments === false) {
        throw new Error("❌ Réservation impossible. Le Docteur a temporairement désactivé la prise de nouveaux rendez-vous.");
      }

      // 2. Vérification "Période de congé" ou mode congé immédiat
      if (isDoctorOnVacation(selectedDoctorToBook, chosenDate)) {
        if (selectedDoctorToBook.vacation_start && selectedDoctorToBook.vacation_end) {
          const vStart = new Date(selectedDoctorToBook.vacation_start);
          const vEnd = new Date(selectedDoctorToBook.vacation_end);
          vEnd.setHours(23, 59, 59);
          throw new Error(`🏖️ Ce médecin est en congé du ${vStart.toLocaleDateString('fr-FR')} au ${vEnd.toLocaleDateString('fr-FR')}. Vous ne pouvez pas prendre de RDV sur cette période.`);
        }

        throw new Error("🏖️ Ce médecin a activé le mode congé. Les rendez-vous sont temporairement indisponibles.");
      }

      // 3. Vérification heures et disponibilité (uniquement si le patient choisit l'heure)
      const startTimeMinutes = startH * 60 + startM;
      const endTimeMinutes = endH * 60 + endM;

      const startOfDay = new Date(chosenDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(chosenDate);
      endOfDay.setHours(23, 59, 59, 999);

      let dayAppts: { appointment_date: string; status: string }[] = [];
      if (bookingMode !== "doctor_datetime") {
        const { data, error: apptErr } = await supabase
          .from("appointments")
          .select("appointment_date, status")
          .eq("doctor_id", selectedDoctorToBook.id)
          .gte("appointment_date", startOfDay.toISOString())
          .lte("appointment_date", endOfDay.toISOString())
          .neq("status", "cancelled");
        if (apptErr) throw apptErr;
        dayAppts = data ?? [];
      }

      // Limite par jour
      const maxAppts = selectedDoctorToBook.max_appointments_per_day;
      if (bookingMode !== "doctor_datetime" && maxAppts !== null && dayAppts.length >= maxAppts) {
        throw new Error(`🛑 Ce médecin a atteint sa limite maximale de consultations pour cette journée (Limite: ${maxAppts} RDV).`);
      }

      if (bookingMode === "patient_datetime") {
        const requestedHours = chosenDate.getHours();
        const requestedMinutes = chosenDate.getMinutes();
        const requestedTimeMinutes = requestedHours * 60 + requestedMinutes;
        const requestedEndMinutes = requestedTimeMinutes + duration;
        if (requestedTimeMinutes < startTimeMinutes || requestedEndMinutes > endTimeMinutes) {
          throw new Error(`🕒 En dehors des heures d'ouverture. Ce cabinet est ouvert de ${workStartStr.substring(0,5)} à ${workEndStr.substring(0,5)}.`);
        }

        const requestedTime = chosenDate.getTime();
        const hasOverlap = dayAppts.some((appt: { appointment_date: string }) => {
          const apptTime = new Date(appt.appointment_date).getTime();
          const diffInMinutes = Math.abs(requestedTime - apptTime) / (1000 * 60);
          return diffInMinutes < duration;
        });

        if (hasOverlap) {
          throw new Error(`⏱️ Ce créneau est trop proche d'un autre RDV (durée requise ${duration} min).`);
        }
      }

      // === Validation réussie, on sauvegarde en Base ! ===
      const { data: insertedAppointment, error } = await supabase
        .from("appointments")
        .insert({
          patient_id: profile.id,
          doctor_id: selectedDoctorToBook.id,
          appointment_date: chosenDate.toISOString(),
          status: 'pending',
          booking_selection_mode: bookingMode,
          requested_date: requestedDate,
          requested_time: requestedTime,
        })
        .select("id, appointment_date, status, doctor_id, booking_selection_mode, requested_date, requested_time")
        .single();

      if (error) throw error;
      if (insertedAppointment) {
        setAppointments((current) =>
          [...current, {
            ...insertedAppointment,
            booking_selection_mode: (insertedAppointment.booking_selection_mode ?? "patient_datetime") as BookingSelectionMode,
            requested_date: insertedAppointment.requested_date ?? null,
            requested_time: insertedAppointment.requested_time ?? null,
            doctor: {
              full_name: selectedDoctorToBook.full_name,
              specialty: selectedDoctorToBook.specialty,
              address: selectedDoctorToBook.address,
            },
          }].sort((left, right) => (
            new Date(left.appointment_date).getTime() - new Date(right.appointment_date).getTime()
          ))
        );

        await logAuditEvent({
          actorId: profile.id,
          action: "appointment_created",
          entityType: "appointment",
          entityId: insertedAppointment.id,
          metadata: {
            doctor_id: selectedDoctorToBook.id,
            booking_mode: bookingMode,
          },
        });
      }

      closeBookingModal();
      startTransition(() => setActiveTab("appointments"));
      if (bookingMode === "doctor_datetime") {
        alert("Demande envoyée. Le médecin vous proposera la date et l'heure.");
      } else if (bookingMode === "patient_date_only") {
        alert("Demande envoyée. Le médecin fixera l'heure.");
      } else {
        alert("Demande de rendez-vous envoyée avec succès !");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue.";
      alert("Erreur: " + message);
    } finally {
      setIsBookingLoading(false);
    }
  };

  const specialties = Array.from(
    new Set(doctors.map((doc) => doc.specialty).filter((s): s is string => !!s))
  ).sort((left, right) => left.localeCompare(right));

  const filteredDoctors = doctors.filter(doc => {
    const normalizedSearch = deferredSearchQuery.trim().toLowerCase();
    const matchName = normalizedSearch
      ? doc.full_name?.toLowerCase().includes(normalizedSearch) || doc.address?.toLowerCase().includes(normalizedSearch)
      : true;
    const matchSpec = selectedSpecialty ? doc.specialty === selectedSpecialty : true;
    const doctorAvgRating = doctorRatings[doc.id]?.avg_rating ?? 0;
    const matchMinRating = doctorAvgRating >= minimumRating;
    return matchName && matchSpec && matchMinRating;
  });
  const selectedDoctorDistanceKm = computeDistanceKm(userLocation, selectedDoctorDetails);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'text-green-600 bg-green-100 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'cancelled': return 'text-red-600 bg-red-100 border-red-200';
      case 'completed': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getBookingModeLabel = (mode: BookingSelectionMode | null | undefined) => {
    switch (mode) {
      case "doctor_datetime":
        return "Docteur décide date+heure";
      case "patient_date_only":
        return "Vous choisissez la date";
      default:
        return "Vous choisissez date+heure";
    }
  };

  const getAppointmentTimingLabel = (appointment: PatientAppointment) => {
    const mode = appointment.booking_selection_mode ?? "patient_datetime";

    if (appointment.status !== "pending") {
      return new Date(appointment.appointment_date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
    }

    if (mode === "doctor_datetime") {
      return "En attente de proposition complète du médecin.";
    }

    if (mode === "patient_date_only") {
      if (appointment.requested_date) {
        const requestedDateLabel = new Date(`${appointment.requested_date}T00:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'long' });
        return `${requestedDateLabel} · heure à définir par le médecin.`;
      }
      return "Date demandée transmise, heure à définir.";
    }

    return new Date(appointment.appointment_date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-slate-950 ${isEmbedded ? "block" : "flex flex-col md:flex-row"} font-sans transition-colors duration-200`}>
      
      {/* Sidebar Content */}
      {!isEmbedded ? (
      <aside className="w-full md:w-72 bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 shadow-sm flex flex-col z-10 sticky top-0 h-screen transition-colors duration-200">
        <div className="p-6 pb-8 border-b border-gray-100 dark:border-slate-800">
          <Link href="/"><Logo width={120} /></Link>
        </div>
        <div className="p-6 flex flex-col gap-2 flex-grow overflow-y-auto">
          <button onClick={() => setActiveTab("overview")} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "overview" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
            <Activity size={20} /> Vue d&apos;ensemble
          </button>
          <button onClick={() => setActiveTab("search")} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "search" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
            <Search size={20} /> Trouver un Médecin
          </button>
          <button onClick={() => setActiveTab("appointments")} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "appointments" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
            <Calendar size={20} /> Mes Rendez-vous
          </button>
          <button onClick={() => setActiveTab("community")} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "community" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
            <FileText size={20} /> Communauté
          </button>
          <button onClick={() => setActiveTab("settings")} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "settings" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
            <Settings size={20} /> Paramètres
          </button>
        </div>
        <div className="p-6 border-t border-gray-100 dark:border-slate-800 mt-auto">
          <div className="flex items-center gap-3 mb-6">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile?.full_name || "Patient"}
                className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold uppercase border-2 border-white dark:border-slate-800 shadow-sm shrink-0">
                {profile?.full_name?.substring(0,2) || "PA"}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate leading-tight">{profile?.full_name || "Patient"}</p>
              <p className="text-xs text-gray-500 dark:text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition font-medium w-full">
            <LogOut size={16} /> Me Déconnecter
          </button>
        </div>
      </aside>
      ) : null}

      {/* Main Content Area */}
      <main className={`flex-1 ${isEmbedded ? "p-5 md:p-6" : "p-8"} overflow-y-auto`}>
        <AnimatePresence mode="wait">
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="mb-10">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-50 mb-2">Bonjour, {profile?.full_name?.split(' ')[0] || "Patient"} 👋</h1>
                <p className="text-gray-500 dark:text-slate-400">Bienvenue sur votre espace santé personnel. Que souhaitez-vous faire aujourd&apos;hui ?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div onClick={() => setActiveTab("search")} className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white shadow-xl shadow-blue-200/50 dark:shadow-none cursor-pointer transform hover:scale-[1.02] transition-all">
                  <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                    <Search className="text-white" size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-1">Prendre RDV</h3>
                  <p className="text-blue-50 text-sm">Recherchez un spécialiste près de chez vous</p>
                </div>

                <div onClick={() => setActiveTab("appointments")} className="bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-md hover:shadow-lg cursor-pointer transition-all">
                  <div className="bg-blue-50 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-blue-600 dark:text-blue-300">
                    <Calendar size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-1 text-gray-800 dark:text-slate-100">{appointments.length} RDV(s)</h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">Consultez votre historique et vos RDV à venir</p>
                </div>

                <div onClick={() => setActiveTab("community")} className="bg-white dark:bg-slate-950 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-md hover:shadow-lg cursor-pointer transition-all">
                  <div className="bg-purple-50 dark:bg-purple-900/30 w-12 h-12 rounded-full flex items-center justify-center mb-4 text-purple-600 dark:text-purple-300">
                    <FileText size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-1 text-gray-800 dark:text-slate-100">Actualités</h3>
                  <p className="text-gray-500 dark:text-slate-400 text-sm">Découvrez de nouveaux conseils santé</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: SEARCH DOCTORS */}
          {activeTab === "search" && (
            <motion.div key="search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <div className="mb-6 flex items-center justify-between gap-3">
                 <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2"><MapIcon className="text-blue-600"/> Trouver un praticien</h2>
                 <button
                   onClick={handleManualRefresh}
                   className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm font-semibold"
                 >
                   <RefreshCw size={16} /> Rafraîchir
                 </button>
               </div>
               
               <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 mb-6 grid gap-4 md:grid-cols-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Nom du médecin, clinique..." 
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-slate-100"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="w-full">
                    <select 
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-600 dark:text-slate-300 font-medium"
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                    >
                      <option value="">Toutes les spécialités</option>
                      {specialties.map((specialtyOption) => (
                        <option key={specialtyOption} value={specialtyOption}>
                          {specialtyOption}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-full">
                    <select
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-gray-600 dark:text-slate-300 font-medium"
                      value={minimumRating}
                      onChange={(event) => setMinimumRating(Number(event.target.value))}
                    >
                      <option value={0}>Note min: toutes</option>
                      <option value={3}>Note min: 3.0+</option>
                      <option value={4}>Note min: 4.0+</option>
                      <option value={4.5}>Note min: 4.5+</option>
                    </select>
                  </div>
               </div>

               {/* OpenStreetMap Gratuite Integration (Leaflet) */}
               <div className="w-full h-80 bg-slate-200 dark:bg-slate-800 rounded-3xl mb-8 overflow-hidden relative shadow-inner">
                  <MapComponent doctors={filteredDoctors} userLocation={userLocation} />

                  {/* Bouton de geolocalisation */}
                  <div className="absolute top-4 right-4 z-10 overflow-hidden">
                     <button onClick={handleGeolocate} className="bg-white/90 dark:bg-slate-900/90 backdrop-blur p-3 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 text-gray-600 dark:text-slate-300 transition flex items-center justify-center" title="Me géolocaliser">
                        <Crosshair size={22} className={userLocation ? "text-blue-500" : ""} />
                     </button>
                  </div>
               </div>

               <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {filteredDoctors.map((doc) => {
                   const ratingRow = doctorRatings[doc.id];
                   const avgRating = ratingRow?.avg_rating ?? 0;
                   const totalReviews = ratingRow?.total_reviews ?? 0;
                   const filledStars = Math.round(avgRating);

                   return (
                   <div
                     key={doc.id}
                     onClick={() => openDoctorDetails(doc)}
                     className="bg-white dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-shadow group relative overflow-hidden cursor-pointer"
                   >
                     <div className="absolute top-0 right-0 p-4">
                       <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-yellow-100 dark:border-yellow-800/50">
                         <div className="flex items-center gap-0.5 justify-center">
                           {Array.from({ length: 5 }).map((_, index) => (
                             <Star
                               key={`${doc.id}-rating-${index}`}
                               size={12}
                               className={index < filledStars ? "fill-current text-yellow-500" : "text-yellow-300 dark:text-yellow-700"}
                             />
                           ))}
                         </div>
                         <p className="text-center mt-0.5">
                           {totalReviews > 0 ? `${avgRating.toFixed(1)} (${totalReviews})` : "Nouveau"}
                         </p>
                       </div>
                     </div>
                     {doc.avatar_url ? (
                       <img
                         src={doc.avatar_url}
                         alt={doc.full_name || "Docteur"}
                         className="w-16 h-16 rounded-full object-cover mb-4 border-2 border-white dark:border-slate-800 shadow-sm"
                       />
                     ) : (
                       <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900 dark:to-emerald-900 rounded-full flex items-center justify-center text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 border-2 border-white dark:border-slate-800 shadow-sm transition-colors">
                          {doc.full_name?.substring(0,2).toUpperCase() || "DR"}
                       </div>
                     )}
                     <h3 className="font-bold text-lg text-gray-900 dark:text-slate-100 mb-1">
                        Dr. {doc.full_name} {doc.gender === 'Homme' ? '👨' : doc.gender === 'Femme' ? '👩' : ''}
                     </h3>
                     <p className="text-blue-600 dark:text-blue-400 font-medium text-sm mb-3">{doc.specialty || "Médecin"}</p>
                      <p className="text-slate-500 dark:text-slate-500 text-sm flex items-center gap-2 mb-4 line-clamp-1">
                        <MapPin size={14} className="shrink-0" /> {doc.address || "Adresse non renseignée"}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                        {getBookingModeLabel(doc.appointment_booking_mode)}
                      </p>
                      
                      {/* Affichage des états spéciaux (Congé / Désactivé) */}
                     {doc.is_accepting_appointments === false ? (
                       <button onClick={(event) => { event.stopPropagation(); alert("Ce docteur a désactivé la prise de RDV temporairement."); }} className="w-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 py-3 rounded-xl font-bold border border-slate-300 dark:border-slate-700 transition line-clamp-1 px-2">
                         ❌ Rendez-vous Suspendus
                       </button>
                     ) : isDoctorOnVacation(doc) ? (
                       <button onClick={(event) => { event.stopPropagation(); alert(getVacationLabel(doc)); }} className="w-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 py-3 rounded-xl font-bold border border-orange-100 dark:border-orange-800 hover:bg-orange-100 transition truncate px-2">
                         🏖️ En Congé
                       </button>
                     ) : (
                        <button 
                         onClick={(event) => {
                           event.stopPropagation();
                           openBookingModal(doc);
                         }}
                         className="w-full bg-slate-900 dark:bg-blue-600 text-white py-3 rounded-xl font-medium shadow-md shadow-slate-900/20 dark:shadow-blue-900/20 hover:bg-slate-800 dark:hover:bg-blue-500 transform hover:-translate-y-0.5 transition flex justify-center items-center gap-2"
                       >
                         Prendre RDV <ChevronRight size={16} />
                       </button>
                     )}
                   </div>
                   );
                 })}
                 {filteredDoctors.length === 0 && (
                   <div className="col-span-full py-12 text-center text-gray-400">
                      <Search size={48} className="mx-auto mb-4 opacity-50" />
                      <p>Aucun médecin trouvé pour cette recherche ou dans ce périmètre.</p>
                   </div>
                 )}
               </div>
            </motion.div>
          )}

          {/* TAB: MY APPOINTMENTS */}
          {activeTab === "appointments" && (
            <motion.div key="appointments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <div className="mb-6 flex items-center justify-between gap-3">
                 <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2"><Calendar className="text-blue-600"/> Gérer mes Rendez-vous</h2>
                 <button
                   onClick={handleManualRefresh}
                   className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm font-semibold"
                 >
                   <RefreshCw size={16} /> Rafraîchir
                 </button>
               </div>
               
               <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                 {appointments.length === 0 ? (
                   <div className="p-12 text-center">
                     <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                       <Calendar className="text-gray-300 dark:text-slate-600" size={32} />
                     </div>
                     <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-1">Aucun rendez-vous</h3>
                      <p className="text-gray-500 dark:text-slate-400 mb-6">Vous n&apos;avez pas encore planifié de consultation.</p>
                     <button onClick={() => setActiveTab('search')} className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium shadow hover:bg-blue-700 transition">
                       Trouver un médecin
                     </button>
                   </div>
                 ) : (
                   <div className="divide-y divide-gray-100 dark:border-slate-800">
                     {appointments.map(appt => (
                       <div key={appt.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition">
                         <div className="flex items-start gap-4">
                           <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
                             <Clock size={20} />
                           </div>
                           <div>
                              <h4 className="font-bold text-gray-900 dark:text-slate-100 text-lg">Dr. {appt.doctor?.full_name}</h4>
                              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">{appt.doctor?.specialty}</p>
                              <div className="text-sm text-gray-500 dark:text-slate-500 flex items-center gap-2">
                                <Calendar size={14} /> {getAppointmentTimingLabel(appt)}
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                {getBookingModeLabel(appt.booking_selection_mode)}
                              </p>
                            </div>
                          </div>
                         <div className="flex flex-col items-end gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(appt.status)}`}>
                              {appt.status}
                            </span>
                            {appt.status === 'completed' && !reviewsByAppointmentId[appt.id] && (
                              <button
                                onClick={() => openReviewModal(appt)}
                                className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                              >
                                <Star size={14} /> Laisser un avis
                              </button>
                            )}
                            {appt.status === 'completed' && reviewsByAppointmentId[appt.id] && (
                              <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                Avis envoyé · {reviewsByAppointmentId[appt.id].rating}/5
                              </span>
                            )}
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
            </motion.div>
          )}

          {/* TAB: ARTICLES */}
          {activeTab === "community" && (
            <motion.div key="community" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                 <FileText className="text-blue-600"/> Communauté Santé
               </h2>

               <div className="space-y-6">
                 {articles.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">Aucune publication pour le moment.</div>
                 ) : (
                   articles.map((article) => (
                     <article key={article.id} className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
                       <div className="flex items-center gap-3 mb-4">
                         {article.author?.avatar_url ? (
                           <img
                             src={article.author.avatar_url}
                             alt={article.author.full_name || "Docteur"}
                             className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                           />
                         ) : (
                           <div className="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 uppercase">
                             {(article.author?.full_name?.substring(0, 2) ?? "DR").toUpperCase()}
                           </div>
                         )}
                         <div className="min-w-0">
                           <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                             Dr. {article.author?.full_name ?? "Médecin"}
                           </p>
                           <p className="text-xs text-slate-500 dark:text-slate-400">
                             {article.author?.specialty ?? "Spécialité non renseignée"} · {new Date(article.created_at).toLocaleDateString("fr-FR")}
                           </p>
                         </div>
                         <span className={`ml-auto inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                           article.category === "maladie"
                             ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                             : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                         }`}>
                           {article.category === "maladie" ? "Maladie" : "Conseil"}
                         </span>
                       </div>

                        <h3 className="font-bold text-xl text-gray-900 dark:text-slate-100 mb-2">{article.title}</h3>
                        <p className="text-gray-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{article.content}</p>
                        {article.images.length > 0 ? (
                          <div className={`mt-4 grid gap-2 ${article.images.length === 1 ? "grid-cols-1" : article.images.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>
                            {article.images.slice(0, 6).map((image, index) => (
                              <img
                                key={image.id}
                                src={image.image_url}
                                alt={`Publication ${article.title} - photo ${index + 1}`}
                                className="w-full h-40 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                              />
                            ))}
                            {article.images.length > 6 ? (
                              <div className="h-40 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                                +{article.images.length - 6} photos
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                         <div className="flex items-center gap-3 text-sm">
                           <button
                             onClick={() => void toggleLikePost(article.id)}
                             className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${
                               article.liked_by_me
                                 ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
                                 : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                             }`}
                           >
                             <Heart size={15} className={article.liked_by_me ? "fill-current" : ""} />
                             {article.likes_count}
                           </button>
                           <button
                             onClick={() => void toggleSavePost(article.id)}
                             className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition ${
                               article.saved_by_me
                                 ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                 : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                             }`}
                           >
                             <Bookmark size={15} className={article.saved_by_me ? "fill-current" : ""} />
                             {article.saves_count}
                           </button>
                           <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                             <MessageCircle size={15} />
                             {article.comments_count}
                           </span>
                           <button
                             onClick={() => void reportPost(article.id)}
                             className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                             title="Signaler cette publication"
                           >
                             <Flag size={15} />
                             Signaler
                           </button>
                         </div>

                         <div className="mt-4 space-y-3">
                           {article.comments.length === 0 ? (
                             <p className="text-xs text-slate-500 dark:text-slate-400">Aucun commentaire pour le moment.</p>
                           ) : (
                             article.comments.map((comment) => (
                               <div key={comment.id} className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2">
                                 <div className="flex items-start justify-between gap-2">
                                   <div>
                                     <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">{comment.author_name ?? "Utilisateur"}</p>
                                     <p className="text-sm text-slate-600 dark:text-slate-300">{comment.content}</p>
                                   </div>
                                   <button
                                     onClick={() => void reportComment(comment.id)}
                                     className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                     title="Signaler ce commentaire"
                                   >
                                     <Flag size={12} />
                                     Signaler
                                   </button>
                                 </div>
                               </div>
                             ))
                           )}
                         </div>

                         <div className="mt-4 flex items-center gap-2">
                           <input
                             type="text"
                             value={commentDraftsByPostId[article.id] ?? ""}
                             onChange={(event) =>
                               setCommentDraftsByPostId((current) => ({
                                 ...current,
                                 [article.id]: event.target.value,
                               }))
                             }
                             className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                             placeholder="Écrire un commentaire..."
                           />
                           <button
                             onClick={() => void submitCommunityComment(article.id)}
                             disabled={commentSubmittingPostId === article.id}
                             className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-60"
                           >
                             <Send size={14} />
                             {commentSubmittingPostId === article.id ? "..." : "Publier"}
                           </button>
                         </div>
                       </div>
                     </article>
                   ))
                 )}
               </div>
             </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 border border-gray-200 dark:border-slate-800 shadow-sm max-w-2xl mx-auto transition-colors">
                 <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2"><Settings className="text-blue-600"/> Paramètres du compte</h2>
                 <p className="text-gray-500 dark:text-slate-400 mb-8">Mettez à jour votre profil, y compris votre photo.</p>
                 <div className="space-y-6">
                   <div>
                     <label className="text-sm font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Nom complet</label>
                     <input
                       type="text"
                       value={settingsFullName}
                       onChange={(event) => setSettingsFullName(event.target.value)}
                       className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none mt-2 text-gray-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500"
                     />
                   </div>
                   <div>
                     <label className="text-sm font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Email de contact</label>
                     <input type="text" readOnly value={profile?.email || ""} className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none mt-2 text-gray-800 dark:text-slate-100 font-medium" />
                   </div>
                   <div>
                     <label className="text-sm font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">Photo de profil</label>
                     <div className="mt-2 flex flex-wrap items-center gap-3">
                       <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition">
                         <Upload size={16} />
                         {isUploadingAvatar ? "Téléversement..." : "Téléverser une photo"}
                         <input
                           type="file"
                           accept="image/*"
                           className="hidden"
                           onChange={(event) => {
                             const file = event.target.files?.[0];
                             if (file) {
                               void handleAvatarUpload(file);
                             }
                             event.currentTarget.value = "";
                           }}
                           disabled={isUploadingAvatar}
                         />
                       </label>
                       {settingsAvatarUrl ? (
                         <button
                           type="button"
                           onClick={() => setSettingsAvatarUrl("")}
                           className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                         >
                           Supprimer la photo
                         </button>
                       ) : null}
                     </div>
                     <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                       Formats acceptés: JPG, PNG, WebP (max 5 MB).
                     </p>
                     {settingsAvatarUrl ? (
                       <div className="mt-3 flex items-center gap-3">
                         <img src={settingsAvatarUrl} alt="Aperçu profil" className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                         <span className="text-xs text-slate-500 dark:text-slate-400">Aperçu de la photo</span>
                       </div>
                     ) : null}
                   </div>
                   <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                     <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                       {isAutoSavingAccount ? "Sauvegarde automatique..." : "Sauvegarde automatique activée."}
                     </p>
                     <button
                       onClick={handleSaveAccountSettings}
                       disabled={isSavingAccount}
                       className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-600/20 disabled:opacity-60"
                     >
                       {isSavingAccount ? "Enregistrement..." : "Enregistrer les modifications"}
                     </button>
                   </div>
                 </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedDoctorDetails && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.97, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: 14 }}
                className="bg-white dark:bg-slate-950 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[88vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    {selectedDoctorDetails.avatar_url ? (
                      <img
                        src={selectedDoctorDetails.avatar_url}
                        alt={selectedDoctorDetails.full_name || "Docteur"}
                        className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-blue-900 dark:to-emerald-900 flex items-center justify-center text-xl font-bold text-slate-800 dark:text-slate-100">
                        {selectedDoctorDetails.full_name?.substring(0, 2).toUpperCase() || "DR"}
                      </div>
                    )}
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Dr. {selectedDoctorDetails.full_name}</h3>
                      <p className="text-blue-600 dark:text-blue-400 font-medium">{selectedDoctorDetails.specialty || "Médecin"}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                        <MapPin size={14} />
                        {selectedDoctorDetails.address || "Adresse non renseignée"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeDoctorDetails}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-2.5 transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mb-6">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Note moyenne</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {(doctorRatings[selectedDoctorDetails.id]?.avg_rating ?? 0).toFixed(1)} / 5
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Total avis</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {doctorRatings[selectedDoctorDetails.id]?.total_reviews ?? 0}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Distance</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {selectedDoctorDistanceKm !== null
                        ? `${selectedDoctorDistanceKm.toFixed(1)} km`
                        : "Indisponible"}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-3">Commentaires patients</h4>
                  {isLoadingDoctorDetails ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Chargement des avis...</p>
                  ) : (doctorReviewsByDoctorId[selectedDoctorDetails.id]?.length ?? 0) === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Aucun commentaire pour le moment.</p>
                  ) : (
                    <div className="space-y-3">
                      {doctorReviewsByDoctorId[selectedDoctorDetails.id].map((review) => (
                        <div key={review.id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{review.patient_name || "Patient"}</p>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <Star
                                  key={`${review.id}-s-${index}`}
                                  size={13}
                                  className={index < review.rating ? "text-yellow-500 fill-current" : "text-slate-300 dark:text-slate-600"}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {review.comment || "Pas de commentaire."}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => bookFromDetails(selectedDoctorDetails)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                  >
                    Prendre RDV <ChevronRight size={16} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ========================================================= */}
        {/* MODAL DE RÉSERVATION JOLIE POUR LE FRONT END */}
        {/* ========================================================= */}
        <AnimatePresence>
          {selectedDoctorToBook && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-950 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Demande de RDV</h2>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-1">Dr. {selectedDoctorToBook.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">{selectedDoctorToBook.specialty}</p>
                  </div>
                  <button onClick={closeBookingModal} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-2.5 transition flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-5">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-3 text-sm text-slate-700 dark:text-slate-300">
                    Mode sélectionné: {getBookingModeLabel(selectedDoctorToBook.appointment_booking_mode)}
                  </div>

                  {selectedDoctorToBook.appointment_booking_mode !== "doctor_datetime" ? (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Choix de la Date</label>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="date" 
                          value={appointmentDate}
                          onChange={e => setAppointmentDate(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                          min={getLocalIsoDate()}
                          required
                        />
                      </div>
                    </div>
                  ) : null}

                  {selectedDoctorToBook.appointment_booking_mode === "patient_datetime" ? (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 ml-1">Heure souhaitée</label>
                      <div className="relative">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="time" 
                          value={appointmentTime}
                          onChange={e => setAppointmentTime(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 rounded-xl pl-11 pr-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                          required
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button onClick={closeBookingModal} className="w-1/3 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                    Annuler
                  </button>
                  <button disabled={isBookingLoading} onClick={confirmBooking} className="w-2/3 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-lg shadow-blue-600/30 flex justify-center items-center gap-2">
                    {isBookingLoading ? (
                      <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Validation...</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {selectedDoctorToBook.appointment_booking_mode === "doctor_datetime"
                          ? "Envoyer la demande"
                          : selectedDoctorToBook.appointment_booking_mode === "patient_date_only"
                            ? "Envoyer la date"
                            : "Confirmer RDV"} <CheckCircle size={18} />
                      </span>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {appointmentToReview && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 16 }}
                className="bg-white dark:bg-slate-950 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl border border-slate-100 dark:border-slate-800"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Votre avis compte</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Dr. {appointmentToReview.doctor?.full_name}
                    </p>
                  </div>
                  <button
                    onClick={closeReviewModal}
                    className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-2.5 transition"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Note globale</p>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const value = index + 1;
                        const active = value <= reviewRating;
                        return (
                          <button
                            key={`review-star-${value}`}
                            type="button"
                            onClick={() => setReviewRating(value)}
                            className="p-1 rounded-md transition hover:scale-105"
                          >
                            <Star
                              size={26}
                              className={active ? "text-yellow-500 fill-current" : "text-slate-300 dark:text-slate-600"}
                            />
                          </button>
                        );
                      })}
                      <span className="ml-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        {reviewRating}/5
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Commentaire (optionnel)
                    </label>
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      className="w-full min-h-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-700 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Partagez votre expérience de consultation..."
                    />
                  </div>
                </div>

                <div className="mt-8 flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={closeReviewModal}
                    disabled={isSubmittingReview}
                    className="w-1/3 py-3 rounded-xl font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-60"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={submitReview}
                    disabled={isSubmittingReview}
                    className="w-2/3 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-lg shadow-emerald-600/25 disabled:opacity-60"
                  >
                    {isSubmittingReview ? "Envoi..." : "Envoyer mon avis"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reportTarget ? (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl"
              >
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Signaler un {reportTarget.type === "post" ? "post" : "commentaire"}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Merci d&apos;indiquer la raison du signalement.
                </p>
                <textarea
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="mt-4 w-full h-28 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Raison du signalement..."
                />
                <div className="mt-5 flex items-center gap-3">
                  <button
                    onClick={closeReportModal}
                    className="w-1/3 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={submitReport}
                    disabled={isSubmittingReport}
                    className="w-2/3 rounded-xl bg-rose-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition disabled:opacity-60"
                  >
                    {isSubmittingReport ? "Envoi..." : "Envoyer le signalement"}
                  </button>
                </div>
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {notice ? (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className={`fixed top-5 right-5 z-[95] max-w-sm rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${
                notice.type === "error"
                  ? "border-rose-200 bg-rose-50/95 text-rose-700 dark:border-rose-800 dark:bg-rose-900/80 dark:text-rose-200"
                  : notice.type === "success"
                    ? "border-emerald-200 bg-emerald-50/95 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200"
                    : "border-blue-200 bg-blue-50/95 text-blue-700 dark:border-blue-800 dark:bg-blue-900/80 dark:text-blue-200"
              }`}
            >
              <p className="text-sm font-semibold leading-snug">{notice.message}</p>
            </motion.div>
          ) : null}
        </AnimatePresence>

      </main>
    </div>
  );
}
// made by larabi
