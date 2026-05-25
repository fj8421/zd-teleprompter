import { useState, useRef, useEffect, useCallback } from 'react';

export const useSpeedToast = (isFullscreen) => {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  const show = useCallback((value) => {
    setToast(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), isFullscreen ? 1400 : 1800);
  }, [isFullscreen]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { toast, show };
};
