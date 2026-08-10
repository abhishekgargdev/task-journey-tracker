import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import Sidebar from "@/components/shared/sidebar";
import { Header } from "@/components/shared/header";
import AnimateWrapper from "@/components/shared/animate-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar (persistent) */}
      <Sidebar
        user={session}
        className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30"
      />

      {/* Main Content Area */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <Header user={session} />

        {/* Page Content */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
          <AnimateWrapper>{children}</AnimateWrapper>
        </main>
      </div>
    </div>
  );
}
