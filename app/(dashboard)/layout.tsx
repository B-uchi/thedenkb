import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardNav from "@/components/layout/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="layout-wrapper">
      <DashboardNav userEmail={user.email ?? ""} />
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
}
