'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../components/Logo";
import { AnimatedButton } from "../components/AnimatedButton";
import { Bot, MapPin, Users, Shield, Zap, Heart, MessageSquare, Map, Users as UsersIcon, LogIn, Calendar, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

function Navigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    getUser();
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 px-8">
          <Link href="/" className="flex items-center py-2">
            <Logo width={100} height={40} />
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`${
                isActive("/") ? "text-primary" : "text-foreground/70 hover:text-foreground"
              } transition-colors text-xs`}
            >
              Home
            </Link>
            <Link
              href="/ai-assistant"
              className={`flex items-center gap-2 ${
                isActive("/ai-assistant") ? "text-primary" : "text-foreground/70 hover:text-foreground"
              } transition-colors text-xs`}
            >
              <MessageSquare className="size-4" />
              AI Assistant
            </Link>
            <Link
              href="/doctors"
              className={`flex items-center gap-2 ${
                isActive("/doctors") ? "text-primary" : "text-foreground/70 hover:text-foreground"
              } transition-colors text-xs`}
            >
              <Map className="size-4" />
              Find Doctors
            </Link>
            <Link
              href="/community"
              className={`flex items-center gap-2 ${
                isActive("/community") ? "text-primary" : "text-foreground/70 hover:text-foreground"
              } transition-colors text-xs`}
            >
              <UsersIcon className="size-4" />
              Community
            </Link>
            <Link
              href="/availability"
              className={`flex items-center gap-2 ${
                isActive("/availability") ? "text-primary" : "text-foreground/70 hover:text-foreground"
              } transition-colors text-xs`}
            >
              <Calendar className="size-4" />
              Availability
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {loading ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboardpatientlarabi"
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <UserIcon className="size-4" />
                  {user.user_metadata?.name || user.email?.split('@')[0] || "Dashboard"}
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.reload();
                  }}
                  className="text-sm text-red-500 hover:text-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-3 py-1.5 text-foreground/70 hover:text-foreground transition-colors text-sm"
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
      </div>
    </nav>
  );
}

export default function Landing() {
  useEffect(() => {
    document.title = "Mofid - AI-Powered Healthcare Platform";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 to-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium">
                🏥 Trusted by 50,000+ Patients
              </div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Your Health, Our Priority
              </h1>
              <p className="text-xl text-blue-100 leading-relaxed">
                Connect with certified doctors, get instant AI-powered health assessments, 
                and manage your healthcare journey all in one place.
              </p>
              <div className="flex flex-wrap gap-4">
                <AnimatedButton href="/ai-assistant" className="bg-white text-blue-600 hover:bg-gray-100">
                  🤖 Check Symptoms
                </AnimatedButton>
                <AnimatedButton variant="secondary" href="/doctors" className="border-white text-white hover:bg-white/10">
                  👨‍⚕️ Find Doctors
                </AnimatedButton>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold">24/7</div>
                    <div className="text-blue-100">Available</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold">2.5K+</div>
                    <div className="text-blue-100">Doctors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold">98%</div>
                    <div className="text-blue-100">Satisfaction</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold">50K+</div>
                    <div className="text-blue-100">Patients</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Complete Healthcare Solutions</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From AI-powered symptom checking to booking appointments with specialists
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">AI Health Assistant</h3>
              <p className="text-gray-600 mb-6">
                Get instant health assessments and recommendations based on your symptoms using advanced AI technology.
              </p>
              <AnimatedButton href="/ai-assistant" variant="secondary">
                Try Now →
              </AnimatedButton>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Expert Doctors</h3>
              <p className="text-gray-600 mb-6">
                Connect with certified healthcare professionals across all specialties for consultations and treatments.
              </p>
              <AnimatedButton href="/doctors" variant="secondary">
                Browse Doctors →
              </AnimatedButton>
            </div>
            
            <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow border border-gray-100">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <Heart className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Health Records</h3>
              <p className="text-gray-600 mb-6">
                Securely store and manage your medical history, prescriptions, and test results in one place.
              </p>
              <AnimatedButton variant="secondary">
                Learn More →
              </AnimatedButton>
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How Mofid Works</h2>
            <p className="text-xl text-gray-600">Simple steps to better healthcare</p>
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Describe Symptoms</h3>
              <p className="text-gray-600">Tell our AI about your health concerns</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Get Assessment</h3>
              <p className="text-gray-600">Receive instant AI-powered analysis</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Find Doctor</h3>
              <p className="text-gray-600">Connect with the right specialist</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Get Treatment</h3>
              <p className="text-gray-600">Start your journey to better health</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Take Control of Your Health?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of patients who trust Mofid for their healthcare needs
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <AnimatedButton href="/signup" className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg">
              Get Started Free
            </AnimatedButton>
            <AnimatedButton variant="secondary" href="/ai-assistant" className="border-white text-white hover:bg-white/10 px-8 py-4 text-lg">
              Try AI Assistant
            </AnimatedButton>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center">
              <Logo width={150} height={60} />
            </div>
            <p className="text-foreground/60">
              &copy; 2026 Mofid. Connecting patients with healthcare professionals.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}