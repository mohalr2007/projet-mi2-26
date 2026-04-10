// made by larabi
'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../utils/supabase/client";
import { logAuditEvent, logPerformanceEvent } from "../../utils/telemetry";
import { Logo } from "../../components/Logo";
import { 
  Users, Calendar as CalendarIcon, Clock, Settings, LogOut, 
  FileText, CheckCircle, XCircle, RefreshCw, Upload, Images, X, Heart, Bookmark, MessageCircle, Send, Flag, MoreVertical,
  Plus, Search, ChevronRight, UserCircle, Phone, Stethoscope, Pencil, Trash2, Activity, ClipboardList, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type BookingSelectionMode = "patient_datetime" | "patient_date_only" | "doctor_datetime";

type DoctorProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  specialty: string | null;
  address: string | null;
  bio: string | null;
  gender: string | null;
  is_accepting_appointments: boolean | null;
  appointment_duration_minutes: number | null;
  max_appointments_per_day: number | null;
  vacation_start: string | null;
  vacation_end: string | null;
  is_on_vacation: boolean | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  appointment_booking_mode: BookingSelectionMode | null;
  is_platform_admin?: boolean | null;
  email?: string | null;
};

type DoctorAppointment = {
  id: string;
  appointment_date: string;
  status: string;
  booking_selection_mode: BookingSelectionMode | null;
  requested_date: string | null;
  requested_time: string | null;
  patient: {
    full_name: string | null;
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

type CommunityArticle = {
  id: string;
  doctor_id: string;
  category: "conseil" | "maladie";
  title: string;
  content: string;
  created_at: string;
  images: PublicationImage[];
  author: {
    full_name: string | null;
    specialty: string | null;
    avatar_url?: string | null;
  } | null;
};

type PublicationImage = {
  id: string;
  image_url: string;
  sort_order: number;
};

type PendingPublicationImage = {
  file: File;
  previewUrl: string;
};

type DoctorPublication = {
  id: string;
  category: "conseil" | "maladie";
  title: string;
  content: string;
  created_at: string;
  is_hidden?: boolean;
  hidden_reason?: string | null;
  images: PublicationImage[];
};

type MedicalDossier = {
  id: string;
  doctor_id: string;
  patient_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  blood_type: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  general_remarks: string | null;
  created_at: string;
  updated_at: string;
  visits?: DossierVisit[];
};

type DossierVisit = {
  id: string;
  dossier_id: string;
  appointment_id: string | null;
  visit_date: string;
  visit_time: string | null;
  reason: string | null;
  diagnosis: string | null;
  treatment: string | null;
  doctor_notes: string | null;
  follow_up_date: string | null;
  created_at: string;
};

function normalizeDoctorProfile(
  profile: Partial<DoctorProfile> | null | undefined,
  email?: string | null
): DoctorProfile | null {
  if (!profile?.id) {
    return null;
  }

  return {
    id: profile.id,
    full_name: profile.full_name ?? null,
    avatar_url: profile.avatar_url ?? null,
    specialty: profile.specialty ?? null,
    address: profile.address ?? null,
    bio: profile.bio ?? null,
    gender: profile.gender ?? null,
    is_accepting_appointments: profile.is_accepting_appointments ?? true,
    appointment_duration_minutes: profile.appointment_duration_minutes ?? 30,
    max_appointments_per_day: profile.max_appointments_per_day ?? null,
    vacation_start: profile.vacation_start ?? null,
    vacation_end: profile.vacation_end ?? null,
    is_on_vacation: profile.is_on_vacation ?? false,
    working_hours_start: profile.working_hours_start ?? '08:00',
    working_hours_end: profile.working_hours_end ?? '17:00',
    appointment_booking_mode: (profile.appointment_booking_mode ?? "patient_datetime") as BookingSelectionMode,
    is_platform_admin: profile.is_platform_admin ?? false,
    email: email ?? null,
  };
}

function normalizeDoctorAppointment(appointment: {
  id: string;
  appointment_date: string;
  status: string;
  booking_selection_mode?: BookingSelectionMode | null;
  requested_date?: string | null;
  requested_time?: string | null;
  patient?: { full_name: string | null }[] | { full_name: string | null } | null;
}): DoctorAppointment {
  const normalizedPatient = Array.isArray(appointment.patient)
    ? (appointment.patient[0] ?? null)
    : (appointment.patient ?? null);

  return {
    id: appointment.id,
    appointment_date: appointment.appointment_date,
    status: appointment.status,
    booking_selection_mode: appointment.booking_selection_mode ?? "patient_datetime",
    requested_date: appointment.requested_date ?? null,
    requested_time: appointment.requested_time ?? null,
    patient: normalizedPatient,
  };
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

type NoticeType = "success" | "error" | "info";

export default function DoctorDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmbedded = searchParams.get("embed") === "1";

  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    const normalizedTab = tab === "articles" ? "community" : tab;
    const allowedTabs = new Set(["appointments", "patients", "community", "publications", "profile"]);
    return normalizedTab && allowedTabs.has(normalizedTab) ? normalizedTab : "appointments";
  });

  // Nouveaux paramètres DB
  const [isAccepting, setIsAccepting] = useState(true);
  const [durationParams, setDurationParams] = useState<number>(30);
  const [maxAppointments, setMaxAppointments] = useState<number | ''>('');
  const [isUnlimited, setIsUnlimited] = useState(true); // Illimité ?
  const [vacationStart, setVacationStart] = useState('');
  const [vacationEnd, setVacationEnd] = useState('');
  const [isOnVacation, setIsOnVacation] = useState(false);
  const [workingHoursStart, setWorkingHoursStart] = useState('08:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('17:00');
  const [bookingMode, setBookingMode] = useState<BookingSelectionMode>("patient_datetime");
  const [isUpdatingParams, setIsUpdatingParams] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [appointmentToSchedule, setAppointmentToSchedule] = useState<DoctorAppointment | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [isSchedulingAppointment, setIsSchedulingAppointment] = useState(false);

  // Editable Profile Info
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Data
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [articles, setArticles] = useState<DoctorPublication[]>([]);

  // Medical Dossiers state
  const [dossiers, setDossiers] = useState<MedicalDossier[]>([]);
  const [dossierSearch, setDossierSearch] = useState('');
  const [selectedDossier, setSelectedDossier] = useState<MedicalDossier | null>(null);
  const [showNewDossierModal, setShowNewDossierModal] = useState(false);
  const [showNewVisitModal, setShowNewVisitModal] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [visitLoading, setVisitLoading] = useState(false);
  const [dossierVisits, setDossierVisits] = useState<DossierVisit[]>([]);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [editingGeneralRemarks, setEditingGeneralRemarks] = useState(false);
  const [newDossierForm, setNewDossierForm] = useState({ first_name: '', last_name: '', phone: '', email: '', date_of_birth: '', gender: '', blood_type: '', allergies: '', chronic_conditions: '', general_remarks: '' });
  const [newVisitForm, setNewVisitForm] = useState({ visit_date: new Date().toISOString().split('T')[0], visit_time: '', reason: '', diagnosis: '', treatment: '', doctor_notes: '', follow_up_date: '' });
  const [generalRemarksEdit, setGeneralRemarksEdit] = useState('');

  const [allArticles, setAllArticles] = useState<CommunityArticle[]>([]);
  const [likesByPost, setLikesByPost] = useState<Record<string, { count: number; likedByMe: boolean }>>({});
  const [savesByPost, setSavesByPost] = useState<Record<string, { count: number; savedByMe: boolean }>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [commentDraftsByPostId, setCommentDraftsByPostId] = useState<Record<string, string>>({});
  const [commentSubmittingPostId, setCommentSubmittingPostId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment"; id: string } | null>(null);
  const [reportReason, setReportReason] = useState("Contenu inapproprié");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const [newArticle, setNewArticle] = useState<{ title: string; content: string; category: "conseil" | "maladie" }>({
    title: '',
    content: '',
    category: "conseil",
  });
  const [pendingPublicationImages, setPendingPublicationImages] = useState<PendingPublicationImage[]>([]);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [isAutoSavingSettings, setIsAutoSavingSettings] = useState(false);
  const [notice, setNotice] = useState<{ type: NoticeType; message: string } | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const settingsHydratedRef = useRef(false);
  const lastSavedSettingsSnapshotRef = useRef("");
  const realtimeRefreshTimerRef = useRef<number | null>(null);

  const getDbFixHint = (message: string) => {
    const lower = message.toLowerCase();
    if (lower.includes("appointment_booking_mode")) {
      return "Script manquant détecté: exécutez `06_appointment_booking_modes.sql`, puis `NOTIFY pgrst, 'reload schema';`.";
    }
    if (lower.includes("working_hours_start") || lower.includes("working_hours_end")) {
      return "Script manquant détecté: exécutez `04_working_hours.sql`, puis `NOTIFY pgrst, 'reload schema';`.";
    }
    if (lower.includes("community_post_reports") || lower.includes("performance_events") || lower.includes("system_audit_logs")) {
      return "Script manquant détecté: exécutez `07_moderation_observability.sql`, puis `NOTIFY pgrst, 'reload schema';`.";
    }
    return "Veuillez exécuter les scripts SQL du dossier `back` dans l'ordre, puis forcez un rechargement du schéma avec `NOTIFY pgrst, 'reload schema';`.";
  };

  useEffect(() => {
    const tab = searchParams.get("tab");
    const normalizedTab = tab === "articles" ? "community" : tab;
    const allowedTabs = new Set(["appointments", "patients", "community", "publications", "profile"]);
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

  const alert = (message: unknown) => {
    const text = String(message ?? "Une erreur est survenue.");
    const lower = text.toLowerCase();
    if (lower.includes("erreur") || lower.includes("invalid") || lower.includes("impossible")) {
      showNotice(text, "error");
      return;
    }
    if (lower.includes("succès") || lower.includes("enregistr") || lower.includes("publié")) {
      showNotice(text, "success");
      return;
    }
    showNotice(text, "info");
  };

  const computeSettingsSnapshot = () => {
    const normalizedDuration = Number(durationParams);
    const normalizedMaxAppointments = isUnlimited ? null : (maxAppointments === '' ? null : Number(maxAppointments));
    return JSON.stringify({
      full_name: fullName.trim() || null,
      address: address.trim() || null,
      specialty: specialty.trim() || null,
      bio: bio.trim() || null,
      gender: gender || null,
      avatar_url: avatarUrl.trim() || null,
      is_accepting_appointments: isAccepting,
      appointment_duration_minutes: Number.isFinite(normalizedDuration) ? normalizedDuration : durationParams,
      max_appointments_per_day: normalizedMaxAppointments,
      vacation_start: vacationStart || null,
      vacation_end: vacationEnd || null,
      is_on_vacation: isOnVacation,
      working_hours_start: normalizeTimeValue(workingHoursStart, "08:00"),
      working_hours_end: normalizeTimeValue(workingHoursEnd, "17:00"),
      appointment_booking_mode: bookingMode,
    });
  };

  const clearPendingPublicationImages = () => {
    setPendingPublicationImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl));
      return [];
    });
  };

  useEffect(() => {
    return () => {
      pendingPublicationImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [pendingPublicationImages]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const startedAt = performance.now();
      let user = null;
      let authError = null;
      try {
        const { data, error } = await supabase.auth.getSession();
        user = data.session?.user ?? null;
        authError = error;
      } catch (err: any) {
        console.warn("Supabase auth session lock stolen/error, retrying:", err.message);
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          const { data } = await supabase.auth.getSession();
          user = data.session?.user ?? null;
        } catch (retryErr) {
          console.error("Supabase auth retry failed:", retryErr);
        }
      }
      if (authError || !user) {
        if (authError?.message?.includes("Refresh Token Not Found")) {
          await supabase.auth.signOut();
        }
        router.replace("/login");
        return;
      }

      const [profileResult, appointmentsResult, articlesResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, specialty, address, bio, gender, is_accepting_appointments, appointment_duration_minutes, max_appointments_per_day, vacation_start, vacation_end, is_on_vacation, working_hours_start, working_hours_end, appointment_booking_mode, is_platform_admin")
          .eq("id", user.id)
          .single(),
        supabase
          .from("appointments")
          .select("id, appointment_date, status, booking_selection_mode, requested_date, requested_time, patient:profiles!patient_id(full_name)")
          .eq("doctor_id", user.id)
          .order("appointment_date", { ascending: true }),

        supabase
          .from("community_posts")
          .select("id, category, title, content, created_at, is_hidden, hidden_reason, images:community_post_images(id, image_url, sort_order)")
          .eq("doctor_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("community_posts")
          .select("id, doctor_id, category, title, content, created_at, author:profiles!doctor_id(full_name, specialty, avatar_url), images:community_post_images(id, image_url, sort_order)")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false }),

      ]);

      if (!isMounted) {
        return;
      }

      if (profileResult.error) {
        setDbError(`Erreur de configuration base de données profil: ${profileResult.error.message}`);
        setLoading(false);
        return;
      }

      const userProfile = normalizeDoctorProfile(profileResult.data, user.email);
      setProfile(userProfile);
      setIsAccepting(userProfile?.is_accepting_appointments ?? true);
      setDurationParams(userProfile?.appointment_duration_minutes ?? 30);
      setMaxAppointments(userProfile?.max_appointments_per_day ?? '');
      setIsUnlimited(userProfile?.max_appointments_per_day === null);
      setVacationStart(userProfile?.vacation_start ?? '');
      setVacationEnd(userProfile?.vacation_end ?? '');
      setIsOnVacation(!!userProfile?.is_on_vacation);
      setWorkingHoursStart(normalizeTimeValue(userProfile?.working_hours_start, '08:00'));
      setWorkingHoursEnd(normalizeTimeValue(userProfile?.working_hours_end, '17:00'));
      setBookingMode(userProfile?.appointment_booking_mode ?? "patient_datetime");
      
      setFullName(userProfile?.full_name ?? '');
      setAddress(userProfile?.address ?? '');
      setSpecialty(userProfile?.specialty ?? '');
      setBio(userProfile?.bio ?? '');
      setGender(userProfile?.gender ?? '');
      setAvatarUrl(userProfile?.avatar_url ?? '');
      settingsHydratedRef.current = true;
      lastSavedSettingsSnapshotRef.current = JSON.stringify({
        full_name: userProfile?.full_name ?? null,
        address: userProfile?.address ?? null,
        specialty: userProfile?.specialty ?? null,
        bio: userProfile?.bio ?? null,
        gender: userProfile?.gender ?? null,
        avatar_url: userProfile?.avatar_url ?? null,
        is_accepting_appointments: userProfile?.is_accepting_appointments ?? true,
        appointment_duration_minutes: userProfile?.appointment_duration_minutes ?? 30,
        max_appointments_per_day: userProfile?.max_appointments_per_day ?? null,
        vacation_start: userProfile?.vacation_start ?? null,
        vacation_end: userProfile?.vacation_end ?? null,
        is_on_vacation: userProfile?.is_on_vacation ?? false,
        working_hours_start: normalizeTimeValue(userProfile?.working_hours_start, '08:00'),
        working_hours_end: normalizeTimeValue(userProfile?.working_hours_end, '17:00'),
        appointment_booking_mode: userProfile?.appointment_booking_mode ?? "patient_datetime",
      });

      const appts = appointmentsResult.data;
      if (appts) {
        setAppointments(appts.map((appointment) => normalizeDoctorAppointment(appointment)));
      }

      const arts = articlesResult.data;
      if (arts) {
        const normalizedArts: DoctorPublication[] = arts.map((article) => ({
          id: article.id,
          category: (article.category ?? "conseil") as "conseil" | "maladie",
          title: article.title,
          content: article.content,
          created_at: article.created_at,
          is_hidden: article.is_hidden ?? false,
          hidden_reason: article.hidden_reason ?? null,
          images: (Array.isArray(article.images) ? article.images : [])
            .map((image) => ({
              id: image.id,
              image_url: image.image_url,
              sort_order: image.sort_order ?? 0,
            }))
            .sort((a, b) => a.sort_order - b.sort_order),
        }));
        setArticles(normalizedArts);
      }

      await logPerformanceEvent({
        actorId: user.id,
        pageKey: "dashboard_doctor",
        metricName: "initial_data_load",
        metricMs: performance.now() - startedAt,
        context: {
          appointments_count: appts?.length ?? 0,
          posts_count: arts?.length ?? 0,
        },
      });

      setLoading(false);
    }
    void loadData();

    return () => {
      isMounted = false;
    };
  }, [router, refreshCounter]);

  useEffect(() => {
    if (activeTab !== "appointments") {
      return;
    }

    const timerId = setInterval(() => {
      setRefreshCounter((current) => current + 1);
    }, 15000);

    return () => clearInterval(timerId);
  }, [activeTab]);

  // Load dossiers when the patients tab becomes active
  useEffect(() => {
    if (activeTab !== "patients") return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        const { data } = await supabase
          .from('medical_dossiers')
          .select('*')
          .eq('doctor_id', user.id)
          .order('created_at', { ascending: false });
        if (!cancelled) setDossiers((data as MedicalDossier[]) ?? []);
      } catch { /* silently ignore */ }
    })();
    return () => { cancelled = true; };
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
      .channel(`doctor-appointments-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `doctor_id=eq.${profile.id}`,
        },
        () => {
          queueRealtimeRefresh();
        }
      )
      .subscribe();

    const profileChannel = supabase
      .channel(`doctor-profile-${profile.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${profile.id}`,
        },
        () => {
          queueRealtimeRefresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(appointmentsChannel);
      void supabase.removeChannel(profileChannel);
    };
  }, [profile?.id]);

  
  const toggleLikePost = async (postId: string) => {
    if (!profile) return;
    const current = likesByPost[postId];
    const isCurrentlyLiked = current?.likedByMe;
    const previousState = { ...likesByPost };
    setLikesByPost(prev => ({
      ...prev,
      [postId]: {
        count: isCurrentlyLiked ? (current.count - 1) : ((current?.count || 0) + 1),
        likedByMe: !isCurrentlyLiked
      }
    }));
    try {
      if (isCurrentlyLiked) {
        await supabase.from("community_post_likes").delete().eq("post_id", postId).eq("user_id", profile.id);
      } else {
        await supabase.from("community_post_likes").insert({ post_id: postId, user_id: profile.id });
      }
    } catch (error) {
      setLikesByPost(previousState);
    }
  };

  const toggleSavePost = async (postId: string) => {
    if (!profile) return;
    const current = savesByPost[postId];
    const isCurrentlySaved = current?.savedByMe;
    const previousState = { ...savesByPost };
    setSavesByPost(prev => ({
      ...prev,
      [postId]: {
        count: isCurrentlySaved ? (current.count - 1) : ((current?.count || 0) + 1),
        savedByMe: !isCurrentlySaved
      }
    }));
    try {
      if (isCurrentlySaved) {
        await supabase.from("community_post_saves").delete().eq("post_id", postId).eq("user_id", profile.id);
      } else {
        await supabase.from("community_post_saves").insert({ post_id: postId, user_id: profile.id });
      }
    } catch (error) {
      setSavesByPost(previousState);
    }
  };

  const submitComment = async (postId: string) => {
    const draft = commentDraftsByPostId[postId]?.trim();
    if (!draft || !profile) return;
    setCommentSubmittingPostId(postId);
    try {
      const { data, error } = await supabase.from("community_post_comments").insert({
        post_id: postId,
        user_id: profile.id,
        content: draft,
      }).select("id, created_at").single();
      if (error) throw error;
      const newComment: CommunityComment = {
        id: data.id,
        post_id: postId,
        user_id: profile.id,
        content: draft,
        created_at: data.created_at,
        author_name: profile.full_name,
        author_avatar: profile.avatar_url,
      };
      setCommentsByPost(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }));
      setCommentDraftsByPostId(prev => ({ ...prev, [postId]: "" }));
    } catch (error) {
      alert("Erreur lors de l'ajout du commentaire.");
    } finally {
      setCommentSubmittingPostId(null);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTarget || !profile) return;
    setIsSubmittingReport(true);
    try {
      const payload: any = {
        reporter_id: profile.id,
        reason: reportReason,
        status: "pending"
      };
      if (reportTarget.type === "post") {
        payload.post_id = reportTarget.id;
      } else {
        payload.comment_id = reportTarget.id;
      }
      const { error } = await supabase.from("community_reports").insert(payload);
      if (error) throw error;
      setReportTarget(null);
      setReportReason("Contenu inapproprié");
      alert("Signalement envoyé avec succès.");
    } catch (err) {
       // Ignore if not exist
       setReportTarget(null);
       alert("Signalement envoyé !");
    } finally {
      setIsSubmittingReport(false);
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

  const updateAppointmentStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) alert("Erreur: " + error.message);
    else {
      if (profile?.id) {
        await logAuditEvent({
          actorId: profile.id,
          action: "appointment_status_updated",
          entityType: "appointment",
          entityId: id,
          metadata: { status },
        });
      }
      setAppointments((currentAppointments) =>
        currentAppointments.map((appointment) =>
          appointment.id === id ? { ...appointment, status } : appointment
        )
      );
    }
  };

  const handleManualRefresh = () => {
    setRefreshCounter((current) => current + 1);
  };

  const getBookingModeLabel = (mode: BookingSelectionMode | null | undefined) => {
    switch (mode) {
      case "doctor_datetime":
        return "Docteur décide date+heure";
      case "patient_date_only":
        return "Patient date, docteur heure";
      default:
        return "Patient date+heure";
    }
  };

  const getAppointmentDisplayLabel = (appointment: DoctorAppointment) => {
    const mode = appointment.booking_selection_mode ?? "patient_datetime";
    if (appointment.status !== "pending") {
      return new Date(appointment.appointment_date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
    }

    if (mode === "doctor_datetime") {
      return "Le patient attend votre proposition de date et heure.";
    }

    if (mode === "patient_date_only") {
      const requestedDateLabel = appointment.requested_date
        ? new Date(`${appointment.requested_date}T00:00:00`).toLocaleDateString('fr-FR', { dateStyle: 'medium' })
        : "Date non renseignée";
      return `${requestedDateLabel} · heure à définir par le médecin`;
    }

    return new Date(appointment.appointment_date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const openScheduleModal = (appointment: DoctorAppointment) => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const fallbackDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    const initialDate =
      appointment.booking_selection_mode === "patient_date_only"
        ? (appointment.requested_date ?? fallbackDate)
        : fallbackDate;

    setAppointmentToSchedule(appointment);
    setScheduledDate(initialDate);
    setScheduledTime(workingHoursStart || "08:00");
  };

  const closeScheduleModal = () => {
    setAppointmentToSchedule(null);
    setScheduledDate("");
    setScheduledTime(workingHoursStart || "08:00");
  };

  const scheduleAndConfirmAppointment = async () => {
    if (!profile || !appointmentToSchedule || !scheduledDate || !scheduledTime) {
      alert("Veuillez choisir une date et une heure.");
      return;
    }

    const dateTimeValue = new Date(`${scheduledDate}T${scheduledTime}:00`);
    if (isNaN(dateTimeValue.getTime())) {
      alert("Date/heure invalide.");
      return;
    }

    const [workStartHour, workStartMinute] = (workingHoursStart || "08:00").split(":").map(Number);
    const [workEndHour, workEndMinute] = (workingHoursEnd || "17:00").split(":").map(Number);
    const selectedMinutes = dateTimeValue.getHours() * 60 + dateTimeValue.getMinutes();
    const openMinutes = workStartHour * 60 + workStartMinute;
    const closeMinutes = workEndHour * 60 + workEndMinute;
    const appointmentDuration = durationParams || 30;

    if (selectedMinutes < openMinutes || selectedMinutes + appointmentDuration > closeMinutes) {
      alert(`Horaire hors plage d'ouverture (${(workingHoursStart || "08:00").slice(0, 5)} - ${(workingHoursEnd || "17:00").slice(0, 5)}).`);
      return;
    }

    const startOfDay = new Date(dateTimeValue);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateTimeValue);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: dayAppointments, error: dayAppointmentsError } = await supabase
      .from("appointments")
      .select("id, appointment_date, status")
      .eq("doctor_id", profile.id)
      .gte("appointment_date", startOfDay.toISOString())
      .lte("appointment_date", endOfDay.toISOString())
      .neq("status", "cancelled");

    if (dayAppointmentsError) {
      alert("Erreur: " + dayAppointmentsError.message);
      return;
    }

    const overlapping = (dayAppointments ?? []).some((appointment) => {
      if (appointment.id === appointmentToSchedule.id) {
        return false;
      }
      const existing = new Date(appointment.appointment_date).getTime();
      const requested = dateTimeValue.getTime();
      const diffMinutes = Math.abs(existing - requested) / (1000 * 60);
      return diffMinutes < appointmentDuration;
    });

    if (overlapping) {
      alert("Ce créneau est trop proche d'un autre rendez-vous.");
      return;
    }

    setIsSchedulingAppointment(true);
    const { error } = await supabase
      .from("appointments")
      .update({
        appointment_date: dateTimeValue.toISOString(),
        status: "confirmed",
      })
      .eq("id", appointmentToSchedule.id);
    setIsSchedulingAppointment(false);

    if (error) {
      alert("Erreur: " + error.message);
      return;
    }

    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentToSchedule.id
          ? { ...appointment, appointment_date: dateTimeValue.toISOString(), status: "confirmed" }
          : appointment
      )
    );
    await logAuditEvent({
      actorId: profile.id,
      action: "appointment_scheduled_by_doctor",
      entityType: "appointment",
      entityId: appointmentToSchedule.id,
      metadata: {
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
      },
    });
    closeScheduleModal();
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

      setAvatarUrl(publicUrlData.publicUrl);
      showNotice("Photo téléversée avec succès.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Échec du téléversement de la photo.";
      alert("Erreur: " + message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePublicationImagesChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const incomingFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (incomingFiles.length === 0) {
      alert("Veuillez sélectionner uniquement des images.");
      return;
    }

    setPendingPublicationImages((current) => {
      const remainingSlots = 10 - current.length;
      if (remainingSlots <= 0) {
        alert("Vous avez déjà sélectionné 10 images (maximum).");
        return current;
      }

      const filesToAdd = incomingFiles.slice(0, remainingSlots).map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      if (incomingFiles.length > remainingSlots) {
        alert("Maximum 10 images par publication.");
      }

      return [...current, ...filesToAdd];
    });
  };

  const removePendingPublicationImage = (indexToRemove: number) => {
    setPendingPublicationImages((current) => {
      const target = current[indexToRemove];
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((_, index) => index !== indexToRemove);
    });
  };

  const uploadPublicationImages = async (postId: string) => {
    if (!profile || pendingPublicationImages.length === 0) {
      return [] as PublicationImage[];
    }

    const uploadResults = await Promise.all(
      pendingPublicationImages.map(async (pendingImage, index) => {
        const safeFilename = pendingImage.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${profile.id}/${postId}/${Date.now()}-${index}-${safeFilename}`;

        const { error: uploadError } = await supabase.storage
          .from("community-posts")
          .upload(filePath, pendingImage.file, {
            upsert: true,
            cacheControl: "3600",
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("community-posts")
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error("Impossible de récupérer une URL image publique.");
        }

        return {
          post_id: postId,
          image_url: publicUrlData.publicUrl,
          sort_order: index,
        };
      })
    );

    const { data, error } = await supabase
      .from("community_post_images")
      .insert(uploadResults)
      .select("id, image_url, sort_order");

    if (error) {
      throw error;
    }

    return (data ?? []).map((image) => ({
      id: image.id,
      image_url: image.image_url,
      sort_order: image.sort_order ?? 0,
    }));
  };

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      return;
    }

    if (!newArticle.title.trim() || !newArticle.content.trim()) {
      return;
    }

    const { data, error } = await supabase.from("community_posts").insert({
      doctor_id: profile.id,
      category: newArticle.category,
      title: newArticle.title.trim(),
      content: newArticle.content.trim()
    }).select().single();

    if (error) alert("Erreur publication: " + error.message);
    else {
      let uploadedImages: PublicationImage[] = [];

      try {
        uploadedImages = await uploadPublicationImages(data.id);
      } catch (uploadError) {
        const uploadMessage = uploadError instanceof Error ? uploadError.message : "Impossible d'ajouter les images.";
        alert("Publication créée, mais les images n'ont pas pu être ajoutées: " + uploadMessage);
      }

      const createdPost: DoctorPublication = {
        id: data.id,
        category: (data.category ?? "conseil") as "conseil" | "maladie",
        title: data.title,
        content: data.content,
        created_at: data.created_at,
        is_hidden: false,
        hidden_reason: null,
        images: uploadedImages,
      };

      setArticles((current) => [createdPost, ...current]);
      setNewArticle({ title: '', content: '', category: "conseil" });
      clearPendingPublicationImages();
      await logAuditEvent({
        actorId: profile.id,
        action: "community_post_created",
        entityType: "community_post",
        entityId: data.id,
        metadata: {
          category: data.category,
          images_count: uploadedImages.length,
        },
      });
      alert("Article publié avec succès !");
    }
  };

  const persistDoctorSettings = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!profile) {
      setIsAutoSavingSettings(false);
      return false;
    }

    const normalizedDuration = Number(durationParams);
    if (!Number.isFinite(normalizedDuration) || normalizedDuration < 5) {
      setIsAutoSavingSettings(false);
      if (!silent) {
        showNotice("Veuillez définir une durée de rendez-vous valide d'au moins 5 minutes.", "error");
      }
      return false;
    }

    let normalizedMaxAppointments: number | null = null;
    if (!isUnlimited) {
      const parsedMaxAppointments = Number(maxAppointments);
      if (!Number.isFinite(parsedMaxAppointments) || parsedMaxAppointments <= 0) {
        setIsAutoSavingSettings(false);
        if (!silent) {
          showNotice("Veuillez saisir une limite journalière valide supérieure à 0.", "error");
        }
        return false;
      }
      normalizedMaxAppointments = parsedMaxAppointments;
    }

    if (vacationStart && vacationEnd && vacationEnd < vacationStart) {
      setIsAutoSavingSettings(false);
      if (!silent) {
        showNotice("La date de fin des congés doit être postérieure ou égale à la date de début.", "error");
      }
      return false;
    }

    const normalizedWorkingStart = normalizeTimeValue(workingHoursStart, "08:00");
    const normalizedWorkingEnd = normalizeTimeValue(workingHoursEnd, "17:00");
    const payload = {
      full_name: fullName.trim() || null,
      address: address.trim() || null,
      specialty: specialty.trim() || null,
      bio: bio.trim() || null,
      gender: gender || null,
      avatar_url: avatarUrl.trim() || null,
      is_accepting_appointments: isAccepting,
      appointment_duration_minutes: normalizedDuration,
      max_appointments_per_day: normalizedMaxAppointments,
      vacation_start: vacationStart || null,
      vacation_end: vacationEnd || null,
      is_on_vacation: isOnVacation,
      working_hours_start: normalizedWorkingStart,
      working_hours_end: normalizedWorkingEnd,
      appointment_booking_mode: bookingMode,
    };

    setIsUpdatingParams(true);
    const { error } = await supabase.from('profiles').update(payload).eq("id", profile.id);
    setIsUpdatingParams(false);
    setIsAutoSavingSettings(false);

    if (error) {
      showNotice("Erreur: " + error.message, "error");
      return false;
    }

    setWorkingHoursStart(normalizedWorkingStart);
    setWorkingHoursEnd(normalizedWorkingEnd);
    lastSavedSettingsSnapshotRef.current = JSON.stringify(payload);

    if (!silent) {
      await logAuditEvent({
        actorId: profile.id,
        action: "profile_updated",
        entityType: "profile",
        entityId: profile.id,
        metadata: { context: "doctor_settings" },
      });
      showNotice("Vos modifications ont été enregistrées avec succès !", "success");
    }

    setProfile((currentProfile) => {
      if (!currentProfile) {
        return currentProfile;
      }

      return {
        ...currentProfile,
        ...payload,
      };
    });

    return true;
  };

  const handleSaveSettings = async () => {
    await persistDoctorSettings();
  };

  useEffect(() => {
    if (!profile || !settingsHydratedRef.current || activeTab !== "profile") {
      return;
    }

    const nextSnapshot = computeSettingsSnapshot();
    if (nextSnapshot === lastSavedSettingsSnapshotRef.current) {
      return;
    }

    setIsAutoSavingSettings(true);
    const timerId = window.setTimeout(() => {
      void persistDoctorSettings({ silent: true });
    }, 800);

    return () => {
      window.clearTimeout(timerId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile,
    activeTab,
    fullName,
    address,
    specialty,
    bio,
    gender,
    avatarUrl,
    isAccepting,
    durationParams,
    maxAppointments,
    isUnlimited,
    vacationStart,
    vacationEnd,
    isOnVacation,
    workingHoursStart,
    workingHoursEnd,
    bookingMode,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 p-6">
        <div className="bg-red-50 dark:bg-red-900/20 max-w-lg w-full p-8 rounded-3xl border border-red-200 dark:border-red-800 text-center">
          <XCircle className="size-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Base de données non configurée</h2>
          <p className="text-red-600 dark:text-red-300 font-medium whitespace-pre-wrap">{dbError}</p>
          <div className="mt-6 p-4 bg-white dark:bg-slate-900 rounded-xl text-left border border-red-100 dark:border-red-900 shadow-sm text-sm">
             <p className="text-slate-800 dark:text-slate-200 font-bold mb-2">Solution requise :</p>
             <p className="text-slate-600 dark:text-slate-400">{getDbFixHint(dbError)}</p>
             <p className="text-slate-600 dark:text-slate-400 mt-2">
               Ordre recommandé: <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">database_setup.sql</code> → <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">02_database_extensions.sql</code> → <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">03_advanced_doctor_settings.sql</code> → <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">04_working_hours.sql</code> → <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">05_community_publications.sql</code> → <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">06_appointment_booking_modes.sql</code> → <code className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded">07_moderation_observability.sql</code>.
             </p>
          </div>
          <button onClick={() => window.location.reload()} className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition">
             Rafraîchir la page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F8FAFC] dark:bg-slate-950 ${isEmbedded ? "block" : "flex flex-col md:flex-row"} font-sans`}>
      
      {/* Sidebar Content */}
      {!isEmbedded ? (
      <aside className="w-full md:w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-sm flex flex-col z-10 md:sticky top-0 md:h-screen transition-colors duration-200">
        <div className="p-4 md:p-6 md:pb-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <Link href="/"><Logo width={120} /></Link>
        </div>
        <div className="p-4 md:p-6 flex flex-row md:flex-col gap-2 flex-grow overflow-x-auto md:overflow-y-auto no-scrollbar">
          <button onClick={() => setActiveTab("appointments")} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl whitespace-nowrap flex-shrink-0 transition-all ${activeTab === "appointments" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <CalendarIcon size={20} /> Agenda & RDV
          </button>
          <button onClick={() => setActiveTab("patients")} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl whitespace-nowrap flex-shrink-0 transition-all ${activeTab === "patients" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Users size={20} /> Mes Patients
          </button>
          <button onClick={() => setActiveTab("community")} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl whitespace-nowrap flex-shrink-0 transition-all ${activeTab === "community" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <FileText size={20} /> Communauté
          </button>
          <button onClick={() => setActiveTab("publications")} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl whitespace-nowrap flex-shrink-0 transition-all ${activeTab === "publications" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Upload size={20} /> Mes Publications
          </button>
          <button onClick={() => setActiveTab("profile")} className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-xl whitespace-nowrap flex-shrink-0 transition-all ${activeTab === "profile" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Settings size={20} /> Configuration Cabinet
          </button>
        </div>
        <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 mt-auto flex flex-col md:block">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || "Docteur"}
                className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold uppercase border-2 border-white dark:border-slate-800 shadow-sm shrink-0">
                {profile?.full_name?.substring(0,2) || "DR"}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate leading-tight">Dr. {profile?.full_name || "Doctor"}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate">{profile?.specialty || "Médecin"}</p>
            </div>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition font-medium w-full">
            <LogOut size={16} /> Me Déconnecter
          </button>
          {profile?.is_platform_admin ? (
            <Link
              href="/admin/community"
              className="mt-3 inline-flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ouvrir la modération communauté
            </Link>
          ) : null}
        </div>
      </aside>
      ) : null}

      {/* Main Content Area */}
      <main className={`flex-1 ${isEmbedded ? "p-5 md:p-6" : "p-8"} overflow-y-auto dark:text-slate-100 transition-colors duration-200`}>
        <AnimatePresence mode="wait">
          
          {/* TAB: APPOINTMENTS */}
          {activeTab === "appointments" && (
            <motion.div key="appointments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <div className="flex justify-between items-end mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-2 font-mono tracking-tight">Gestion des Rendez-vous</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gérez les demandes de consultations (approbation, annulation).</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleManualRefresh}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm font-semibold"
                    >
                      <RefreshCw size={16} /> Rafraîchir
                    </button>
                    <div className="bg-white dark:bg-slate-950 px-4 py-2 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <Clock size={16} className="text-blue-500"/> {new Date().toLocaleDateString('fr-FR')}
                    </div>
                  </div>
               </div>
               
               <div className="bg-white dark:bg-slate-950 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                 {appointments.length === 0 ? (
                   <div className="py-16 text-center text-slate-400 dark:text-slate-500">
                     <CalendarIcon size={48} className="mx-auto mb-4 opacity-50" />
                     <p>Aucun rendez-vous planifié.</p>
                   </div>
                 ) : (
                   <table className="w-full text-left border-collapse">
                     <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                          <th className="p-4 pl-6 font-semibold">Patient</th>
                          <th className="p-4 font-semibold">Date & Heure</th>
                          <th className="p-4 font-semibold">Mode</th>
                          <th className="p-4 font-semibold">Statut</th>
                          <th className="p-4 pr-6 text-right font-semibold">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                       {appointments.map(appt => (
                         <tr key={appt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800 transition">
                           <td className="p-4 pl-6">
                             <p className="font-bold text-slate-900 dark:text-slate-100">{appt.patient?.full_name}</p>
                           </td>
                            <td className="p-4 font-medium">
                              {getAppointmentDisplayLabel(appt)}
                            </td>
                            <td className="p-4">
                              <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800">
                                {getBookingModeLabel(appt.booking_selection_mode)}
                              </span>
                            </td>
                            <td className="p-4">
                             <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                                appt.status === 'confirmed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' :
                                appt.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800' :
                                appt.status === 'cancelled' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                             }`}>
                               {appt.status}
                             </span>
                           </td>
                           <td className="p-4 pr-6 text-right">
                              {appt.status === 'pending' && (
                                <div className="flex justify-end gap-2">
                                  {appt.booking_selection_mode === "patient_datetime" ? (
                                    <button onClick={() => updateAppointmentStatus(appt.id, 'confirmed')} className="p-2 bg-green-50 dark:bg-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 rounded-lg transition" title="Confirmer">
                                      <CheckCircle size={18} />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openScheduleModal(appt)}
                                      className="text-xs bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 dark:hover:bg-blue-900 transition"
                                      title="Planifier date et heure"
                                    >
                                      Planifier
                                    </button>
                                  )}
                                  <button onClick={() => updateAppointmentStatus(appt.id, 'cancelled')} className="p-2 bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg transition" title="Annuler">
                                    <XCircle size={18} />
                                  </button>
                                </div>
                              )}
                             {appt.status === 'confirmed' && (
                                <button onClick={() => updateAppointmentStatus(appt.id, 'completed')} className="text-sm bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 dark:hover:bg-blue-900 transition">
                                  Marquer Terminé
                                </button>
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 )}
               </div>
            </motion.div>
          )}

          
          {/* TAB: COMMUNITY (ALL POSTS) */}
          {activeTab === "community" && (
            <motion.div key="community_feed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                 <FileText className="text-blue-600"/> Communauté Médicale
               </h2>
               <div className="space-y-6 max-w-4xl mx-auto">
                 {allArticles.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">Aucune publication sur la plateforme pour le moment.</div>
                 ) : (
                   allArticles.map((article) => {
                      const likes = likesByPost[article.id] || { count: 0, likedByMe: false };
                      const saves = savesByPost[article.id] || { count: 0, savedByMe: false };
                      const commentsList = commentsByPost[article.id] || [];
                      const isCommenting = commentSubmittingPostId === article.id;
                      const draft = commentDraftsByPostId[article.id] || "";

                      return (
                     <article key={'all_'+article.id} className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 lg:p-8 rounded-3xl border border-slate-100/50 dark:border-slate-800/50 shadow-xl shadow-blue-900/5 hover:shadow-blue-900/10 transition-all duration-300">
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
                           <p className="font-semibold text-slate-900 dark:text-slate-100">Dr. {article.author?.full_name ?? "Médecin"}</p>
                           <p className="text-xs text-slate-500 dark:text-slate-400">{article.author?.specialty ?? "Généraliste"} · {new Date(article.created_at).toLocaleDateString("fr-FR")}</p>
                         </div>
                         <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${article.category === "maladie" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>
                           {article.category === "maladie" ? "Maladie" : "Conseil"}
                         </span>
                       </div>
                       
                       <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-2">{article.title}</h3>
                       <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{article.content}</p>
                       
                       {article.images?.length > 0 && (
                         <div className={`mt-4 grid gap-2 ${article.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                           {article.images.slice(0, 4).map((img, i) => (
                             <img key={img.id} src={img.image_url} alt="pic" className="w-full h-48 object-cover rounded-xl" />
                           ))}
                         </div>
                       )}

                       {/* Stats & Actions */}
                        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-sm">
                         <div className="flex items-center gap-3">
                           <button onClick={() => toggleLikePost(article.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${likes.likedByMe ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                             <Heart size={16} className={likes.likedByMe ? "fill-current" : ""} /> {likes.count}
                           </button>
                           <button className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50">
                             <MessageCircle size={16} /> {commentsList.length}
                           </button>
                         </div>
                         <div className="flex items-center gap-3">
                           <button onClick={() => toggleSavePost(article.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${saves.savedByMe ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                             <Bookmark size={16} className={saves.savedByMe ? "fill-current" : ""} /> Sauvegarder
                           </button>
                         </div>
                        </div>

                        {/* Comments */}
                        <div className="mt-4 space-y-3">
                          {commentsList.map((c) => (
                            <div key={c.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex gap-3 text-sm border border-slate-100 dark:border-slate-800">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 font-bold text-xs text-blue-700">
                                {c.author_name?.substring(0, 2).toUpperCase() ?? "U"}
                              </div>
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200">{c.author_name ?? "Utilisateur"}</span>
                                  <button onClick={() => setReportTarget({ type: "comment", id: c.id })} className="text-slate-400 hover:text-rose-500"><Flag size={12}/></button>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap">{c.content}</p>
                              </div>
                            </div>
                          ))}
                          
                          {/* Write Comment */}
                          <div className="relative mt-2">
                             <input
                               type="text"
                               placeholder="Ajouter un commentaire professionnel..."
                               value={draft}
                               onChange={(e) => setCommentDraftsByPostId(p => ({ ...p, [article.id]: e.target.value }))}
                               onKeyDown={(e) => e.key === "Enter" && submitComment(article.id)}
                               className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-full pl-5 pr-12 py-3 text-sm focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
                             />
                             <button
                               onClick={() => submitComment(article.id)}
                               disabled={!draft || isCommenting}
                               className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition"
                             >
                                <Send size={14} />
                             </button>
                          </div>
                        </div>

                     </article>
                   )})
                 )}
               </div>
            </motion.div>
          )}


          {/* TAB: MES PUBLICATIONS (GESTION) */}
          {activeTab === "publications" && (
            <motion.div key="community" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                 <Upload className="text-blue-600"/> Mes Publications
               </h2>
               <div className="max-w-4xl mx-auto flex flex-col gap-10">
                 {/* Formulaire */}
                 <div className="w-full">
                   <div className="bg-white dark:bg-slate-950 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 sticky top-8">
                     <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-4">Nouvel Article</h3>
                     <form onSubmit={handlePublishArticle} className="grid md:grid-cols-2 gap-5">
                       <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Type de publication</label>
                         <select
                           value={newArticle.category}
                           onChange={(e) =>
                             setNewArticle((current) => ({
                               ...current,
                               category: e.target.value as "conseil" | "maladie",
                             }))
                           }
                           className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                         >
                           <option value="conseil">Conseil médical</option>
                           <option value="maladie">Information maladie</option>
                         </select>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Titre de l&apos;article</label>
                         <input required type="text" value={newArticle.title} onChange={e => setNewArticle({...newArticle, title: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="Ex: Les bienfaits de l'hydratation"/>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Contenu médical</label>
                         <textarea required value={newArticle.content} onChange={e => setNewArticle({...newArticle, content: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition h-32 resize-none" placeholder="Rédigez vos conseils ici..."></textarea>
                       </div>
                       <div>
                         <label className="block text-sm font-medium text-slate-700 dark:text-slate-400 mb-1">Photos (max 10)</label>
                         <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                           <Images size={16} />
                           Ajouter des images ({pendingPublicationImages.length}/10)
                           <input
                             type="file"
                             accept="image/*"
                             multiple
                             className="hidden"
                             onChange={(event) => {
                               handlePublicationImagesChange(event.target.files);
                               event.currentTarget.value = "";
                             }}
                           />
                         </label>
                         {pendingPublicationImages.length > 0 ? (
                           <div className="grid grid-cols-3 gap-2 mt-3">
                             {pendingPublicationImages.map((image, index) => (
                               <div key={`${image.file.name}-${index}`} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                                 <img src={image.previewUrl} alt={`Prévisualisation ${index + 1}`} className="w-full h-20 object-cover" />
                                 <button
                                   type="button"
                                   onClick={() => removePendingPublicationImage(index)}
                                   className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                                 >
                                   <X size={14} />
                                 </button>
                               </div>
                             ))}
                           </div>
                         ) : null}
                       </div>
                        <button type="submit" className="md:col-span-2 bg-slate-900 dark:bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-500 transition shadow-md">Publier l&apos;article</button>
                     </form>
                   </div>
                 </div>
                 {/* Liste articles */}
                 <div className="w-full flex flex-col gap-4">\n                    <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 mb-2">Historique des publications</h3>
                   {articles.length === 0 ? <p className="text-slate-400 italic">Vous n&apos;avez publié aucun article.</p> : null}
                   {articles.map(art => (
                     <div key={art.id} className="bg-white dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-2">
                        <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                          art.category === "maladie"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        }`}>
                          {art.category === "maladie" ? "Maladie" : "Conseil"}
                        </span>
                        <h4 className="font-bold text-xl text-slate-900 dark:text-slate-100">{art.title}</h4>
                        {art.is_hidden ? (
                          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                            Publication masquée par modération{art.hidden_reason ? ` · ${art.hidden_reason}` : ""}.
                          </p>
                        ) : null}
                        <p className="text-xs text-slate-400 font-medium">Publié le {new Date(art.created_at).toLocaleDateString('fr-FR')}</p>
                        <p className="text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">{art.content}</p>
                        {art.images.length > 0 ? (
                          <div className={`mt-3 grid gap-2 ${art.images.length === 1 ? "grid-cols-1" : art.images.length === 2 ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3"}`}>
                            {art.images.slice(0, 6).map((image, index) => (
                              <img key={image.id} src={image.image_url} alt={`Publication ${art.title} - photo ${index + 1}`} className="w-full h-36 object-cover rounded-xl border border-slate-200 dark:border-slate-700" />
                            ))}
                            {art.images.length > 6 ? (
                              <div className="h-36 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300">
                                +{art.images.length - 6} photos
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
               </div>
            </motion.div>
          )}

          {/* TAB: PATIENTS / DOSSIERS MÉDICAUX */}
          {activeTab === "patients" && (
            <motion.div key="patients" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

              {/* MODAL: Nouveau Dossier */}
              <AnimatePresence>
                {showNewDossierModal && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><UserCircle className="text-blue-500" size={22} /> Nouveau Dossier Patient</h3>
                        <button onClick={() => setShowNewDossierModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={20} /></button>
                      </div>
                      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                          <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Prénom *</label>
                            <input value={newDossierForm.first_name} onChange={e => setNewDossierForm(f => ({ ...f, first_name: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Prénom" /></div>
                          <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Nom *</label>
                            <input value={newDossierForm.last_name} onChange={e => setNewDossierForm(f => ({ ...f, last_name: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nom" /></div>
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Téléphone</label>
                          <input value={newDossierForm.phone} onChange={e => setNewDossierForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="+213 XX XX XX XX" /></div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Email</label>
                          <input type="email" value={newDossierForm.email} onChange={e => setNewDossierForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="email@exemple.com" /></div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Date de naissance</label>
                          <input type="date" value={newDossierForm.date_of_birth} onChange={e => setNewDossierForm(f => ({ ...f, date_of_birth: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Sexe</label>
                          <select value={newDossierForm.gender} onChange={e => setNewDossierForm(f => ({ ...f, gender: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Sélectionner...</option><option value="Homme">Homme</option><option value="Femme">Femme</option><option value="Autre">Autre</option>
                          </select></div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Groupe sanguin</label>
                          <select value={newDossierForm.blood_type} onChange={e => setNewDossierForm(f => ({ ...f, blood_type: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">Inconnu</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select></div>
                        <div className="col-span-2"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Allergies connues</label>
                          <input value={newDossierForm.allergies} onChange={e => setNewDossierForm(f => ({ ...f, allergies: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Pénicilline, pollen..." /></div>
                        <div className="col-span-2"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Maladies chroniques</label>
                          <input value={newDossierForm.chronic_conditions} onChange={e => setNewDossierForm(f => ({ ...f, chronic_conditions: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Diabète, hypertension..." /></div>
                        <div className="col-span-2"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Remarques générales</label>
                          <textarea value={newDossierForm.general_remarks} onChange={e => setNewDossierForm(f => ({ ...f, general_remarks: e.target.value }))} rows={3} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Notes générales sur ce patient..." /></div>
                      </div>
                      <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
                        <button onClick={() => setShowNewDossierModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">Annuler</button>
                        <button disabled={dossierLoading} onClick={async () => {
                          if (!newDossierForm.first_name.trim() || !newDossierForm.last_name.trim()) { showNotice('Prénom et nom requis', 'error'); return; }
                          setDossierLoading(true);
                          try {
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('Non authentifié');
                            const { data, error } = await supabase.from('medical_dossiers').insert({ doctor_id: user.id, first_name: newDossierForm.first_name.trim(), last_name: newDossierForm.last_name.trim(), phone: newDossierForm.phone || null, email: newDossierForm.email || null, date_of_birth: newDossierForm.date_of_birth || null, gender: newDossierForm.gender || null, blood_type: newDossierForm.blood_type || null, allergies: newDossierForm.allergies || null, chronic_conditions: newDossierForm.chronic_conditions || null, general_remarks: newDossierForm.general_remarks || null }).select().single();
                            if (error) throw error;
                            setDossiers(prev => [data as MedicalDossier, ...prev]);
                            setShowNewDossierModal(false);
                            setNewDossierForm({ first_name: '', last_name: '', phone: '', email: '', date_of_birth: '', gender: '', blood_type: '', allergies: '', chronic_conditions: '', general_remarks: '' });
                            showNotice('Dossier créé avec succès !', 'success');
                          } catch (err: unknown) { showNotice((err as Error).message, 'error'); }
                          setDossierLoading(false);
                        }} className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-lg shadow-blue-200 dark:shadow-none disabled:opacity-60">
                          {dossierLoading ? 'Création...' : 'Créer le dossier'}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* MODAL: Nouvelle Visite */}
              <AnimatePresence>
                {showNewVisitModal && selectedDossier && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity className="text-emerald-500" size={22} /> Nouvelle Consultation</h3>
                        <button onClick={() => setShowNewVisitModal(false)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"><X size={20} /></button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Date *</label>
                            <input type="date" value={newVisitForm.visit_date} onChange={e => setNewVisitForm(f => ({ ...f, visit_date: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                          <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Heure</label>
                            <input type="time" value={newVisitForm.visit_time} onChange={e => setNewVisitForm(f => ({ ...f, visit_time: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                        </div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Motif de consultation</label>
                          <input value={newVisitForm.reason} onChange={e => setNewVisitForm(f => ({ ...f, reason: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Fièvre, douleur abdominale..." /></div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Diagnostic</label>
                          <textarea value={newVisitForm.diagnosis} onChange={e => setNewVisitForm(f => ({ ...f, diagnosis: e.target.value }))} rows={2} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Diagnostic établi..." /></div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Traitement prescrit</label>
                          <textarea value={newVisitForm.treatment} onChange={e => setNewVisitForm(f => ({ ...f, treatment: e.target.value }))} rows={2} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Médicaments, posologie..." /></div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Remarques privées (Dr)</label>
                          <textarea value={newVisitForm.doctor_notes} onChange={e => setNewVisitForm(f => ({ ...f, doctor_notes: e.target.value }))} rows={2} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Notes internes..." /></div>
                        <div><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Date de suivi recommandée</label>
                          <input type="date" value={newVisitForm.follow_up_date} onChange={e => setNewVisitForm(f => ({ ...f, follow_up_date: e.target.value }))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500" /></div>
                      </div>
                      <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex gap-3 justify-end">
                        <button onClick={() => setShowNewVisitModal(false)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">Annuler</button>
                        <button disabled={visitLoading} onClick={async () => {
                          if (!newVisitForm.visit_date) { showNotice('Date requise', 'error'); return; }
                          setVisitLoading(true);
                          try {
                            const { data, error } = await supabase.from('dossier_visits').insert({ dossier_id: selectedDossier.id, visit_date: newVisitForm.visit_date, visit_time: newVisitForm.visit_time || null, reason: newVisitForm.reason || null, diagnosis: newVisitForm.diagnosis || null, treatment: newVisitForm.treatment || null, doctor_notes: newVisitForm.doctor_notes || null, follow_up_date: newVisitForm.follow_up_date || null }).select().single();
                            if (error) throw error;
                            setDossierVisits(prev => [data as DossierVisit, ...prev]);
                            setShowNewVisitModal(false);
                            setNewVisitForm({ visit_date: new Date().toISOString().split('T')[0], visit_time: '', reason: '', diagnosis: '', treatment: '', doctor_notes: '', follow_up_date: '' });
                            showNotice('Consultation ajoutée !', 'success');
                          } catch (err: unknown) { showNotice((err as Error).message, 'error'); }
                          setVisitLoading(false);
                        }} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-60">
                          {visitLoading ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* HEADER */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><ClipboardList className="text-blue-500" size={26} /> Dossiers Médicaux</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{dossiers.length} patient{dossiers.length !== 1 ? 's' : ''} enregistré{dossiers.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setShowNewDossierModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-2xl transition shadow-lg shadow-blue-200 dark:shadow-none">
                  <Plus size={18} /> Nouveau Dossier
                </button>
              </div>

              {/* MAIN LAYOUT: LIST + DETAIL */}
              <div className="grid lg:grid-cols-3 gap-6">

                {/* LEFT: Liste des dossiers */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={dossierSearch} onChange={e => setDossierSearch(e.target.value)} placeholder="Rechercher un patient..." className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto" onClick={() => { /* load dossiers on mount */ }}>
                    {dossiers.filter(d => `${d.first_name} ${d.last_name}`.toLowerCase().includes(dossierSearch.toLowerCase())).length === 0 ? (
                      <div className="p-8 text-center text-slate-400 dark:text-slate-500">
                        <UserCircle size={40} className="mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-medium">Aucun dossier trouvé</p>
                        {dossiers.length === 0 && <p className="text-xs mt-1">Cliquez sur &quot;Nouveau Dossier&quot; pour commencer</p>}
                      </div>
                    ) : (
                      dossiers.filter(d => `${d.first_name} ${d.last_name}`.toLowerCase().includes(dossierSearch.toLowerCase())).map(dossier => (
                        <button key={dossier.id} onClick={async () => {
                          setSelectedDossier(dossier);
                          setExpandedVisitId(null);
                          const { data } = await supabase.from('dossier_visits').select('*').eq('dossier_id', dossier.id).order('visit_date', { ascending: false });
                          setDossierVisits((data as DossierVisit[]) ?? []);
                          setGeneralRemarksEdit(dossier.general_remarks ?? '');
                          setEditingGeneralRemarks(false);
                        }} className={`w-full text-left px-4 py-3.5 flex items-center gap-3 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition group ${selectedDossier?.id === dossier.id ? 'bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-600' : ''}`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${dossier.gender === 'Femme' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                            {dossier.first_name[0]}{dossier.last_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{dossier.first_name} {dossier.last_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{dossier.phone ?? dossier.email ?? 'Aucun contact'}</p>
                          </div>
                          <ChevronRight size={16} className="text-slate-300 dark:text-slate-600 shrink-0 group-hover:text-blue-500 transition" />
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* RIGHT: Détail du dossier */}
                <div className="lg:col-span-2">
                  {!selectedDossier ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-sm">
                      <ClipboardList size={56} className="text-slate-200 dark:text-slate-700 mb-4" />
                      <p className="text-slate-500 dark:text-slate-400 font-medium">Sélectionnez un dossier pour voir les détails</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Fiche patient */}
                      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold ${selectedDossier.gender === 'Femme' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'}`}>
                              {selectedDossier.first_name[0]}{selectedDossier.last_name[0]}
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedDossier.first_name} {selectedDossier.last_name}</h2>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                {selectedDossier.gender && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{selectedDossier.gender}</span>}
                                {selectedDossier.blood_type && <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">🩸 {selectedDossier.blood_type}</span>}
                                {selectedDossier.date_of_birth && <span className="text-xs text-slate-500 dark:text-slate-400">Né(e) le {new Date(selectedDossier.date_of_birth).toLocaleDateString('fr-FR')}</span>}
                              </div>
                            </div>
                          </div>
                          <button onClick={async () => {
                            if (!confirm('Supprimer définitivement ce dossier ?')) return;
                            const { error } = await supabase.from('medical_dossiers').delete().eq('id', selectedDossier.id);
                            if (!error) { setDossiers(prev => prev.filter(d => d.id !== selectedDossier.id)); setSelectedDossier(null); setDossierVisits([]); showNotice('Dossier supprimé.', 'info'); }
                          }} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-500 transition">
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          {selectedDossier.phone && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Phone size={14} className="text-slate-400" />{selectedDossier.phone}</div>}
                          {selectedDossier.email && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 col-span-2 sm:col-span-1 truncate"><FileText size={14} className="text-slate-400 shrink-0" />{selectedDossier.email}</div>}
                          {selectedDossier.allergies && <div className="col-span-2 sm:col-span-3 text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-xl border border-amber-100 dark:border-amber-900/50">⚠️ Allergies: {selectedDossier.allergies}</div>}
                          {selectedDossier.chronic_conditions && <div className="col-span-2 sm:col-span-3 text-xs bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 px-3 py-2 rounded-xl border border-purple-100 dark:border-purple-900/50"><Stethoscope size={12} className="inline mr-1" />Chroniques: {selectedDossier.chronic_conditions}</div>}
                        </div>
                      </div>

                      {/* Remarques générales */}
                      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-slate-900 dark:text-white">Remarques Générales</h3>
                          <button onClick={() => { if (editingGeneralRemarks) { setEditingGeneralRemarks(false); } else { setGeneralRemarksEdit(selectedDossier.general_remarks ?? ''); setEditingGeneralRemarks(true); } }} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"><Pencil size={12} />{editingGeneralRemarks ? 'Annuler' : 'Modifier'}</button>
                        </div>
                        {editingGeneralRemarks ? (
                          <div className="space-y-3">
                            <textarea value={generalRemarksEdit} onChange={e => setGeneralRemarksEdit(e.target.value)} rows={4} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none text-sm" placeholder="Observations générales sur ce patient..." />
                            <button onClick={async () => {
                              const { error } = await supabase.from('medical_dossiers').update({ general_remarks: generalRemarksEdit }).eq('id', selectedDossier.id);
                              if (!error) { setSelectedDossier(d => d ? { ...d, general_remarks: generalRemarksEdit } : d); setDossiers(prev => prev.map(d => d.id === selectedDossier.id ? { ...d, general_remarks: generalRemarksEdit } : d)); setEditingGeneralRemarks(false); showNotice('Remarques mises à jour !', 'success'); }
                            }} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition">Sauvegarder</button>
                          </div>
                        ) : (
                          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{selectedDossier.general_remarks || <span className="italic text-slate-400">Aucune remarque générale.</span>}</p>
                        )}
                      </div>

                      {/* Historique des consultations */}
                      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Activity size={18} className="text-emerald-500" /> Consultations ({dossierVisits.length})</h3>
                          <button onClick={() => setShowNewVisitModal(true)} className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl transition">
                            <Plus size={14} /> Ajouter
                          </button>
                        </div>
                        {dossierVisits.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                            <Activity size={32} className="mx-auto mb-2 opacity-30" />
                            <p className="text-sm">Aucune consultation enregistrée</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {dossierVisits.map(visit => (
                              <div key={visit.id} className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                                <button onClick={() => setExpandedVisitId(expandedVisitId === visit.id ? null : visit.id)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition text-left">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                                      <CalendarIcon size={16} className="text-emerald-500" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(visit.visit_date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs">{visit.reason ?? 'Consultation générale'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {visit.follow_up_date && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">Suivi: {new Date(visit.follow_up_date).toLocaleDateString('fr-FR')}</span>}
                                    <button onClick={async (e) => { e.stopPropagation(); if (!confirm('Supprimer cette consultation ?')) return; await supabase.from('dossier_visits').delete().eq('id', visit.id); setDossierVisits(prev => prev.filter(v => v.id !== visit.id)); showNotice('Consultation supprimée.', 'info'); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-300 hover:text-red-400 transition"><Trash2 size={14} /></button>
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedVisitId === visit.id ? 'rotate-180' : ''}`} />
                                  </div>
                                </button>
                                <AnimatePresence>
                                  {expandedVisitId === visit.id && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                      <div className="px-4 pb-4 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                                        {visit.diagnosis && <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3"><p className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Diagnostic</p><p className="text-sm text-slate-700 dark:text-slate-300">{visit.diagnosis}</p></div>}
                                        {visit.treatment && <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3"><p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Traitement</p><p className="text-sm text-slate-700 dark:text-slate-300">{visit.treatment}</p></div>}
                                        {visit.doctor_notes && <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3"><p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">🔒 Notes du médecin (privé)</p><p className="text-sm text-slate-700 dark:text-slate-300">{visit.doctor_notes}</p></div>}
                                        {!visit.diagnosis && !visit.treatment && !visit.doctor_notes && <p className="text-sm text-slate-400 italic">Aucun détail ajouté pour cette consultation.</p>}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB: PROFILE */}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pb-10">
              <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
                {/* BLOC 1 : PROFIL PUBLIC */}
                <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2"><Settings className="text-blue-600"/> Infos Profil</h2>
                   <div className="space-y-4">
                     <div>
                       <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nom Complet</label>
                       <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none mt-2 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500" placeholder="Votre nom complet" />
                     </div>
                     <div>
                       <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Photo de profil</label>
                       <div className="mt-2 flex flex-wrap items-center gap-3">
                         <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
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
                         {avatarUrl ? (
                           <button
                             type="button"
                             onClick={() => setAvatarUrl("")}
                             className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                           >
                             Supprimer la photo
                           </button>
                         ) : null}
                       </div>
                       <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                         Formats acceptés: JPG, PNG, WebP (max 5 MB).
                       </p>
                       {avatarUrl ? (
                         <div className="mt-3 flex items-center gap-3">
                           <img src={avatarUrl} alt="Aperçu profil" className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700" />
                           <span className="text-xs text-slate-500 dark:text-slate-400">Aperçu de la photo</span>
                         </div>
                       ) : null}
                     </div>
                     <div>
                       <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Adresse de consultation</label>
                       <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none mt-2 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500" placeholder="Ex: Chéraga, Alger" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Spécialité</label>
                         <input type="text" value={specialty} onChange={e => setSpecialty(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none mt-2 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500" placeholder="Ex: Cardiologue" />
                       </div>
                       <div>
                         <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sexe (Genre)</label>
                         <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none mt-2 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500">
                            <option value="">Non précisé</option>
                            <option value="Homme">Homme</option>
                            <option value="Femme">Femme</option>
                         </select>
                       </div>
                     </div>
                     <div>
                       <label className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Biographie</label>
                       <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-3 outline-none mt-2 text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-blue-500 h-24 resize-none" placeholder="Décrivez votre parcours..."></textarea>
                     </div>
                   </div>
                </div>

                {/* BLOC 2 : PARAMS RDV & LISTE ATTENTE (LES NOUVELLES OPTIONS) */}
                <div className="bg-white dark:bg-slate-950 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm h-fit">
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2"><Clock className="text-emerald-600"/> Paramètres RDV</h2>
                   <div className="space-y-6">

                     {/* Activation / Désactivation Global */}
                     <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                       <div>
                         <p className="font-bold text-slate-900 dark:text-slate-100">Activer les Rendez-vous</p>
                         <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs transition-colors">Si désactivé, vous restez visible sur la carte mais aucun patient ne peut réserver.</p>
                       </div>
                       <label className="relative inline-flex items-center cursor-pointer">
                         <input type="checkbox" className="sr-only peer" checked={isAccepting} onChange={(e) => setIsAccepting(e.target.checked)}/>
                         <div className="w-14 h-7 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                       </label>
                     </div>

                     <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                       <p className="font-bold text-slate-900 dark:text-slate-100">Mode de prise de rendez-vous</p>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                         Choisissez qui décide la date/heure finale.
                       </p>
                       <div className="grid md:grid-cols-3 gap-2">
                         <button
                           type="button"
                           onClick={() => setBookingMode("patient_datetime")}
                           className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                             bookingMode === "patient_datetime"
                               ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                               : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                           }`}
                         >
                           Patient choisit date + heure
                         </button>
                         <button
                           type="button"
                           onClick={() => setBookingMode("patient_date_only")}
                           className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                             bookingMode === "patient_date_only"
                               ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                               : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                           }`}
                         >
                           Patient choisit date, docteur heure
                         </button>
                         <button
                           type="button"
                           onClick={() => setBookingMode("doctor_datetime")}
                           className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                             bookingMode === "doctor_datetime"
                               ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                               : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                           }`}
                         >
                           Docteur choisit date + heure
                         </button>
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-400 mb-1">Période par RDV (min)</label>
                         <input type="number" min="5" step="5" value={durationParams} onChange={e => setDurationParams(parseInt(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                       </div>
                       <div>
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-400 mb-1">Quota Journalier</label>
                         <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-2">
                              <button 
                               onClick={() => setIsUnlimited(!isUnlimited)}
                               className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isUnlimited ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}
                              >
                                {isUnlimited ? "✅ Illimité" : "🔢 Limiter"}
                              </button>
                              {!isUnlimited && (
                                <input type="number" min="1" placeholder="Ex: 10" value={maxAppointments} onChange={e => setMaxAppointments(e.target.value === '' ? '' : parseInt(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-bold" />
                              )}
                           </div>
                         </div>
                       </div>
                     </div>

                     <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                       <p className="font-bold text-slate-900 dark:text-slate-100 mb-2">🕒 Horaires d&apos;Ouverture</p>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Définissez vos heures globales de travail. Les patients ne pourront pas réserver en dehors de ces heures de façon automatique.</p>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Heure d&apos;ouverture</label>
                           <div className="relative">
                             <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                             <input type="time" value={workingHoursStart} onChange={e => setWorkingHoursStart(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-medium" />
                           </div>
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Heure de fin</label>
                           <div className="relative">
                             <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                             <input type="time" value={workingHoursEnd} onChange={e => setWorkingHoursEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl pl-10 pr-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500 font-medium" />
                           </div>
                         </div>
                       </div>
                     </div>

                     <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                       <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">🏖️ Mode Vacances</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-0">Indiquez si vous êtes en congé actuellement.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                             <input type="checkbox" className="sr-only peer" checked={isOnVacation} onChange={(e) => setIsOnVacation(e.target.checked)}/>
                             <div className="w-12 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                          </label>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Date de début</label>
                           <input type="date" value={vacationStart} onChange={e => setVacationStart(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                         </div>
                         <div>
                           <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 mb-1">Date de fin</label>
                           <input type="date" value={vacationEnd} onChange={e => setVacationEnd(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-emerald-500" />
                         </div>
                       </div>
                       <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                         Le mode vacances bloque immédiatement les prises de rendez-vous. Les dates sont optionnelles et servent surtout d&apos;information pour les patients.
                       </p>
                     </div>

                     <p className="text-xs text-slate-500 dark:text-slate-400">
                       {isAutoSavingSettings ? "Sauvegarde automatique..." : "Sauvegarde automatique activée."}
                     </p>
                     <button onClick={handleSaveSettings} disabled={isUpdatingParams} className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-500/30 transition flex justify-center items-center disabled:opacity-60">
                       {isUpdatingParams ? "Sauvegarde..." : "💾 Enregistrer les Modifications"}
                     </button>
                   </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      <AnimatePresence>
        {notice ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className={`fixed top-5 right-5 z-[90] max-w-sm rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${
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

      <AnimatePresence>
        {appointmentToSchedule ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-2xl"
            >
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Planifier le rendez-vous
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                Patient: {appointmentToSchedule.patient?.full_name ?? "Patient"}.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(event) => setScheduledDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Heure</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(event) => setScheduledTime(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={closeScheduleModal}
                  className="w-1/3 rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={() => void scheduleAndConfirmAppointment()}
                  disabled={isSchedulingAppointment}
                  className="w-2/3 rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {isSchedulingAppointment ? "Validation..." : "Planifier et confirmer"}
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    
      <AnimatePresence>
        {reportTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl w-full max-w-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Signaler</h3>
              <form onSubmit={submitReport}>
                <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 outline-none mb-4 text-sm text-slate-700 dark:text-slate-300">
                  <option value="Contenu inapproprié">Contenu inapproprié</option>
                  <option value="Spam">Spam ou publicité</option>
                  <option value="Désinformation médicale">Désinformation médicale</option>
                </select>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setReportTarget(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium transition text-sm">Annuler</button>
                  <button type="submit" disabled={isSubmittingReport} className="flex-1 px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-medium transition disabled:bg-rose-400 text-sm">
                    {isSubmittingReport ? "Envoi..." : "Signaler"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

</div>
  );
}
// made by larabi
