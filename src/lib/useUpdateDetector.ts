import { useEffect, useState } from 'react';

const POLL_INTERVAL = 5 * 60 * 1000; // check every 5 minutes
const INITIAL_DELAY = 30 * 1000;     // wait 30s after load before first check

async function fetchAppSignature(): Promise<string> {
  try {
    const res = await fetch('/', { cache: 'no-store' });
    const html = await res.text();
    // Vite injects a hashed bundle path on every build, e.g. /assets/index-Abc123.js
    const match = html.match(/src="([^"]*\/assets\/index[^"]+\.js)"/);
    return match ? match[1] : html.slice(0, 300);
  } catch {
    return '';
  }
}

export function useUpdateDetector(): boolean {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    let baselineSignature = '';
    let mounted = true;

    // Capture baseline on mount
    fetchAppSignature().then(sig => {
      baselineSignature = sig;
    });

    const poll = async () => {
      if (!mounted || !baselineSignature) return;
      const current = await fetchAppSignature();
      if (current && current !== baselineSignature) {
        setUpdateAvailable(true);
      }
    };

    // First check after a short delay (avoids false positives during boot)
    const initial = setTimeout(poll, INITIAL_DELAY);
    const interval = setInterval(poll, POLL_INTERVAL);

    return () => {
      mounted = false;
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, []);

  return updateAvailable;
}
