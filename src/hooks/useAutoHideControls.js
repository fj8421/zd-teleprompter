import { useState, useEffect, useRef, useCallback } from 'react';


export const useAutoHideControls = (active, hideDelay = 3000) => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef(null);

  const activeRef = useRef(active);
  activeRef.current = active;

  const reveal = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (activeRef.current) {
      timerRef.current = setTimeout(() => setVisible(false), hideDelay);
    }
  }, [hideDelay]);

  useEffect(() => {
    if (!active) {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      return undefined;
    }

    reveal();
    const handle = () => reveal();
    document.addEventListener('pointerdown', handle, true);
    document.addEventListener('mousemove', handle);
    document.addEventListener('click', handle);
    document.addEventListener('touchstart', handle);

    return () => {
      document.removeEventListener('pointerdown', handle, true);
      document.removeEventListener('mousemove', handle);
      document.removeEventListener('click', handle);
      document.removeEventListener('touchstart', handle);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, reveal]);

  return { visible, reveal };
};
