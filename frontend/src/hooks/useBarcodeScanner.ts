import { useEffect, useRef } from 'react';

// Detects hardware barcode-scanner input (a "keyboard wedge"). Scanners type
// characters very fast and end with Enter — much faster than a human. We buffer
// rapid keystrokes and, on Enter, fire onScan(code).
//
// When the user is typing in a real input/textarea we stay out of the way (the
// field's own handlers run), so this only fires for scans made while no field
// is focused — no double-adds with the POS search box.
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
      // A slow gap means human typing — start a fresh buffer.
      if (now - lastTime > maxGapMs) buffer = '';
      lastTime = now;

      if (e.key === 'Enter') {
        if (!typing && buffer.length >= minLength) onScanRef.current(buffer);
        buffer = '';
        return;
      }
      // Only accumulate printable single characters.
      if (e.key.length === 1) buffer += e.key;
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [minLength, maxGapMs]);
}
