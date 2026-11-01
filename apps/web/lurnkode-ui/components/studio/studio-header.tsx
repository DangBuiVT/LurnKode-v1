"use client";

import Link from "next/link";
import {
  Sparkles,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";

export function StudioHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 backdrop-blur-sm px-6">
      {/* Left section: Logo + Studio Badge + Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Brand Logo with Cap Icon & Studio Badge */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/studio/courses"
            className="flex items-center gap-2 text-xl font-bold tracking-tight text-primary transition-opacity hover:opacity-90"
          >
            <GraduationCap className="size-5.5 text-primary shrink-0" />
            <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
              LurnKode
            </span>
          </Link>
          <span className="rounded-md border border-border bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 shadow-2xs dark:bg-slate-800 dark:text-slate-300">
            Studio
          </span>
        </div>

        {/* Breadcrumb separator and title */}
        <div className="flex items-center gap-1.5 text-sm">
          <ChevronRight className="size-3.5 text-muted-foreground/60" />
          <span className="font-medium text-foreground">My Courses</span>
        </div>
      </div>

      {/* Right section: Notifications, AI Tutor & User Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <NotificationBell />

        {/* AI Tutor Button (Purple & Amber Accent) */}
        <Button
          variant="outline"
          size="sm"
          className="group relative gap-1.5 rounded-lg border-purple-200/80 bg-purple-50/50 px-3 font-medium text-purple-700 shadow-2xs transition-all hover:border-purple-300 hover:bg-purple-100/70 hover:text-purple-800 dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 dark:hover:bg-purple-900/60"
        >
          <Sparkles className="size-3.5 text-amber-500 transition-transform group-hover:scale-110 group-hover:text-amber-400" />
          <span>AI Tutor</span>
        </Button>

        {/* User Account & Dropdown */}
        <UserMenu />
      </div>
    </header>
  );
}
