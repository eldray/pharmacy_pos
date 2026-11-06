import { useEffect, useState } from 'react';

const POLL_MS = 20000;

// Measures whether the API answers, so the sidebar pill stops claiming "Online"
// while the backend is unreachable and sales are silently failing.
export function useBackendOnline() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };

    check();
    const timer = setInterval(check, POLL_MS);
    window.addEventListener('online', check);
    window.addEventListener('offline', check);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('online', check);
      window.removeEventListener('offline', check);
    };
  }, []);

  return online;
}
