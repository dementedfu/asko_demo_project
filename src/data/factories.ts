import type { Order, Pair } from "../domain/model";
export const uid = () => crypto.randomUUID();
export function newPair(): Pair {
  return {
    id: uid(),
    number: uid().slice(0, 4).toUpperCase(),
    type: "",
    materials: ["Не знаю"],
    color: "",
    brand: "",
    model: "",
    features: "",
    expectation: "",
    previousCleaning: "",
    condition: "",
    issues: [],
    expertNote: "",
    quotes: [],
    decisions: [],
    excluded: false,
    work: "not_started",
    paused: false,
    pauseReason: "",
    custody: "client",
    resultNote: "",
    careNote: "",
  };
}
export function newOrder(clientId: string, number: string): Order {
  const now = new Date().toISOString();
  return {
    id: uid(),
    number,
    clientId,
    submitted: false,
    createdAt: now,
    updatedAt: now,
    revision: 0,
    pairs: [newPair()],
    delivery: { mode: "self", window: "", note: "" },
    messages: [],
    notes: [],
    events: [],
  };
}
