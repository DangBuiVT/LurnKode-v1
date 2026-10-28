import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export default function CourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Suspense fallback={<div className="h-16 w-full border-b border-border bg-card/90" />}>
        <Header />
      </Suspense>
      <div className="flex flex-1">
        <Suspense fallback={<aside className="w-56 shrink-0 border-r border-border bg-card/50 p-4" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading course details...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
