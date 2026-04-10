'use client';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "../components/Logo";
import { AnimatedButton } from "../components/AnimatedButton";
import { motion } from "framer-motion";
import { Bot, Users, Heart, MessageSquare, Map, LogIn, User as UserIcon, House, Minus, Maximize2, X, CalendarDays, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/utils/supabase/client";

type DashboardWindowState = {
  title: string;
  src: string;
  minimized: boolean;
};

function extractUserFromAuthToken(parsed: unknown): User | null {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const asRecord = parsed as Record<string, unknown>;

  if (asRecord.user && typeof asRecord.user === "object") {
    return asRecord.user as User;
  }

  if (asRecord.currentSession && typeof asRecord.currentSession === "object") {
    const currentSession = asRecord.currentSession as Record<string, unknown>;
    if (currentSession.user && typeof currentSession.user === "object") {
      return currentSession.user as User;
    }
  }

  if (asRecord.session && typeof asRecord.session === "object") {
    const session = asRecord.session as Record<string, unknown>;
    if (session.user && typeof session.user === "object") {
      return session.user as User;
    }
  }

  return null;
}

function getCachedSupabaseUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return null;
    }

    const projectRef = supabaseUrl.replace(/^https?:\/\//, "").split(".")[0];
    const authTokenKey = `sb-${projectRef}-auth-token`;
    const raw = window.localStorage.getItem(authTokenKey) ?? window.sessionStorage.getItem(authTokenKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      for (const entry of parsed) {
        const candidateUser = extractUserFromAuthToken(entry);
        if (candidateUser) {
          return candidateUser;
        }
      }
      return null;
    }

    return extractUserFromAuthToken(parsed);
  } catch {
    return null;
  }
}

function hasSupabaseAuthToken(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return false;
    }

    const projectRef = supabaseUrl.replace(/^https?:\/\//, "").split(".")[0];
    const authTokenKey = `sb-${projectRef}-auth-token`;
    return Boolean(window.localStorage.getItem(authTokenKey) ?? window.sessionStorage.getItem(authTokenKey));
  } catch {
    return false;
  }
}

function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("Dashboard");
  const [accountType, setAccountType] = useState<"patient" | "doctor" | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [dashboardHref, setDashboardHref] = useState("/dashboardpatientlarabi");
  const [authResolved, setAuthResolved] = useState(false);
  const [authPending, setAuthPending] = useState(true);
  const [dashboardWindow, setDashboardWindow] = useState<DashboardWindowState | null>(null);

  useEffect(() => {
    let isMounted = true;

    const applyUserSnapshot = (snapshotUser: User | null) => {
      setUser(snapshotUser);

      if (!snapshotUser) {
        setAccountType(null);
        setIsPlatformAdmin(false);
        setDisplayName("Dashboard");
        setDashboardHref("/dashboardpatientlarabi");
        return;
      }

      setDisplayName(
        snapshotUser.user_metadata?.full_name ||
        snapshotUser.user_metadata?.name ||
        snapshotUser.email?.split("@")[0] ||
        "Dashboard"
      );

      const metadataAccountType = snapshotUser.user_metadata?.account_type;
      if (metadataAccountType === "doctor") {
        setAccountType("doctor");
        setDashboardHref("/dashboardoctlarabi");
      } else {
        setAccountType("patient");
        setDashboardHref("/dashboardpatientlarabi");
      }
    };

    const refreshProfileSnapshot = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("account_type, full_name, is_platform_admin")
        .eq("id", userId)
        .single();

      if (!isMounted || !profile) {
        return;
      }

      if (profile.account_type === "doctor") {
        setAccountType("doctor");
        setDashboardHref("/dashboardoctlarabi");
      } else if (profile.account_type === "patient") {
        setAccountType("patient");
        setDashboardHref("/dashboardpatientlarabi");
      }

      if (profile.full_name) {
        setDisplayName(profile.full_name);
      }
      setIsPlatformAdmin(Boolean(profile.is_platform_admin));
    };

    async function bootstrapUser() {
      const hasTokenSnapshot = hasSupabaseAuthToken();
      setAuthPending(hasTokenSnapshot);
      const cachedUser = getCachedSupabaseUser();
      applyUserSnapshot(cachedUser);
      if (cachedUser) {
        setAuthResolved(true);
        setAuthPending(false);
      }

      let session = null;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Supabase auth error:", error.message);
          if (error.message.includes("Refresh Token Not Found")) {
            await supabase.auth.signOut();
          }
        }
        session = data?.session ?? null;
      } catch (e) {
        console.error("Failed to get session:", e);
      }

      const sessionUser = session?.user ?? null;
      applyUserSnapshot(sessionUser);
      setAuthResolved(true);
      if (sessionUser || !hasTokenSnapshot) {
        setAuthPending(false);
      } else {
        window.setTimeout(() => {
          if (isMounted) {
            setAuthPending(false);
          }
        }, 1500);
      }

      if (sessionUser) {
        void refreshProfileSnapshot(sessionUser.id);
      }
    }

    void bootstrapUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      const snapshotUser = session?.user ?? null;
      applyUserSnapshot(snapshotUser);
      setAuthResolved(true);
      setAuthPending(false);
      if (snapshotUser) {
        void refreshProfileSnapshot(snapshotUser.id);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isActive = (path: string) => pathname === path;
  const isPatient = accountType === "patient";
  const isDoctor = accountType === "doctor";
  const showGuestNavActions = authResolved && !authPending && !user;
  const navButtonClasses = (path: string) =>
    `flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm ${
      isActive(path)
        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium"
        : "text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
    }`;
  const dashboardButtonClasses =
    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white";

  const openDashboardWindow = (title: string, tab: string) => {
    if (!user) {
      router.push("/login");
      return;
    }

    const basePath = accountType === "doctor" ? "/dashboardoctlarabi" : "/dashboardpatientlarabi";
    const src = `${basePath}?tab=${tab}&embed=1`;
    setDashboardWindow({
      title,
      src,
      minimized: false,
    });
  };

  const patientNavButtons = [
    { key: "dashboard", label: "Dashboard", icon: UserIcon, title: "Dashboard Patient", tab: "overview" },
    { key: "find", label: "Find Doctors", icon: Map, title: "Trouver un praticien", tab: "search" },
    { key: "rdv", label: "Mes RDV", icon: CalendarDays, title: "Gérer mes Rendez-vous", tab: "appointments" },
  ];

  const doctorNavButtons = [
    { key: "dashboard", label: "Dashboard", icon: UserIcon, title: "Dashboard Docteur", tab: "appointments" },
    { key: "rdv", label: "Gestion RDV", icon: CalendarDays, title: "Gestion RDV", tab: "appointments" },
    { key: "patients", label: "Mes Patients", icon: Users, title: "Mes Patients", tab: "patients" },
  ];

  return (
    <>
    <nav className="border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:px-8">
          <Link href="/" className="flex items-center py-2">
            <Logo width={100} height={40} />
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={navButtonClasses("/")}
            >
              <House className="size-4" />
              Home
            </Link>
            <Link
              href="/ai-assistant"
              className={navButtonClasses("/ai-assistant")}
            >
              <MessageSquare className="size-4" />
              AI Assistant
            </Link>
            <Link
              href="/community"
              className={navButtonClasses("/community")}
            >
              <FileText className="size-4" />
              Community
            </Link>
            {user && isPlatformAdmin ? (
              <Link href="/admin/community" className={navButtonClasses("/admin/community")}>
                <Bot className="size-4" />
                Moderation
              </Link>
            ) : null}

            {user && isPatient
              ? patientNavButtons.map(({ key, label, icon: Icon, title, tab }) => (
                  <button
                    key={key}
                    onClick={() => openDashboardWindow(title, tab)}
                    className={dashboardButtonClasses}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))
              : null}

            {user && isDoctor
              ? doctorNavButtons.map(({ key, label, icon: Icon, title, tab }) => (
                  <button
                    key={key}
                    onClick={() => openDashboardWindow(title, tab)}
                    className={dashboardButtonClasses}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))
              : null}

            {showGuestNavActions ? (
              <Link
                href="/doctors"
                className={navButtonClasses("/doctors")}
              >
                <Map className="size-4" />
                Find Doctors
              </Link>
            ) : null}
          </div>

          <div className="flex items-center gap-4">
            {(!authResolved || authPending) && !user ? (
              <div className="h-9 w-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link
                  href={dashboardHref}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors font-medium border border-transparent dark:border-slate-800 dark:bg-slate-900/50 rounded-lg"
                >
                  <UserIcon className="size-4" />
                  {displayName}
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    router.replace("/login");
                    router.refresh();
                  }}
                  className="text-sm text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-3 py-1.5 text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-colors text-sm font-medium"
                >
                  <LogIn className="size-4" />
                  Login
                </Link>
                <AnimatedButton
                  href="/signup"
                  className="inline-flex items-center justify-center w-20 h-8 text-xs font-medium"
                >
                  Sign Up
                </AnimatedButton>
              </>
            )}
          </div>
        </div>

        <div className="md:hidden py-3 border-t border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-1">
            <Link href="/" className={navButtonClasses("/")}>
              <House className="size-4" />
              Home
            </Link>
            <Link href="/ai-assistant" className={navButtonClasses("/ai-assistant")}>
              <MessageSquare className="size-4" />
              AI
            </Link>
            <Link href="/community" className={navButtonClasses("/community")}>
              <FileText className="size-4" />
              Community
            </Link>
            {user && isPlatformAdmin ? (
              <Link href="/admin/community" className={navButtonClasses("/admin/community")}>
                <Bot className="size-4" />
                Moderation
              </Link>
            ) : null}

            {user && isPatient
              ? patientNavButtons.map(({ key, label, icon: Icon, title, tab }) => (
                  <button
                    key={`m-${key}`}
                    onClick={() => openDashboardWindow(title, tab)}
                    className={dashboardButtonClasses}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))
              : null}

            {user && isDoctor
              ? doctorNavButtons.map(({ key, label, icon: Icon, title, tab }) => (
                  <button
                    key={`m-${key}`}
                    onClick={() => openDashboardWindow(title, tab)}
                    className={dashboardButtonClasses}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))
              : null}

            {showGuestNavActions ? (
              <Link href="/doctors" className={navButtonClasses("/doctors")}>
                <Map className="size-4" />
                Find Doctors
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
    {dashboardWindow ? (
      <div
        className={`fixed z-[80] ${
          dashboardWindow.minimized
            ? "inset-x-3 bottom-3 md:inset-x-auto md:right-5 md:bottom-5"
            : "inset-0 flex items-center justify-center p-3 md:p-8 bg-slate-900/35 backdrop-blur-[2px]"
        }`}
      >
        <div
          className={`bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden transition-all duration-300 ${
            dashboardWindow.minimized
              ? "w-[min(92vw,420px)] rounded-2xl"
              : "w-[min(96vw,1200px)] h-[min(88vh,840px)] rounded-3xl"
          }`}
        >
          <div className="h-12 px-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {dashboardWindow.title}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  setDashboardWindow((current) =>
                    current ? { ...current, minimized: !current.minimized } : current
                  )
                }
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition"
                title={dashboardWindow.minimized ? "Restaurer" : "Minimiser"}
              >
                {dashboardWindow.minimized ? <Maximize2 size={15} /> : <Minus size={15} />}
              </button>
              <button
                onClick={() => setDashboardWindow(null)}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition"
                title="Fermer"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div
            className={`transition-all duration-300 ${
              dashboardWindow.minimized ? "h-0 opacity-0 pointer-events-none" : "h-[calc(100%-3rem)] opacity-100"
            }`}
          >
            <iframe
              title={dashboardWindow.title}
              src={dashboardWindow.src}
              className="w-full h-full border-0 bg-white dark:bg-slate-950"
            />
          </div>

          {dashboardWindow.minimized ? (
            <button
              onClick={() =>
                setDashboardWindow((current) =>
                  current ? { ...current, minimized: false } : current
                )
              }
              className="w-full text-left px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Fenêtre minimisée. Cliquez pour reprendre.
            </button>
          ) : null}
        </div>
      </div>
    ) : null}
    </>
  );
}

export default function Landing() {
  useEffect(() => {
    document.title = "Mofid - AI-Powered Healthcare Platform";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white dark:bg-none dark:bg-slate-950 transition-colors duration-300">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:bg-none dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white relative transition-colors duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay dark:opacity-5 pointer-events-none"></div>
        <motion.div animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute -top-40 -right-40 w-[30rem] h-[30rem] bg-gradient-to-br from-blue-400/30 to-indigo-500/30 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full blur-3xl"></motion.div>
        <motion.div animate={{ scale: [1, 1.5, 1], rotate: [0, -90, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute -bottom-40 -left-40 w-[35rem] h-[35rem] bg-gradient-to-tr from-cyan-400/20 to-blue-600/20 dark:from-cyan-900/10 dark:to-blue-900/10 rounded-full blur-3xl"></motion.div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="space-y-8">
              <div className="inline-block px-4 py-2 bg-white/20 dark:bg-white/5 backdrop-blur-sm rounded-full text-sm font-medium border border-white/10 dark:border-white/5">
                🏥 Trusted by 50,000+ Patients
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Your Health, <br/><span className="text-blue-200 dark:text-blue-400">Our Priority</span>
              </h1>
              <p className="text-lg sm:text-xl text-blue-100 dark:text-slate-300 leading-relaxed">
                Connect with certified doctors, get instant AI-powered health assessments, 
                and manage your healthcare journey all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <AnimatedButton href="/ai-assistant" className="w-full sm:w-auto justify-center bg-white text-blue-600 dark:bg-blue-600 dark:text-white hover:bg-gray-100 dark:hover:bg-blue-700 border-none shadow-xl">
                  🤖 Check Symptoms
                </AnimatedButton>
                <AnimatedButton variant="secondary" href="/doctors" className="w-full sm:w-auto justify-center border-white text-white hover:bg-white/10 dark:border-slate-700 dark:hover:bg-slate-800">
                  👨‍⚕️ Find Doctors
                </AnimatedButton>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, delay: 0.2, ease: "easeOut" }} className="relative">
              <div className="bg-white/10 dark:bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/20 dark:border-slate-800 shadow-2xl">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div className="text-center p-6 bg-white/5 dark:bg-slate-800/20 rounded-2xl border border-white/5">
                    <div className="text-4xl font-bold">24/7</div>
                    <div className="text-blue-100 dark:text-slate-400 mt-1">Available</div>
                  </div>
                  <div className="text-center p-6 bg-white/5 dark:bg-slate-800/20 rounded-2xl border border-white/5">
                    <div className="text-4xl font-bold">2.5K+</div>
                    <div className="text-blue-100 dark:text-slate-400 mt-1">Doctors</div>
                  </div>
                  <div className="text-center p-6 bg-white/5 dark:bg-slate-800/20 rounded-2xl border border-white/5">
                    <div className="text-4xl font-bold">98%</div>
                    <div className="text-blue-100 dark:text-slate-400 mt-1">Satisfaction</div>
                  </div>
                  <div className="text-center p-6 bg-white/5 dark:bg-slate-800/20 rounded-2xl border border-white/5">
                    <div className="text-4xl font-bold">50K+</div>
                    <div className="text-blue-100 dark:text-slate-400 mt-1">Patients</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section className="py-20 bg-gray-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }} className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">Complete Healthcare Solutions</h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-slate-400 max-w-3xl mx-auto">
              From AI-powered symptom checking to booking appointments with specialists
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border border-gray-100 dark:border-slate-800 group">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">AI Health Assistant</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6 leading-relaxed">
                Get instant health assessments and recommendations based on your symptoms using advanced AI technology.
              </p>
              <AnimatedButton href="/ai-assistant" variant="secondary" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                Try Now →
              </AnimatedButton>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border border-gray-100 dark:border-slate-800 group">
              <div className="w-16 h-16 bg-green-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-green-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Expert Doctors</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6 leading-relaxed">
                Connect with certified healthcare professionals across all specialties for consultations and treatments.
              </p>
              <AnimatedButton href="/doctors" variant="secondary" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                Browse Doctors →
              </AnimatedButton>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all border border-gray-100 dark:border-slate-800 group">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Heart className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Health Records</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6 leading-relaxed">
                Securely store and manage your medical history, prescriptions, and test results in one place.
              </p>
              <AnimatedButton variant="secondary" className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
                Learn More →
              </AnimatedButton>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-20 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }} className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">How Mofid Works</h2>
            <p className="text-lg sm:text-xl text-gray-600 dark:text-slate-400">Simple steps to better healthcare</p>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: 0.1 }} className="text-center group">
              <div className="w-16 h-16 bg-blue-600 dark:bg-blue-900/50 dark:border dark:border-blue-800 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 group-hover:bg-blue-500 transition-colors">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Describe Symptoms</h3>
              <p className="text-gray-600 dark:text-slate-400">Tell our AI about your health concerns</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: 0.2 }} className="text-center group">
              <div className="w-16 h-16 bg-blue-600 dark:bg-blue-900/50 dark:border dark:border-blue-800 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 group-hover:bg-blue-500 transition-colors">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Get Assessment</h3>
              <p className="text-gray-600 dark:text-slate-400">Receive instant AI-powered analysis</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: 0.3 }} className="text-center group">
              <div className="w-16 h-16 bg-blue-600 dark:bg-blue-900/50 dark:border dark:border-blue-800 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 group-hover:bg-blue-500 transition-colors">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Find Doctor</h3>
              <p className="text-gray-600 dark:text-slate-400">Connect with the right specialist</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.4, delay: 0.4 }} className="text-center group">
              <div className="w-16 h-16 bg-blue-600 dark:bg-blue-900/50 dark:border dark:border-blue-800 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 group-hover:bg-blue-500 transition-colors">
                4
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Get Treatment</h3>
              <p className="text-gray-600 dark:text-slate-400">Start your journey to better health</p>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:bg-none dark:bg-slate-900 py-16 sm:py-20 border-t border-transparent dark:border-slate-800 transition-colors duration-300">
        <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.7 }} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">Ready to Take Control of Your Health?</h2>
          <p className="text-lg sm:text-xl text-blue-100 dark:text-slate-300 mb-8">
            Join thousands of patients who trust Mofid for their healthcare needs
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <AnimatedButton href="/signup" className="w-full sm:w-auto justify-center bg-white text-blue-600 hover:bg-gray-100 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 border-none shadow-xl px-8 py-4 text-lg">
              Get Started Free
            </AnimatedButton>
            <AnimatedButton variant="secondary" href="/ai-assistant" className="w-full sm:w-auto justify-center border-white text-white hover:bg-white/10 dark:border-slate-700 dark:hover:bg-slate-800 px-8 py-4 text-lg">
              Try AI Assistant
            </AnimatedButton>
          </div>
        </motion.div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-slate-900 py-12 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <Logo width={150} height={60} />
            </div>
            <p className="text-gray-500 dark:text-slate-500 font-medium text-sm">
              &copy; 2026 Mofid. Connecting patients with healthcare professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
