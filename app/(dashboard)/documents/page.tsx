"use client";

import { supabase } from "@/lib/supabase/client";
import type { Document } from "@/types";
import { useEffect, useRef, useState } from "react";

function FileTag({ type }: { type: string }) {
  const map: Record<string, string> = { pdf: "tag-pdf", txt: "tag-txt", md: "tag-md" };
  return <span className={`tag ${map[type] ?? "tag-txt"}`}>{type}</span>;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from("kb_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setDocuments(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name.replace(/\.[^/.]+$/, ""));

    try {
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setSuccess(`✓ "${data.title}" ingested — ${data.chunks} chunks created`);
        fetchDocuments();
      }
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}" and all its chunks?`)) return;
    setDeletingId(id);

    const res = await fetch(`/api/rag/ingest?id=${id}`, { method: "DELETE" });

    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSuccess(`✓ "${title}" deleted`);
    } else {
      setError("Delete failed");
    }

    setDeletingId(null);
  };

  return (
    <div style={{ padding: 40, maxWidth: 1000, width: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Documents
          </h1>
          <p style={{ color: "var(--text-2)" }}>
            {documents.length} document{documents.length !== 1 ? "s" : ""} in knowledge base
          </p>
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleUpload}
            style={{ display: "none" }}
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <span
              className="btn btn-primary"
              style={{ cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1 }}
            >
              {uploading ? <span className="spinner" style={{ borderTopColor: "#0a0a0a" }} /> : <span className="mr-1">↑</span>}
              {uploading ? "Processing..." : "Upload document"}
            </span>
          </label>
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div style={{ padding: "12px 16px", background: "var(--danger-dim)", border: "1px solid var(--danger)", borderRadius: "var(--radius)", color: "var(--danger)", marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ padding: "12px 16px", background: "var(--success-dim)", border: "1px solid var(--success)", borderRadius: "var(--radius)", color: "var(--success)", marginBottom: 20, fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Supported formats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        <span style={{ color: "var(--text-3)", fontSize: 12 }}>Supported:</span>
        <FileTag type="pdf" />
        <FileTag type="txt" />
        <FileTag type="md" />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
            <span className="spinner" />
          </div>
        ) : documents.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>◧</div>
            <div style={{ color: "var(--text-2)", marginBottom: 6 }}>No documents yet</div>
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>Upload a PDF, TXT, or Markdown file to get started</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Title", "Type", "Chunks", "Added", ""].map((h) => (
                  <th key={h} style={{
                    padding: "12px 20px",
                    textAlign: "left",
                    color: "var(--text-3)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc, i) => (
                <tr
                  key={doc.id}
                  style={{
                    borderBottom: i < documents.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ fontWeight: 500, marginBottom: 2 }}>{doc.title}</div>
                    <div style={{ color: "var(--text-3)", fontSize: 12 }}>{doc.source}</div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <FileTag type={doc.file_type} />
                  </td>
                  <td style={{ padding: "16px 20px", color: "var(--text-2)" }}>
                    {doc.chunk_count}
                  </td>
                  <td style={{ padding: "16px 20px", color: "var(--text-3)", fontSize: 12 }}>
                    {new Date(doc.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <button
                      className="btn btn-danger"
                      style={{ fontSize: 12, padding: "6px 12px" }}
                      onClick={() => handleDelete(doc.id, doc.title)}
                      disabled={deletingId === doc.id}
                    >
                      {deletingId === doc.id ? <span className="spinner" /> : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
