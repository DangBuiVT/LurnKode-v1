"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setErrorMsg(null);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace("/course/catalog");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Registration failed. This email may already be in use.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50 dark:bg-slate-950">
      {/* Brand Header */}
      <div className="w-full max-w-md space-y-2 text-center mb-6">
        <Link
          href="/course/catalog"
          className="inline-flex items-center gap-2.5 text-2xl font-bold tracking-tight text-primary transition-opacity hover:opacity-90"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="size-6 text-primary" />
          </div>
          <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            LurnKode
          </span>
        </Link>
        <h1 className="text-xl font-bold text-foreground">Create an Account</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Sign up to access programming courses and interactive learning.
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        {/* Already logged in alert */}
        {user && (
          <div className="mb-5 flex items-center justify-between rounded-xl border border-emerald-300/60 bg-emerald-50/80 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
              <span>
                Signed in as: <strong>{user.fullName}</strong>
              </span>
            </div>
            <Link
              href={
                user.role === "Instructor" || user.role === "Admin"
                  ? "/studio/courses"
                  : "/course/catalog"
              }
              className="font-semibold underline hover:text-emerald-950 dark:hover:text-emerald-200"
            >
              Continue
            </Link>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive animate-in fade-in">
            <AlertCircle className="size-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="fullName"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <User className="size-3.5 text-muted-foreground" />
              <span>Full Name</span>
            </label>
            <input
              id="fullName"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <Mail className="size-3.5 text-muted-foreground" />
              <span>Email Address</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <Lock className="size-3.5 text-muted-foreground" />
              <span>Password (min. 8 characters)</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-semibold text-foreground flex items-center gap-1.5"
            >
              <Lock className="size-3.5 text-muted-foreground" />
              <span>Confirm Password</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground shadow-2xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full gap-2 rounded-xl py-2.5 font-semibold text-sm shadow-xs mt-2"
          >
            <span>{isLoading ? "Creating account..." : "Create Account"}</span>
            <ArrowRight className="size-4" />
          </Button>
        </form>

        {/* Footer links */}
        <div className="mt-6 border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-primary underline underline-offset-4 hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
