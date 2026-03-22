"use client";

import { supabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="animate-fade-up">
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--font-display)",
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "var(--text)",
        }}>
          the<span style={{ color: "var(--accent)" }}>den</span>kb
        </div>
        <div style={{ color: "var(--text-3)", fontSize: 12, marginTop: 6, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          knowledge base
        </div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
            Sign in
          </div>
          <div style={{ color: "var(--text-2)", fontSize: 13 }}>Access your knowledge base</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", color: "var(--text-2)", fontSize: 12, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Email
            </label>
            <input
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          <div>
            <label style={{ display: "block", color: "var(--text-2)", fontSize: 12, marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
              Password
            </label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px",
              background: "var(--danger-dim)",
              border: "1px solid var(--danger)",
              borderRadius: "var(--radius)",
              color: "var(--danger)",
              fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleLogin}
            disabled={loading || !email || !password}
            style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
          >
            {loading ? <span className="spinner" /> : null}
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20, color: "var(--text-3)", fontSize: 12 }}>
        Access is invite-only. Contact your administrator.
      </div>
    </div>
  );
}
