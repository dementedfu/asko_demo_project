export type Role = "client" | "master";
export interface Actor {
  role: Role;
  clientId: string;
}
export type Purpose = "client" | "intake" | "result";
export type WorkStage = "not_started" | "in_progress" | "quality" | "ready";
export interface Issue {
  id: string;
  side: "both" | "left" | "right";
  zone: string;
  category: "dirt" | "damage";
  kind: string;
  severity: 1 | 2 | 3;
  comment: string;
}
export interface QuoteLine {
  serviceId: string;
  name: string;
  price: number;
}
export interface Quote {
  id: string;
  version: number;
  lines: QuoteLine[];
  deadline: string;
  limitations: string;
  reason: string;
  at: string;
}
export interface Decision {
  id: string;
  quoteId: string;
  status: "accepted" | "declined" | "changes";
  comment: string;
  at: string;
}
export interface Pair {
  id: string;
  number: string;
  type: string;
  materials: string[];
  color: string;
  brand: string;
  model: string;
  features: string;
  expectation: string;
  previousCleaning: string;
  condition: string;
  issues: Issue[];
  expertNote: string;
  quotes: Quote[];
  decisions: Decision[];
  excluded: boolean;
  work: WorkStage;
  paused: boolean;
  pauseReason: string;
  custody: "client" | "workshop" | "returned";
  intake?: { at: string; condition: string; accessories: string[] };
  resultNote: string;
  careNote: string;
  eta?: string;
  payment?: { id: string; quoteId: string; amount: number; at: string };
}
export interface ChatMessage {
  id: string;
  text: string;
  actor: string;
  role: Role;
  at: string;
  pairId?: string;
  readBy: string[];
}
export interface HistoryEvent {
  id: string;
  actor: string;
  at: string;
  text: string;
  pairId?: string;
  private?: boolean;
}
export interface Order {
  id: string;
  number: string;
  clientId: string;
  submitted: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
  draftRevision?: number;
  pairs: Pair[];
  delivery: { mode: "self" | "courier"; window: string; note: string };
  messages: ChatMessage[];
  notes: { id: string; text: string; at: string }[];
  events: HistoryEvent[];
  feedback?: { rating: number; text: string; at: string };
}
export interface Client {
  id: string;
  name: string;
  initials: string;
  phone: string;
}
export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
}
export interface Photo {
  id: string;
  orderId: string;
  pairId: string;
  purpose: Purpose;
  zone?: string;
  blob?: Blob;
  asset?: string;
  name: string;
  at: string;
}
export type OrderStatus = "draft" | "active" | "completed" | "cancelled";
export type OrderCommand =
  | { type: "submit" }
  | {
      type: "quote";
      pairId: string;
      expectedQuoteId?: string;
      lines: QuoteLine[];
      deadline: string;
      limitations: string;
      reason: string;
    }
  | {
      type: "decision";
      pairId: string;
      quoteId: string;
      status: Decision["status"];
      comment: string;
    }
  | { type: "exclude"; pairId: string }
  | {
      type: "intake";
      pairId: string;
      condition: string;
      accessories: string[];
      expertNote: string;
    }
  | { type: "start"; pairId: string }
  | { type: "pause"; pairId: string; paused: boolean; reason: string }
  | { type: "quality"; pairId: string }
  | {
      type: "qualityResult";
      pairId: string;
      pass: boolean;
      note: string;
      care: string;
    }
  | { type: "pay"; pairId: string; success: boolean }
  | { type: "return"; pairId: string }
  | { type: "eta"; pairId: string; eta: string; reason: string }
  | { type: "message"; text: string; pairId?: string }
  | { type: "note"; text: string }
  | { type: "read" }
  | { type: "feedback"; rating: number; text: string };
