import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: docCount } = await supabase
    .from("kb_documents")
    .select("*", { count: "exact", head: true });

  const { count: chunkCount } = await supabase
    .from("kb_chunks")
    .select("*", { count: "exact", head: true });

  const { count: sessionCount } = await supabase
    .from("wa_sessions")
    .select("*", { count: "exact", head: true });

  const stats = [
    { label: "Documents", value: docCount ?? 0, icon: "◧", color: "var(--accent)" },
    { label: "Chunks", value: chunkCount ?? 0, icon: "⊞", color: "#47a0ff" },
    { label: "WA Sessions", value: sessionCount ?? 0, icon: "◈", color: "#47ffb0" },
  ];

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 8 }}>
          Overview
        </h1>
        <p style={{ color: "var(--text-2)" }}>Your knowledge base at a glance.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="card animate-fade-up" style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <span style={{ fontSize: 22, color: stat.color }}>{stat.icon}</span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 800, color: stat.color, lineHeight: 1 }}>
              {stat.value.toLocaleString()}
            </div>
            <div style={{ color: "var(--text-2)", fontSize: 13, marginTop: 6 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 24, borderColor: "var(--accent-dim)", background: "var(--accent-dim)" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <span style={{ color: "var(--accent)", fontSize: 18, marginTop: 2 }}>◈</span>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, marginBottom: 4 }}>RAG Pipeline Status</div>
            <div style={{ color: "var(--text-2)", fontSize: 13 }}>
              Embeddings via HuggingFace <code style={{ color: "var(--accent)", background: "var(--bg)", padding: "1px 6px", borderRadius: 4 }}>sentence-transformers/all-MiniLM-L6-v2</code> · 
              LLM via <code style={{ color: "var(--accent)", background: "var(--bg)", padding: "1px 6px", borderRadius: 4 }}>Groq / llama-3.1-8b</code> · 
              Vector store via <code style={{ color: "var(--accent)", background: "var(--bg)", padding: "1px 6px", borderRadius: 4 }}>pgvector</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
