import { useEffect, useRef } from 'react';

export function useBarcodeScanner(
  onScan: (code: string) => void,
  { minLength = 3, maxGapMs = 50 }: { minLength?: number; maxGapMs?: number } = {}
) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let buffer = '';
    let lastTime = 0;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      const now = Date.now();
      if (now - lastTime > maxGapMs) buffer = '';
      lastTime = now;

      if (e.key === 'Enter') {
        if (!typing && buffer.length >= minLength) onScanRef.current(buffer);
        buffer = '';
        return;
      }

      // ✅ Guard: e.key can be undefined on some synthetic/OS-level events
      if (typeof e.key === 'string' && e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [minLength, maxGapMs]);
}