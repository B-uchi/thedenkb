import { createClient } from "@/lib/supabase/server";
import { embedBatch, chunkText } from "@/lib/embeddings";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Protect this route — only authenticated users can ingest documents
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function POST(req: NextRequest) {
  // Auth check
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = (formData.get("title") as string) || "Untitled";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "txt";
    const allowedTypes = ["pdf", "txt", "md"];

    if (!allowedTypes.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type: .${ext}. Allowed: pdf, txt, md` },
        { status: 400 }
      );
    }

    // Extract text
    let rawText = "";

    if (ext === "pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      // Dynamic import to avoid Vercel edge issues
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buffer);
      rawText = parsed.text;
    } else {
      // txt or md — read as plain text
      rawText = await file.text();
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
    }

    // Chunk
    const chunks = chunkText(rawText);

    if (chunks.length === 0) {
      return NextResponse.json({ error: "No content found after chunking" }, { status: 400 });
    }

    // Embed all chunks (batch call to HF)
    // HF can handle batches but has limits — split into batches of 32
    const BATCH_SIZE = 32;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batch);
      allEmbeddings.push(...embeddings);
    }

    // Insert parent document record
    const { data: doc, error: docError } = await supabaseAdmin
      .from("kb_documents")
      .insert({
        title: title.trim(),
        source: file.name,
        file_type: ext,
        chunk_count: chunks.length,
        created_by: user.id,
      })
      .select()
      .single();

    if (docError || !doc) {
      console.error("Document insert error:", docError);
      return NextResponse.json({ error: "Failed to create document record" }, { status: 500 });
    }

    // Insert chunks with embeddings
    const chunkRows = chunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      embedding: JSON.stringify(allEmbeddings[i]), // pgvector accepts JSON array
      metadata: {
        source: file.name,
        title,
        chunk_index: i,
        total_chunks: chunks.length,
      },
    }));

    // Insert in batches to avoid payload limits
    const CHUNK_INSERT_BATCH = 50;
    for (let i = 0; i < chunkRows.length; i += CHUNK_INSERT_BATCH) {
      const { error: chunkError } = await supabaseAdmin
        .from("kb_chunks")
        .insert(chunkRows.slice(i, i + CHUNK_INSERT_BATCH));

      if (chunkError) {
        console.error("Chunk insert error:", chunkError);
        // Rollback document
        await supabaseAdmin.from("kb_documents").delete().eq("id", doc.id);
        return NextResponse.json({ error: "Failed to store document chunks" }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      document_id: doc.id,
      chunks: chunks.length,
      title: doc.title,
    });
  } catch (err) {
    console.error("Ingest error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Document ID required" }, { status: 400 });
  }

  // Chunks are deleted via CASCADE in the DB schema
  const { error } = await supabaseAdmin
    .from("kb_documents")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
