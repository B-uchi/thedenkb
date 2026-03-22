# TheDenKB

RAG-powered knowledge base with WhatsApp bot integration.

**Stack:** Next.js 15 · Supabase (pgvector + SSR auth) · HuggingFace Inference API · Groq · Vercel

---

## Setup

### 1. Supabase

1. Create a new Supabase project
2. Go to **SQL Editor** and run the entire `schema.sql` file
3. Copy your project URL, anon key, and service role key

### 2. HuggingFace

1. Create an account at huggingface.co
2. Go to Settings → Access Tokens → New token (read scope is enough)

### 3. Groq

1. Create an account at console.groq.com
2. Create an API key

### 4. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
HF_TOKEN=
WEBHOOK_SECRET=any_random_string_you_choose
```

`WEBHOOK_SECRET` is used to secure the `/api/rag/query` endpoint from the WhatsApp webhook.

### 5. Install & Run

```bash
npm install
npm run dev
```

---

## WhatsApp Integration

The query endpoint at `/api/rag/query` is designed to receive messages from a WhatsApp webhook.

**Request format (POST):**
```json
{
  "message": "What is the refund policy?",
  "phone_number": "+2348012345678"
}
```

**Required header:**
```
x-webhook-secret: your_webhook_secret
```

**Response:**
```json
{
  "answer": "According to our policy...",
  "session_id": "uuid",
  "sources": ["Document Title"]
}
```

**WhatsApp webhook verification (GET):**
Meta will call `GET /api/rag/query?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`
The route handles this automatically using your `WEBHOOK_SECRET`.

---

## Document Ingestion

Upload documents via the dashboard at `/documents`.

Supported formats: **PDF**, **TXT**, **Markdown**

The pipeline:
1. Extract text from file
2. Chunk into ~400-word segments with 60-word overlap
3. Embed each chunk via HuggingFace `sentence-transformers/all-MiniLM-L6-v2` (384 dimensions)
4. Store in Supabase pgvector

---

## Architecture

```
User → WhatsApp → Meta Webhook → POST /api/rag/query
                                       ↓
                              Embed question (HF API)
                                       ↓
                              pgvector cosine search
                                       ↓
                         Top 5 chunks + conversation history
                                       ↓
                              Groq llama-3.1-8b-instant
                                       ↓
                              Save messages to DB
                                       ↓
                              Return answer to webhook
```

---

## Cost

| Service | Free Tier |
|---|---|
| Supabase | 500MB DB, 2GB bandwidth |
| HuggingFace Inference API | Free with rate limits |
| Groq | Free tier, generous limits |
| Vercel | Free for hobby projects |
| WhatsApp Cloud API | Free for user-initiated convos |

**Total cost to run: $0** at early scale.
