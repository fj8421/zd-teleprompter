import { useState, useEffect, useCallback } from 'react';

export const useFullscreen = (elementRef) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enter = useCallback(async () => {
    if (!elementRef.current) return;

    const element = elementRef.current;
    const request = element.requestFullscreen
      || element.webkitRequestFullscreen
      || element.mozRequestFullScreen
      || element.msRequestFullscreen;

    if (request) {
      try {
        await request.call(element);
        return;
      } catch (e) {
        console.error('Fullscreen failed, fallback to CSS:', e);
      }
    }

    element.classList.add('css-fullscreen');
    document.body.style.overflow = 'hidden';
    setIsFullscreen(true);
  }, [elementRef]);

  const exit = useCallback(async () => {
    const exitFn = document.exitFullscreen
      || document.webkitExitFullscreen
      || document.mozCancelFullScreen
      || document.msExitFullscreen;

    const fullscreenElement = document.fullscreenElement
      || document.webkitFullscreenElement
      || document.mozFullScreenElement
      || document.msFullscreenElement;

    if (exitFn && fullscreenElement) {
      try {
        await exitFn.call(document);
        return;
      } catch (e) {
        console.error('Exit fullscreen failed:', e);
      }
    }

    elementRef.current?.classList.remove('css-fullscreen');
    document.body.style.overflow = '';
    setIsFullscreen(false);
  }, [elementRef]);

  const toggle = useCallback(() => {
    if (isFullscreen) {
      exit();
    } else {
      enter();
    }
  }, [isFullscreen, enter, exit]);

  useEffect(() => {
    const handleChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        elementRef.current?.classList.contains('css-fullscreen')
      );
      setIsFullscreen(isFull);
    };

    document.addEventListener('fullscreenchange', handleChange);
    document.addEventListener('webkitfullscreenchange', handleChange);
    document.addEventListener('mozfullscreenchange', handleChange);
    document.addEventListener('msfullscreenchange', handleChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleChange);
      document.removeEventListener('webkitfullscreenchange', handleChange);
      document.removeEventListener('mozfullscreenchange', handleChange);
      document.removeEventListener('msfullscreenchange', handleChange);
    };
  }, [elementRef]);

  return {
    isFullscreen,
    enter,
    exit,
    toggle
  };
};
