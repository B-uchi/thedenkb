"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "◈" },
  { href: "/documents", label: "Documents", icon: "◧" },
];

export default function DashboardNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <nav style={{
      width: 220,
      minHeight: "100vh",
      background: "var(--bg-2)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      padding: "24px 0",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "0 20px 28px", borderBottom: "1px solid var(--border)" }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}>
          the<span style={{ color: "var(--accent)" }}>den</span>kb
        </div>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, padding: "20px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: "var(--radius)",
              color: active ? "var(--accent)" : "var(--text-2)",
              background: active ? "var(--accent-dim)" : "transparent",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              transition: "all 0.15s",
              textDecoration: "none",
            }}
            onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; }}
            onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* User */}
      <div style={{ padding: "20px 12px 0", borderTop: "1px solid var(--border)" }}>
        <div style={{ padding: "8px 12px", marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 2, letterSpacing: "0.05em", textTransform: "uppercase" }}>Signed in as</div>
          <div style={{ fontSize: 12, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userEmail}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="btn btn-ghost"
          style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
        >
          Sign out
        </button>
      </div>
    </nav>
  );
}
