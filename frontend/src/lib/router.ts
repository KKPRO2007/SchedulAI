import { useSyncExternalStore } from 'react';

// Tiny hash router: #/ (home), #/login, #/app/<page>

function current() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

export function useRoute() {
  return useSyncExternalStore(
    (fn) => {
      window.addEventListener('hashchange', fn);
      return () => window.removeEventListener('hashchange', fn);
    },
    current
  );
}

export function navigate(to: string) {
  if (current() === to) return;
  window.location.hash = to;
  window.scrollTo({ top: 0 });
}
