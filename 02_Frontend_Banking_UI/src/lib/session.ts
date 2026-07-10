import { useEffect, useState } from "react";
import type { UserAccount } from "./api";

const LS_KEY = "nexus.session";

export interface Session {
  role: "customer" | "employee";
  userId?: string;
  name: string;
  email?: string;
  customerId?: string;
}

export function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function writeSession(s: Session | null) {
  if (typeof window === "undefined") return;
  if (s) localStorage.setItem(LS_KEY, JSON.stringify(s));
  else localStorage.removeItem(LS_KEY);
  window.dispatchEvent(new Event("nexus:session"));
}

export function fromAccount(role: "customer" | "employee", u: UserAccount): Session {
  return {
    role,
    userId: u.userId,
    name: u.name,
    email: u.email,
    customerId: u.customerId || u.linkedCustomerId || undefined,
  };
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
    const onChange = () => setSession(readSession());
    window.addEventListener("nexus:session", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("nexus:session", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return { session, ready, signOut: () => writeSession(null) };
}
