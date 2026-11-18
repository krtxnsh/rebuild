import { useEffect, useState } from 'react';

export function useOfflineReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
    let mounted = true;
    const base = new URL(import.meta.env.BASE_URL, document.baseURI);
    navigator.serviceWorker.register(new URL('sw.js', base)).then(() => navigator.serviceWorker.ready)
      .then(registration => {
        if (mounted && registration.scope === base.href) setReady(true);
      }).catch(error => console.warn('REBUILD offline setup failed.', error));
    return () => { mounted = false; };
  }, []);
  return ready;
}
