// src/utils/runtimeMode.ts
//
// Is this a live till or a development/demo install? The backend answers on
// /api/health (NODE_ENV=production is what the packaged desktop app sets), and
// the SPA uses it to keep the sample sign-ins and the marketing landing page out
// of a pharmacy that is taking real money.
//
// Fail-safe direction: a production build, or a health probe that cannot be
// read, counts as production. Showing "click any role to auto-login" on a live
// till is the mistake worth avoiding; hiding it in development only costs a
// developer two typed fields.
import { useEffect, useState } from 'react';

export interface RuntimeMode {
  production: boolean;
  demoLogin: boolean;
}

const FALLBACK: RuntimeMode = { production: true, demoLogin: false };

let cached: RuntimeMode | null = null;
let pending: Promise<RuntimeMode> | null = null;

export function loadRuntimeMode(): Promise<RuntimeMode> {
  if (cached) return Promise.resolve(cached);
  if (!pending) {
    pending = fetch('/api/health', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return FALLBACK;
        const data = await res.json();
        const production = data?.production === true || import.meta.env.PROD;
        cached = { production, demoLogin: !production && data?.demoLogin !== false };
        return cached;
      })
      .catch(() => FALLBACK)
      .finally(() => { pending = null; });
  }
  return pending;
}

/** Synchronous read for code outside React; FALLBACK until the probe lands. */
export function getRuntimeMode(): RuntimeMode {
  return cached || FALLBACK;
}

export function useRuntimeMode(): RuntimeMode {
  const [mode, setMode] = useState<RuntimeMode>(cached || FALLBACK);

  useEffect(() => {
    let alive = true;
    loadRuntimeMode().then((m) => { if (alive) setMode(m); });
    return () => { alive = false; };
  }, []);

  return mode;
}