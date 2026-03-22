export interface Document {
  id: string;
  title: string;
  source: string;
  file_type: string;
  chunk_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface WhatsAppSession {
  id: string;
  phone_number: string;
  created_at: string;
  last_active: string;
}

export interface Message {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface IngestResponse {
  success: boolean;
  document_id: string;
  chunks: number;
  title: string;
}

export interface QueryResponse {
  answer: string;
  sources: string[];
  session_id: string;
}
