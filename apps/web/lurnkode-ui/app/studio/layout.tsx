import { Suspense } from "react";
import { StudioHeader } from "@/components/studio/studio-header";
import { StudioSidebar } from "@/components/studio/studio-sidebar";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<div className="h-16 w-full border-b border-border bg-card/90" />}>
        <StudioHeader />
      </Suspense>
      <div className="flex flex-1">
        <Suspense fallback={<aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4" />}>
          <StudioSidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading studio...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
