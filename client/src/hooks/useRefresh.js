import { useEffect, useRef } from 'react';

export function useRefresh(refresh, intervalMs = 30000) {
  const cbRef = useRef(refresh);
  cbRef.current = refresh;

  useEffect(() => {
    const onRefresh = () => cbRef.current();
    window.addEventListener('pf-refresh', onRefresh);
    const id = setInterval(() => cbRef.current(), intervalMs);
    return () => {
      window.removeEventListener('pf-refresh', onRefresh);
      clearInterval(id);
    };
  }, [intervalMs]);
}

export function triggerRefresh() {
  window.dispatchEvent(new CustomEvent('pf-refresh'));
}
