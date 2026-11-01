"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  LogOut,
  FolderGit2,
  BookOpen,
  LogIn,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export function UserMenu() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/auth/login">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs font-semibold hover:bg-muted"
          >
            <LogIn className="size-3.5" />
            <span>Sign In</span>
          </Button>
        </Link>
        <Link href="/auth/register">
          <Button
            size="sm"
            className="gap-1.5 text-xs font-semibold bg-primary text-primary-foreground shadow-2xs"
          >
            <UserPlus className="size-3.5" />
            <span>Sign Up</span>
          </Button>
        </Link>
      </div>
    );
  }

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    router.replace("/auth/login");
  };

  const isInstructor = user.role === "Instructor";
  const isAdmin = user.role === "Admin";

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl py-1 pl-1.5 pr-2.5 text-sm font-medium transition-colors hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div
          className={`flex size-8 items-center justify-center rounded-lg font-bold text-xs shadow-2xs ${
            isInstructor
              ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
              : isAdmin
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
              : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
          }`}
        >
          {getInitials(user.fullName || "User")}
        </div>

        <div className="flex flex-col items-start text-left leading-tight">
          <span className="text-xs font-semibold text-foreground max-w-[120px] truncate">
            {user.fullName}
          </span>
          <span
            className={`text-[10px] font-medium ${
              isInstructor
                ? "text-purple-600 dark:text-purple-400"
                : isAdmin
                ? "text-amber-600 dark:text-amber-400"
                : "text-blue-600 dark:text-blue-400"
            }`}
          >
            {user.role}
          </span>
        </div>

        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-card p-2 text-foreground shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150 z-50">
          {/* User Profile Header */}
          <div className="border-b border-border/80 px-3 py-2.5 mb-1.5">
            <p className="text-xs font-bold text-foreground">{user.fullName}</p>
            <p className="text-[11px] text-muted-foreground font-mono truncate">
              {user.email}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`inline-block size-1.5 rounded-full ${
                  isInstructor
                    ? "bg-purple-500"
                    : isAdmin
                    ? "bg-amber-500"
                    : "bg-blue-500"
                }`}
              />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Role: {user.role}
              </span>
            </div>
          </div>

          {/* Navigation links */}
          <div className="space-y-0.5 mb-1.5">
            {(isInstructor || isAdmin) && (
              <Link
                href="/studio/courses"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
              >
                <FolderGit2 className="size-3.5 text-purple-600 shrink-0" />
                <span>Creator Studio</span>
              </Link>
            )}

            <Link
              href="/course/catalog"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <BookOpen className="size-3.5 text-primary shrink-0" />
              <span>Course Catalog</span>
            </Link>
          </div>

          {/* Logout Button */}
          <div className="border-t border-border/80 pt-1.5 mt-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
