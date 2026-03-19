'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";
import { Logo } from "../../components/Logo";

export default function DoctorDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/login");
        return;
      }

      // Fetch both full_name and specialty for the doctor
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, specialty")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError.message);
      } else {
        setFullName(profile?.full_name ?? null);
        setSpecialty(profile?.specialty ?? null);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <p className="text-gray-500 text-lg">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <Link href="/">
          <Logo size={100} />
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
          <div className="text-5xl mb-4">🩺</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, Dr. {fullName ?? "Doctor"}!
          </h1>
          {specialty && (
            <p className="text-blue-600 font-medium mb-2">{specialty}</p>
          )}
          <p className="text-gray-500">
            This is your doctor portal. Manage your patients and appointments here.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-semibold text-gray-800 mb-1">Appointments</h3>
            <p className="text-sm text-gray-500">View today's schedule</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">👥</div>
            <h3 className="font-semibold text-gray-800 mb-1">Patients</h3>
            <p className="text-sm text-gray-500">Manage your patient list</p>
          </div>
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">⏰</div>
            <h3 className="font-semibold text-gray-800 mb-1">Availability</h3>
            <p className="text-sm text-gray-500">Set your available slots</p>
          </div>
        </div>
      </main>
    </div>
  );
}
