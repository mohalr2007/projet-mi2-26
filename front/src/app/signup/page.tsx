// made by larabi
'use client';
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "../../components/Logo";
import { AnimatedInput } from "../../components/AnimatedInput";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, Stethoscope, AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import ThemeToggle from "../../components/ThemeToggle";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [accountType, setAccountType] = useState<"patient" | "doctor">("patient");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [license, setLicense] = useState("");
  const [gender, setGender] = useState<"Homme" | "Femme" | "">("");

  // New location states
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [searchAddressLoading, setSearchAddressLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Detect if user is arriving from Google OAuth with ?step=complete
  const isGoogleCompletion = searchParams.get('step') === 'complete';

  // Automatically fetch Google User Data if we are in completion step
  useEffect(() => {
    if (isGoogleCompletion) {
      const fetchUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || "");
          setName(user.user_metadata?.full_name || user.user_metadata?.name || "");
        }
      };
      fetchUserData();
    }
  }, [isGoogleCompletion, supabase]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?type=signup`
        }
      });
      if (error) setError(error.message);
    } catch {
      setError('An error occurred during Google sign up');
    }
  };

  const handleLocationSearch = async () => {
    if (!address) return alert("Saisissez une adresse à chercher !");
    setSearchAddressLoading(true);
    try {
      // API gratuite Nominatim (OpenStreetMap) pour convertir une adresse de texte en Géolocalisation
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLatitude(parseFloat(data[0].lat));
        setLongitude(parseFloat(data[0].lon));
        setAddress(data[0].display_name); // Remplace par l'adresse formatée complète
        alert("Lieu géographique trouvé et validé avec succès !");
      } else {
        alert("Adresse introuvable. Soyez plus précis ou utilisez le bouton GPS Auto.");
      }
    } catch {
      alert("Erreur de recherche géographique.");
    }
    setSearchAddressLoading(false);
  };

  const handleAutoGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        // Reverse geocoding for UI display
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.display_name) {
            setAddress(data.display_name);
          } else {
            setAddress("Position GPS sauvegardée");
          }
        } catch { 
          setAddress("Position GPS trouvée et enregistrée !"); 
        }
        alert("Géolocalisation réussie ! Vos coordonnées sont détectées.");
      }, () => alert("Erreur GPS. Veuillez autoriser la localisation sur votre navigateur."));
    } else {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!latitude || !longitude) {
      setError("Veuillez obligatoirement définir votre localisation (via la Recherche manuelle ou le Bouton GPS Auto).");
      return;
    }
    
    setLoading(true);
    
    try {
      let userId = "";

      if (isGoogleCompletion) {
         // User already created via Google OAuth, we just update metadata & profiles table
         const { data: { user }, error: userErr } = await supabase.auth.getUser();
         if (userErr || !user) throw new Error("Impossible de récupérer la session Google");
         
         const { error: metaError } = await supabase.auth.updateUser({
            password: password,
            data: {
              full_name: name,
              account_type: accountType,
              specialty: accountType === 'doctor' ? specialty : null,
              license_number: accountType === 'doctor' ? license : null,
            }
         });
         if (metaError) throw new Error(metaError.message);
         userId = user.id;

      } else {
         // Normal Email/Password Signup creation
         const { data: authData, error: authError } = await supabase.auth.signUp({
           email,
           password,
           options: {
             data: {
               full_name: name,
               account_type: accountType,
               specialty: accountType === 'doctor' ? specialty : null,
               license_number: accountType === 'doctor' ? license : null,
             }
           }
         });
         if (authError) throw new Error(authError.message);
         if (!authData.user) throw new Error("Erreur inconnue lors de l'inscription");
         userId = authData.user.id;
      }

      if (!gender) {
        throw new Error("Veuillez sélectionner votre sexe (Homme/Femme).");
      }

      // Update the public database 'profiles' pour TOUS les flux
      // On utilise .update() et non .upsert() pour respecter vos règles RLS (Row Level Security) car le Triger a déjà inséré la ligne!
      const { error: profileError } = await supabase.from('profiles').update({
         full_name: name,
         gender: gender,
         account_type: accountType,
         specialty: accountType === 'doctor' ? specialty : null,
         license_number: accountType === 'doctor' ? license : null,
         address: address,
         latitude: latitude,
         longitude: longitude
      }).eq('id', userId);

      if (profileError) {
         throw new Error('Erreur de configuration base de données profil: ' + profileError.message);
      }

      setSuccess(true);
      setTimeout(() => {
        if (accountType === 'doctor') {
          router.push('/dashboardoctlarabi');
        } else {
          router.push('/dashboardpatientlarabi');
        }
      }, 1500);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message || "Une erreur est survenue lors de l'enregistrement de votre profil");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-[#020617] dark:to-[#0f172a] flex items-center justify-center p-4 transition-colors duration-200">
      <ThemeToggle />
      <div className="w-full max-w-md my-8">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-8">
          <Logo width={200} height={80} />
        </Link>

        {/* Signup Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-gray-100 dark:border-slate-800 p-8 transition-colors duration-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{isGoogleCompletion ? "Finalisation du Profil" : "Créer un compte"}</h1>
            <p className="text-gray-500 dark:text-slate-400">Rejoignez la plateforme Mofid</p>
          </div>

          {isGoogleCompletion && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/70 text-blue-800 dark:text-blue-300 rounded-2xl text-sm flex items-start gap-3">
              <span className="text-2xl">👋</span>
              <p><strong>Connecté avec succès via Google !</strong> Vos informations ont été pré-remplies. Finalisez votre adresse et ajoutez un mot de passe sécurisé pour l&apos;application.</p>
            </div>
          )}

          {/* Account Type Selection */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 dark:bg-slate-800/70 dark:border-slate-800 rounded-2xl mb-6 transition-colors duration-200">
            <motion.button
              type="button"
              onClick={() => setAccountType("patient")}
              className={`py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${accountType === "patient"
                ? "bg-white dark:bg-slate-900 shadow text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
            >
              <User className="size-5 mx-auto mb-1" />
              <span className="text-sm">Patient</span>
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setAccountType("doctor")}
              className={`py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${accountType === "doctor"
                ? "bg-white dark:bg-slate-900 shadow text-emerald-600 dark:text-emerald-400 font-bold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
            >
              <Stethoscope className="size-5 mx-auto mb-1" />
              <span className="text-sm">Médecin</span>
            </motion.button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/70 rounded-xl flex items-start gap-3 text-sm font-medium"
              >
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900/70 rounded-xl flex items-start gap-3 text-sm font-medium"
              >
                <CheckCircle2 className="size-5 shrink-0 mt-0.5" />
                <p>Profil enregistré avec succès ! Vous allez être redirigé vers votre espace...</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Full Name */}
            <AnimatedInput
              id="name"
              type="text"
              placeholder="Enter your full name"
              label="Full Name"
              icon={User}
              iconDelay={0}
              fieldDelay={0.1}
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            {/* Email */}
            <AnimatedInput
              id="email"
              type="email"
              placeholder="Enter your email"
              label="Email"
              icon={Mail}
              iconDelay={0.2}
              fieldDelay={0.2}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isGoogleCompletion}
            />

            {/* Gender Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 mb-1 block">Sexe / Genre</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender("Homme")}
                  className={`py-3 flex justify-center items-center gap-2 rounded-xl border transition font-bold shadow-sm ${gender === "Homme" ? "bg-blue-100 dark:bg-blue-900/30 border-blue-400 text-blue-700 dark:text-blue-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-neutral-800"}`}
                >
                  👨 Homme
                </button>
                <button
                  type="button"
                  onClick={() => setGender("Femme")}
                  className={`py-3 flex justify-center items-center gap-2 rounded-xl border transition font-bold shadow-sm ${gender === "Femme" ? "bg-pink-100 dark:bg-pink-900/30 border-pink-400 text-pink-700 dark:text-pink-400" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-neutral-800"}`}
                >
                  👩 Femme
                </button>
              </div>
            </div>

            {/* Passwords */}
            <div className="space-y-4">
              <AnimatedInput
                id="password"
                type="password"
                placeholder="Create a password"
                label="Password"
                icon={Lock}
                iconDelay={0.4}
                fieldDelay={0.3}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2 ml-1">Must be at least 8 characters</p>

              <AnimatedInput
                id="confirm-password"
                type="password"
                placeholder="Confirm your password"
                label="Confirm Password"
                icon={Lock}
                iconDelay={0.6}
                fieldDelay={0.4}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {/* Doctor-specific fields */}
            {accountType === "doctor" && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl">👨‍⚕️ Informations Professionnelles</h3>
                
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">Spécialité Médicale</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  >
                    <option value="">Sélectionnez votre spécialité...</option>
                    <option value="Cardiologue">Cardiologue</option>
                    <option value="Dermatologue">Dermatologue</option>
                    <option value="Généraliste">Généraliste</option>
                    <option value="Ophtalmologue">Ophtalmologue</option>
                    <option value="Pédiatre">Pédiatre</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 mb-1 block">N° d&apos;identification (Ordre)</label>
                  <div className="relative">
                    <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
                    <input
                      type="text"
                      placeholder="Ex: 123456"
                      value={license}
                      onChange={(e) => setLicense(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* LOCATION FORM CONFIGURATION */}
            <div className={`mt-6 p-5 rounded-2xl relative overflow-hidden border ${accountType === 'doctor' ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40' : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/40'}`}>
               <div className="absolute -right-4 -top-4 text-slate-200 dark:text-slate-700 transform rotate-12 pointer-events-none opacity-50">
                 <MapPin size={80} />
               </div>
               
               <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mb-4 relative z-10">
                 <MapPin size={18} className={accountType === 'doctor' ? 'text-emerald-600' : 'text-blue-600'}/> 
                 Localisation du {accountType === 'doctor' ? 'Cabinet Médical' : 'Domicile Patient'}
               </h3>
               
               <div className="space-y-4 relative z-10">
                 
                 {/* Ligne 1: Saisie ou affichage de l'adresse */}
                 <div className="relative">
                   <input
                     type="text"
                     placeholder="Tapez le nom de la ville, quartier ou rue..."
                     className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-slate-400 outline-none shadow-sm"
                     value={address}
                     onChange={(e) => setAddress(e.target.value)}
                     required
                   />
                 </div>

                 {/* Ligne 2 : Boutons Recherche vs Auto */}
                 <div className="flex gap-2">
                   <button 
                     type="button"
                     className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs py-2.5 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                     onClick={handleLocationSearch}
                     disabled={searchAddressLoading}
                   >
                     {searchAddressLoading ? "Recherche..." : "🔍 Chercher Carte"}
                   </button>
                   <button 
                     type="button" 
                     className={`flex-1 text-white text-xs py-2.5 rounded-xl font-bold transition shadow-sm ${accountType === 'doctor' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                     onClick={handleAutoGPS}
                   >
                     🎯 GPS Automatique
                   </button>
                 </div>

                 {latitude && longitude && (
                   <div className="flex items-center gap-2 text-xs font-bold text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950/30 px-3 py-2 rounded-lg border border-green-200 dark:border-green-900/50 shadow-sm">
                     <CheckCircle2 size={16} /> GPS Validé ({latitude.toFixed(2)}, {longitude.toFixed(2)})
                   </div>
                 )}
               </div>
            </div>
            {/* END LOCATION */}

            {/* Submit Button */}
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full text-white font-bold py-4 rounded-xl shadow-lg transition transform hover:-translate-y-0.5 ${accountType === 'doctor' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
              >
                {loading ? "Création en cours..." : isGoogleCompletion ? "Terminer la configuration" : "Créer le compte complet"}
              </button>
            </div>
          </form>

          {/* Social Signup (Only if standard logic without completion step active) */}
          {!isGoogleCompletion && (
            <>
              <div className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-sm font-medium text-slate-400 dark:text-slate-500">ou</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              <button 
                type="button" 
                onClick={handleGoogleLogin}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-neutral-800 transition shadow-sm hover:border-slate-300 dark:hover:border-neutral-600"
              >
                <svg className="size-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Inscription Express avec Google
              </button>
            </>
          )}

          <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-8">
            Vous avez déjà un compte ?{" "}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-colors">
              Connectez-vous
            </Link>
          </p>
        </div>
      </div>
    </div >
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950">Chargement...</div>}>
      <SignupForm />
    </Suspense>
  );
}
// made by larabi
