// made by larabi
'use client';
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../utils/supabase/client";
import { logAuditEvent, logPerformanceEvent } from "../../utils/telemetry";
import { Logo } from "../../components/Logo";
import { 
  Users, Calendar as CalendarIcon, Clock, Settings, LogOut, 
  FileText, CheckCircle, XCircle, RefreshCw, Upload, Images, X
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
    const allowedTabs = new Set(["appointments", "patients", "community", "profile"]);
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
    const allowedTabs = new Set(["appointments", "patients", "community", "profile"]);
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
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
      <aside className="w-full md:w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-sm flex flex-col z-10 sticky top-0 h-screen transition-colors duration-200">
        <div className="p-6 pb-8 border-b border-slate-100 dark:border-slate-800">
          <Link href="/"><Logo width={120} /></Link>
        </div>
        <div className="p-6 flex flex-col gap-2 flex-grow overflow-y-auto">
          <button onClick={() => setActiveTab("appointments")} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "appointments" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <CalendarIcon size={20} /> Agenda & RDV
          </button>
          <button onClick={() => setActiveTab("patients")} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "patients" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Users size={20} /> Mes Patients
          </button>
          <button onClick={() => setActiveTab("community")} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "community" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <FileText size={20} /> Communauté
          </button>
          <button onClick={() => setActiveTab("profile")} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "profile" ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
            <Settings size={20} /> Configuration Cabinet
          </button>
        </div>
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 mt-auto">
          <div className="flex items-center gap-3 mb-6">
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

          {/* TAB: ARTICLES */}
          {activeTab === "community" && (
            <motion.div key="community" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
               <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                 <FileText className="text-blue-600"/> Zone de Publication
               </h2>
               <div className="grid lg:grid-cols-3 gap-8">
                 {/* Formulaire */}
                 <div className="lg:col-span-1">
                   <div className="bg-white dark:bg-slate-950 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 sticky top-8">
                     <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-4">Nouvel Article</h3>
                     <form onSubmit={handlePublishArticle} className="flex flex-col gap-4">
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
                        <button type="submit" className="bg-slate-900 dark:bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-blue-500 transition shadow-md">Publier l&apos;article</button>
                     </form>
                   </div>
                 </div>
                 {/* Liste articles */}
                 <div className="lg:col-span-2 flex flex-col gap-4">
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

          {/* TAB: PATIENTS */}
          {activeTab === "patients" && (
            <motion.div key="patients" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-blue-600 text-white rounded-3xl p-8 shadow-lg shadow-blue-200 flex flex-col items-center justify-center text-center">
                <Users size={64} className="mb-4 opacity-80" />
                <h2 className="text-2xl font-bold mb-2">Base de données patients</h2>
                <p className="text-blue-100 max-w-lg mb-6">Visualisez l&apos;historique complet, les notes et les dossiers médicaux sécurisés de vos patients. Module en cours de finalisation.</p>
                <div className="px-6 py-2 bg-white/20 backdrop-blur rounded-full font-bold text-sm tracking-widest border border-white/30">BIENTÔT DISPONIBLE</div>
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
    </div>
  );
}
// made by larabi
