import { randomBytes } from "node:crypto";

interface NonceEntry {
  nonce: string;
  issuedAt: string;
  expiresAt: number;
}

const TTL_MS = 5 * 60 * 1000;
const store = new Map<string, NonceEntry>();

export function issueNonce(address: string): NonceEntry {
  const entry: NonceEntry = {
    nonce: randomBytes(16).toString("hex"),
    issuedAt: new Date().toISOString(),
    expiresAt: Date.now() + TTL_MS,
  };
  store.set(address.toLowerCase(), entry);
  return entry;
}

export function peekNonce(address: string): NonceEntry | undefined {
  const entry = store.get(address.toLowerCase());
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(address.toLowerCase());
    return undefined;
  }
  return entry;
}

export function consumeNonce(address: string): NonceEntry | undefined {
  const entry = peekNonce(address);
  if (entry) store.delete(address.toLowerCase());
  return entry;
}
