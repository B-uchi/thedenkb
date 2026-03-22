import { embedText } from "@/lib/embeddings";
import { supabaseAdmin } from "@/lib/supabase/server";
import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Verify webhook secret for WhatsApp integration
function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = req.headers.get("x-webhook-secret");
  return secret === process.env.WEBHOOK_SECRET;
}

async function getOrCreateSession(
  admin: typeof supabaseAdmin,
  phoneNumber: string
): Promise<string> {
  // Check for existing session
  const { data: existing } = await admin
    .from("wa_sessions")
    .select("id")
    .eq("phone_number", phoneNumber)
    .single();

  if (existing) {
    // Update last_active
    await admin
      .from("wa_sessions")
      .update({ last_active: new Date().toISOString() })
      .eq("id", existing.id);
    return existing.id;
  }

  // Create new session
  const { data: newSession, error } = await admin
    .from("wa_sessions")
    .insert({ phone_number: phoneNumber })
    .select("id")
    .single();

  if (error || !newSession) throw new Error("Failed to create session");
  return newSession.id;
}

async function getRecentMessages(
  admin: typeof supabaseAdmin,
  sessionId: string,
  limit = 6
) {
  const { data } = await admin
    .from("wa_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Return in chronological order
  return (data ?? []).reverse();
}

async function saveMessages(
  admin: typeof supabaseAdmin,
  sessionId: string,
  userMessage: string,
  assistantMessage: string
) {
  await admin.from("wa_messages").insert([
    { session_id: sessionId, role: "user", content: userMessage },
    { session_id: sessionId, role: "assistant", content: assistantMessage },
  ]);
}

async function retrieveContext(
  admin: typeof supabaseAdmin,
  queryEmbedding: number[],
  matchThreshold = 0.3,
  matchCount = 5
): Promise<{ content: string; source: string; title: string }[]> {
  const { data, error } = await admin.rpc("match_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    console.error("Vector search error:", error);
    return [];
  }

  return data ?? [];
}

export async function POST(req: NextRequest) {
  // This endpoint is called by WhatsApp webhook — verify secret
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, phone_number } = body as {
      message: string;
      phone_number: string;
    };

    if (!message || !phone_number) {
      return NextResponse.json(
        { error: "message and phone_number are required" },
        { status: 400 }
      );
    }

    // 1. Get or create WhatsApp session
    const sessionId = await getOrCreateSession(supabaseAdmin, phone_number);

    // 2. Embed the user's question
    const queryEmbedding = await embedText(message);

    // 3. Retrieve relevant knowledge base chunks
    const contextChunks = await retrieveContext(supabaseAdmin, queryEmbedding);

    // 4. Get recent conversation history for context
    const history = await getRecentMessages(supabaseAdmin, sessionId);

    // 5. Build prompt
    const contextText =
      contextChunks.length > 0
        ? contextChunks.map((c) => `[Source: ${c.title}]\n${c.content}`).join("\n\n---\n\n")
        : "No relevant documents found.";

    const systemPrompt = `You are a helpful assistant for The Den. Answer questions using the knowledge base context provided below.

Rules:
- Only answer based on the provided context
- If the context doesn't contain the answer, say "I don't have information about that in my knowledge base"
- Be concise and clear — responses will be sent via WhatsApp
- Do not use markdown formatting (no **, no #, no bullet dashes) — use plain text only
- Keep responses under 400 characters when possible

Knowledge Base Context:
${contextText}`;

    // 6. Call Groq with conversation history
    const messages: Groq.Chat.ChatCompletionMessageParam[] = [
      ...history.map((m: {role: string, content: string}) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 512,
      temperature: 0.3,
    });

    const answer = completion.choices[0].message.content ?? "I'm unable to answer right now.";

    // 7. Persist both messages
    await saveMessages(supabaseAdmin, sessionId, message, answer);

    return NextResponse.json({
      answer,
      session_id: sessionId,
      sources: [...new Set(contextChunks.map((c) => c.title))],
    });
  } catch (err) {
    console.error("Query error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// WhatsApp webhook verification (GET) — Meta sends a hub.verify_token challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_SECRET) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
