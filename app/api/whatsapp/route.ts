import { NextRequest, NextResponse } from "next/server";

// Verify webhook (Meta's challenge)
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

// Receive messages from Meta and forward to RAG query
export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    // Extract message from Meta's nested payload
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    // Ignore non-text messages (images, audio, etc.) for now
    if (!message || message.type !== "text") {
      return NextResponse.json({ status: "ignored" });
    }

    const userMessage = message.text.body;
    const phoneNumber = message.from; // e.g. "2348012345678"

    // Call your RAG query route internally
    const ragRes = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/rag/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": process.env.WEBHOOK_SECRET!,
        },
        body: JSON.stringify({ message: userMessage, phone_number: phoneNumber }),
      }
    );

    const { answer } = await ragRes.json();

    // Send reply back via WhatsApp Cloud API
    await fetch(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "text",
          text: { body: answer },
        }),
      }
    );

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    console.error("WhatsApp handler error:", err);
    // Always return 200 to Meta — otherwise it retries endlessly
    return NextResponse.json({ status: "error" }, { status: 200 });
  }
}