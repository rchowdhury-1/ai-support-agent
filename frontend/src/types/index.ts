export interface User {
  id: string;
  name: string;
  email: string;
  plan: 'free' | 'starter' | 'pro' | 'business';
  created_at: string;
}

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  system_prompt: string;
  welcome_message: string;
  color: string;
  created_at: string;
  conversation_count?: number;
}

export interface Conversation {
  id: string;
  agent_id: string;
  session_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  status: 'open' | 'closed' | 'escalated';
  created_at: string;
  agent_name?: string;
  message_count?: number;
  color?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface DashboardStats {
  agents_count: string;
  total_conversations: string;
  open_conversations: string;
  messages_today: string;
  leads_count: string;
  documents_count: string;
}

export interface Lead {
  id: string;
  agent_id: string;
  conversation_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  question: string;
  status: 'new' | 'contacted' | 'closed';
  created_at: string;
  agent_name?: string;
}

export interface KnowledgeDocument {
  id: string;
  agent_id: string;
  filename: string;
  file_size: number;
  chunk_count: number;
  status: 'processing' | 'ready' | 'error';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  name: 'free' | 'starter' | 'pro' | 'business';
}
