import { useSyncExternalStore } from 'react';
import { api } from './api';

import type { Role, User } from './demoAccounts';
export { DEMO_ACCOUNTS, type Role, type User } from './demoAccounts';

type Session = { token: string; user: User };

const KEY = 'schedulai.session.v2';
const listeners = new Set<() => void>();

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let session = read();

function emit() {
  listeners.forEach((fn) => fn());
}

export async function login(email: string, password: string) {
  const result = await api.post<Session>('/auth/login', { email, password });
  if (result.user.role !== 'faculty') result.user.role = 'admin';
  session = result;
  localStorage.setItem(KEY, JSON.stringify(result));
  emit();
  return result.user;
}

export function logout() {
  session = null;
  localStorage.removeItem(KEY);
  emit();
}

export function useSession() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => session
  );
}

export function useRole(): Role {
  return useSession()?.user.role ?? 'admin';
}
