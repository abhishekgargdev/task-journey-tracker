"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CheckSquare,
  Milestone,
  BookOpen,
  Settings,
  Users as UsersIcon,
  LogOut,
  FolderGit,
  User,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type SessionUser } from "@/app/actions/auth";

interface SidebarProps {
  user: SessionUser | null;
  className?: string;
  isMobile?: boolean;
}

export function Sidebar({ user, className, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const mainNavItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Stories Workspace", href: "/stories", icon: BookOpen },
    { name: "Daily Planner", href: "/tasks", icon: CheckSquare },
    { name: "Ad-hoc Tasks", href: "/adhoc-tasks", icon: Zap },
  ];

  const adminNavItems = [
    { name: "Profile Settings", href: "/settings/profile", icon: User },
    { name: "Stage Catalog", href: "/settings/stages", icon: Settings },
    { name: "Users", href: "/users", icon: UsersIcon },
  ];

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };


  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border select-none",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <FolderGit className="h-6 w-6 text-primary flex-shrink-0" />
        <span className="font-bold text-foreground text-base tracking-tight truncate">
          Journey Tracker
        </span>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
        {/* Main Section */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Workspaces
          </p>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors duration-150",
                      active
                        ? "text-primary"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Settings/Admin Section */}
        <div className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Settings
          </p>
          <nav className="space-y-1">
            {adminNavItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-colors duration-150",
                      active
                        ? "text-primary"
                        : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                    )}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Footer Card */}
      <div className="border-t border-sidebar-border p-4 bg-sidebar-accent/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">
              {user?.name || "No User"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {user?.email || ""}
            </span>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-destructive transition-colors focus:outline-none cursor-pointer border-none bg-transparent"
          >
            <LogOut className="h-4 w-4" />
            <span className="sr-only">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
