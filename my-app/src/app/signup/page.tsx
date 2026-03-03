'use client';
import { useState } from "react";
import Link from "next/link";
import { Logo } from "../../components/Logo";
import { AnimatedInput } from "../../components/AnimatedInput";
import { AnimatedButton } from "../../components/AnimatedButton";
import { motion } from "framer-motion";
import { Mail, Lock, User, Stethoscope } from "lucide-react";

export default function Signup() {
  const [accountType, setAccountType] = useState<"patient" | "doctor">("patient");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center mb-8">
          <Logo size={150} />
        </Link>

        {/* Signup Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-border p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl text-foreground mb-2">Create Account</h1>
            <p className="text-foreground/60">Join Mofid today</p>
          </div>

          {/* Account Type Selection */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-gray-100 rounded-xl mb-6">
            <motion.button
              onClick={() => setAccountType("patient")}
              className={`py-3 rounded-lg transition-all duration-200 relative overflow-hidden ${
                accountType === "patient"
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {accountType === "patient" && (
                <motion.div
                  className="absolute inset-0 bg-blue-50 opacity-0"
                  animate={{ opacity: [0, 0.1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <motion.div
                animate={{
                  y: accountType === "patient" ? [0, -2, 0] : 0,
                }}
                transition={{
                  duration: 0.3,
                  repeat: accountType === "patient" ? Infinity : 0,
                  repeatDelay: 3,
                }}
              >
                <User className="size-5 mx-auto mb-1" />
              </motion.div>
              <span className="text-sm font-medium">Patient</span>
            </motion.button>
            <motion.button
              onClick={() => setAccountType("doctor")}
              className={`py-3 rounded-lg transition-all duration-200 relative overflow-hidden ${
                accountType === "doctor"
                  ? "bg-white shadow-sm text-blue-600"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {accountType === "doctor" && (
                <motion.div
                  className="absolute inset-0 bg-blue-50 opacity-0"
                  animate={{ opacity: [0, 0.1, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <motion.div
                animate={{
                  y: accountType === "doctor" ? [0, -2, 0] : 0,
                }}
                transition={{
                  duration: 0.3,
                  repeat: accountType === "doctor" ? Infinity : 0,
                  repeatDelay: 3,
                }}
              >
                <Stethoscope className="size-5 mx-auto mb-1" />
              </motion.div>
              <span className="text-sm font-medium">Doctor</span>
            </motion.button>
          </div>

          <form className="space-y-5">
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
            />

            {/* Email */}
            <AnimatedInput
              id="email"
              type="email"
              placeholder="Enter your email"
              label="Email"
              icon={Mail}
              iconDelay={0.5}
              fieldDelay={0.2}
              required
            />

            {/* Password */}
            <AnimatedInput
              id="password"
              type="password"
              placeholder="Create a password"
              label="Password"
              icon={Lock}
              iconDelay={1}
              fieldDelay={0.3}
              required
            />
            <p className="text-xs text-foreground/60 mt-2 -mb-4">
              Must be at least 8 characters
            </p>

            {/* Confirm Password */}
            <AnimatedInput
              id="confirm-password"
              type="password"
              placeholder="Confirm your password"
              label="Confirm Password"
              icon={Lock}
              iconDelay={1.5}
              fieldDelay={0.4}
              required
            />

            {/* Doctor-specific fields */}
            {accountType === "doctor" && (
              <>
                <AnimatedInput
                  id="specialty"
                  type="select"
                  placeholder="Select your specialty"
                  label="Medical Specialty"
                  icon={Stethoscope}
                  iconDelay={2}
                  fieldDelay={0.5}
                  required
                >
                  <select
                    id="specialty"
                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:shadow-blue-100 transition-all duration-200"
                  >
                    <option value="">Select your specialty</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="dermatology">Dermatology</option>
                    <option value="general">General Practitioner</option>
                    <option value="orthopedics">Orthopedics</option>
                    <option value="pediatrics">Pediatrics</option>
                  </select>
                </AnimatedInput>

                <AnimatedInput
                  id="license"
                  type="text"
                  placeholder="Enter your license number"
                  label="Medical License Number"
                  icon={User}
                  iconDelay={2.5}
                  fieldDelay={0.6}
                  required
                />
              </>
            )}

            {/* Terms */}
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                className="size-4 rounded border-border text-primary focus:ring-primary mt-1"
              />
              <label htmlFor="terms" className="ml-2 text-sm text-foreground/70">
                I agree to the{" "}
                <button type="button" className="text-blue-600 hover:text-blue-700">
                  Terms of Service
                </button>{" "}
                and{" "}
                <button type="button" className="text-blue-600 hover:text-blue-700">
                  Privacy Policy
                </button>
              </label>
            </div>

            {/* Submit Button */}
            <AnimatedButton>
              Create Account
            </AnimatedButton>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            <span className="text-sm font-medium text-gray-500 px-2 bg-white">or continue with</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          </div>

          {/* Social Signup */}
          <div className="grid grid-cols-2 gap-3">
            <AnimatedButton variant="social" type="button">
              <svg className="size-5 flex-shrink-0 align-middle" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </AnimatedButton>
            <AnimatedButton variant="social" type="button">
              <svg className="size-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </AnimatedButton>
          </div>

          {/* Login Link */}
          <p className="text-center text-foreground/60 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-foreground/60 text-sm mt-6">
          By continuing, you agree to Mofid's Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
