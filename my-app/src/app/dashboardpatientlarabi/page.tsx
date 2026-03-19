'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";
import { Logo } from "../../components/Logo";

export default function PatientDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      // Step 1: Get the currently logged-in user from Supabase Auth
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      // If not logged in, redirect to login
      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Step 2: Use user.id to fetch profile row from `profiles` table
      console.log("User ID:", user.id); // Debug log
      
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, account_type")
        .eq("id", user.id)       // match the row where id = logged-in user's id
        .single();               // we expect exactly one row

      console.log("Profile data:", profile); // Debug log
      console.log("Profile error:", profileError); // Debug log

      if (profileError) {
        console.error("Error fetching profile:", profileError.message);
        // Fallback to user metadata if profile table fails
        setFullName(user.user_metadata?.name || user.email?.split('@')[0] || null);
        setEmail(user.email || null);
        setAccountType(user.user_metadata?.account_type || "patient");
      } else {
        setFullName(profile?.full_name || null);
        setEmail(user.email || null); // Use email from auth, not profile
        setAccountType(profile?.account_type || "patient");
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <p className="text-gray-500 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Link href="/">
          <Logo width={130} />
        </Link>
        <button
          onClick={handleSignOut}
          className="text-sm text-red-500 hover:text-red-700 transition-colors"
        >
          Sign Out
        </button>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        {/* Welcome Card */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-10 text-center mb-10">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {fullName ?? "Patient"}!
          </h1>
          <div className="space-y-2 mb-4">
            <p className="text-gray-600">
              <strong>Email:</strong> {email || "Loading..."}
            </p>
            <p className="text-gray-600">
              <strong>Account Type:</strong> <span className="text-blue-600 font-semibold">{accountType || "Loading..."}</span>
            </p>
          </div>
          <p className="text-gray-500">
            This is your personal health dashboard. More features coming soon.
          </p>
        </div>

        {/* Quick Actions — placeholder cards for future features */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">🤖</div>
            <h3 className="font-semibold text-gray-800 mb-1">AI Assistant</h3>
            <p className="text-sm text-gray-500">Check your symptoms instantly</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-semibold text-gray-800 mb-1">Appointments</h3>
            <p className="text-sm text-gray-500">Book and manage appointments</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">📋</div>
            <h3 className="font-semibold text-gray-800 mb-1">Health Records</h3>
            <p className="text-sm text-gray-500">View your medical history</p>
          </div>
        </div>
      </main>
    </div>
  );
}
