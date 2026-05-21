import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "@tanstack/react-router";

import { AppHeader } from "./app-header";
import { AppSidebar } from "./app-sidebar";
import { cn } from "~/utils/cn";

interface DashboardShellProps {
  userName: string;
  userEmail: string;
  showAdminNav?: boolean;
  children: ReactNode;
}

export function DashboardShell({ userName, userEmail, showAdminNav, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <AppSidebar className="hidden md:flex" showAdminNav={showAdminNav} />

      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden
      />

      <AppSidebar
        inert={!mobileOpen}
        showAdminNav={showAdminNav}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-60 shrink-0 border-r border-border bg-background transition-transform duration-300 ease-out md:hidden",
          mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full pointer-events-none"
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/30">
        <AppHeader userName={userName} userEmail={userEmail} onMobileMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
