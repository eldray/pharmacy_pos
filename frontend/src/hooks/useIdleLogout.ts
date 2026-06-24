import { useCallback, useEffect, useRef, useState } from 'react';

interface IdleLogoutOptions {
  timeoutMs?: number;   // total inactivity before logout
  warnMs?: number;      // how long before logout to show the warning
  onTimeout: () => void; // called when the session times out
}

/**
 * Auto-logout after a period of user inactivity.
 * Returns `warning` (true when the countdown warning should show) and
 * `stayActive()` to reset the timer (wire this to a "Stay logged in" button).
 *
 * Any real user activity (mouse/keyboard/touch/scroll) resets the timer.
 */
export function useIdleLogout({
  timeoutMs = 30 * 60 * 1000, // 30 minutes
  warnMs = 60 * 1000,         // warn 1 minute before
  onTimeout,
}: IdleLogoutOptions) {
  const [warning, setWarning] = useState(false);
  const warnTimer = useRef<number | undefined>(undefined);
  const logoutTimer = useRef<number | undefined>(undefined);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const clearTimers = () => {
    if (warnTimer.current) window.clearTimeout(warnTimer.current);
    if (logoutTimer.current) window.clearTimeout(logoutTimer.current);
  };

  const start = useCallback(() => {
    clearTimers();
    setWarning(false);
    warnTimer.current = window.setTimeout(() => setWarning(true), Math.max(0, timeoutMs - warnMs));
    logoutTimer.current = window.setTimeout(() => {
      setWarning(false);
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs, warnMs]);

  const stayActive = useCallback(() => start(), [start]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    let throttled = false;
    const onActivity = () => {
      if (throttled) return;
      throttled = true;
      window.setTimeout(() => { throttled = false; }, 1000);
      start();
    };

    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    start();

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearTimers();
    };
  }, [start]);

  return { warning, stayActive };
}
