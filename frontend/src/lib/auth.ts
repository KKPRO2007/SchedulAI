import { useSyncExternalStore } from 'react';
import { api, onUnauthorized, setAuth } from './api';
import type { Role, User } from './demoAccounts';
export { DEMO_ACCOUNTS, ROLE_LABEL, isStaff, type Role, type User } from './demoAccounts';

type Session = { token: string; user: User };

const KEY = 'schedulai.session.v3';
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
setAuth(session);

function emit() {
  listeners.forEach((fn) => fn());
}

export async function login(email: string, password: string) {
  const result = await api.post<Session>('/auth/login', { email, password });
  session = result;
  setAuth(result);
  localStorage.setItem(KEY, JSON.stringify(result));
  emit();
  return result.user;
}

export function logout() {
  session = null;
  setAuth(null);
  localStorage.removeItem(KEY);
  emit();
}

// An expired or foreign token (e.g. made in offline demo mode) signs the user out cleanly.
onUnauthorized(() => {
  if (session) logout();
});

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
  return useSession()?.user.role ?? 'student';
}
