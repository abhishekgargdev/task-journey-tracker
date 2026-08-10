"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Menu, LogOut, Shield, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "./sidebar";
import { logoutAction, type SessionUser } from "@/app/actions/auth";

interface HeaderProps {
  user: SessionUser | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();

  const getPageTitle = (path: string) => {
    if (path === "/") return "Dashboard Overview";
    if (path.startsWith("/tasks")) return "Tasks Delivery";
    if (path.startsWith("/sprints")) return "Sprints Planning";
    if (path.startsWith("/stories")) return "User Stories Catalog";
    if (path.startsWith("/stages")) return "Stage Catalog Configuration";
    if (path.startsWith("/users")) return "User Directory";
    return "Task Journey Tracker";
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-card px-4 shadow-sm sm:px-6">
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger Sheet */}
        <Sheet>
          <SheetTrigger render={
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          } />
          <SheetContent side="left" className="p-0 w-64 border-r border-border bg-card">
            <Sidebar user={user} isMobile />
          </SheetContent>
        </Sheet>

        {/* Page Title */}
        <h1 className="text-lg font-semibold text-foreground tracking-tight sm:text-xl">
          {getPageTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* User Role Badge */}
        {user?.role === "admin" && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5" />
            Admin Mode
          </div>
        )}

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <button className="flex items-center gap-2 rounded-full p-1.5 text-sm hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              <Avatar className="h-8 w-8 ring-2 ring-primary/10">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-xs">
                  {user ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="font-medium text-foreground leading-tight">{user?.name || "User"}</span>
                <span className="text-[11px] text-muted-foreground">{user?.email || ""}</span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
            </button>
          } />
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="flex flex-col px-2 py-1.5 text-xs text-muted-foreground sm:hidden">
              <span className="font-semibold text-foreground">{user?.name}</span>
              <span>{user?.email}</span>
              {user?.role === "admin" && (
                <span className="mt-1 font-bold text-primary text-[10px]">Admin Privilege</span>
              )}
            </div>
            {user?.role === "admin" && <DropdownMenuSeparator className="sm:hidden" />}
            <DropdownMenuItem render={
              <form action={handleLogout} className="w-full" />
            }>
              <button type="submit" className="flex w-full items-center gap-2 cursor-pointer text-destructive focus:text-destructive-foreground bg-transparent border-none text-left w-full h-full p-1.5 text-sm">
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
