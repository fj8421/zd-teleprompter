import { useRef, useState, useEffect, useCallback } from 'react';

const TEXT_START_RATIO = 0.4;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getLineHeight = (style) => {
  const lineHeight = parseFloat(style.lineHeight);
  if (Number.isFinite(lineHeight)) return lineHeight;
  const fontSize = parseFloat(style.fontSize);
  return Number.isFinite(fontSize) ? fontSize * 1.2 : 0;
};

const computeMetrics = (element, indicatorPosition, readingUnits) => {
  const viewportHeight = window.innerHeight;
  const indicatorPx = viewportHeight * (indicatorPosition / 100);
  const textStartPos = viewportHeight * TEXT_START_RATIO;
  const style = window.getComputedStyle(element);
  const paddingBottom = parseFloat(style.paddingBottom) || 0;
  const textHeight = Math.max(0, element.scrollHeight - paddingBottom);
  const lineHeight = getLineHeight(style);
  const totalDistance = Math.max(0, textHeight + lineHeight);
  const direction = -1;
  const startOffset = indicatorPx - textStartPos;
  const endOffset = startOffset + (direction * totalDistance);

  return { startOffset, endOffset, totalDistance, readingUnits, direction };
};

const applyOffset = (element, offset) => {
  document.documentElement.style.setProperty('--tp-offset', `${offset}px`);
  element.style.setProperty('--tp-offset', `${offset}px`);
};

const countReadingUnits = (text) => {
  const tokens = text.match(/[\p{Script=Han}]|[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu);
  return Math.max(1, tokens?.length ?? 1);
};

const getScrollPixelsPerSecond = (wordsPerMinute, metrics) => {
  if (wordsPerMinute <= 0 || metrics.totalDistance <= 0 || metrics.readingUnits <= 0) {
    return 0;
  }
  return (metrics.totalDistance * wordsPerMinute) / (metrics.readingUnits * 60);
};

const getProgressFromOffset = (offset, metrics) => {
  if (metrics.totalDistance <= 0) return 1;
  const traveled = (offset - metrics.startOffset) * metrics.direction;
  return clamp(traveled / metrics.totalDistance, 0, 1);
};

const getOffsetFromProgress = (progress, metrics) => {
  return metrics.startOffset + (metrics.direction * metrics.totalDistance * progress);
};

const getDurationSeconds = (wordsPerMinute, readingUnits) => {
  if (wordsPerMinute <= 0 || readingUnits <= 0) return 0;
  return Math.max(1, Math.round((readingUnits / wordsPerMinute) * 60));
};

export const useTeleprompter = (contentRef, wordsPerMinute, indicatorPosition, contentKey, playerRef) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const offsetRef = useRef(null);
  const lastTsRef = useRef(0);
  const progressRef = useRef(0);
  const contentKeyRef = useRef(contentKey);
  const readingUnitsRef = useRef(1);
  const metricsRef = useRef({ startOffset: 0, endOffset: 0, totalDistance: 0, readingUnits: 1, direction: -1 });
  const lastProgressSyncRef = useRef(0);

  const refreshMetrics = useCallback(() => {
    if (!contentRef.current) return metricsRef.current;
    const next = computeMetrics(contentRef.current, indicatorPosition, readingUnitsRef.current);
    metricsRef.current = next;
    return next;
  }, [contentRef, indicatorPosition]);

  const setProgressValue = useCallback((value) => {
    const nextProgress = clamp(value, 0, 1);
    progressRef.current = nextProgress;
    document.documentElement.style.setProperty('--tp-progress', `${nextProgress * 100}%`);
    playerRef?.current?.style.setProperty('--tp-progress', `${nextProgress * 100}%`);
    setProgress(nextProgress);
  }, [playerRef]);

  const resetToStart = useCallback((shouldPlay = false) => {
    if (contentRef.current) {
      const { startOffset } = refreshMetrics();
      offsetRef.current = startOffset;
      applyOffset(contentRef.current, startOffset);
    }
    lastTsRef.current = 0;
    setProgressValue(0);
    setIsPlaying(shouldPlay);
  }, [contentRef, refreshMetrics, setProgressValue]);

  const reset = useCallback(() => resetToStart(false), [resetToStart]);
  const restart = useCallback(() => resetToStart(true), [resetToStart]);

  const seekToProgress = useCallback((value) => {
    if (!contentRef.current) return;
    const metrics = refreshMetrics();
    const nextProgress = clamp(value, 0, 1);
    const nextOffset = getOffsetFromProgress(nextProgress, metrics);
    offsetRef.current = clamp(nextOffset, Math.min(metrics.startOffset, metrics.endOffset), Math.max(metrics.startOffset, metrics.endOffset));
    applyOffset(contentRef.current, offsetRef.current);
    lastTsRef.current = 0;
    setProgressValue(nextProgress);
    if (nextProgress < 1) setIsPlaying(false);
  }, [contentRef, refreshMetrics, setProgressValue]);

  const seekByPixels = useCallback((deltaPixels) => {
    if (!contentRef.current) return;
    const metrics = refreshMetrics();
    const currentOffset = offsetRef.current ?? metrics.startOffset;
    const nextOffset = clamp(
      currentOffset + (metrics.direction * deltaPixels),
      Math.min(metrics.startOffset, metrics.endOffset),
      Math.max(metrics.startOffset, metrics.endOffset)
    );
    const nextProgress = getProgressFromOffset(nextOffset, metrics);
    offsetRef.current = nextOffset;
    applyOffset(contentRef.current, nextOffset);
    lastTsRef.current = 0;
    setProgressValue(nextProgress);
    if (nextProgress < 1) setIsPlaying(false);
  }, [contentRef, refreshMetrics, setProgressValue]);

  const play = useCallback(() => {
    if (contentRef.current) {
      const metrics = refreshMetrics();
      const isAtEnd = progressRef.current >= 1
        || (offsetRef.current !== null && Math.abs(offsetRef.current - metrics.endOffset) < 0.001);

      if (offsetRef.current === null || isAtEnd) {
        offsetRef.current = metrics.startOffset;
        applyOffset(contentRef.current, metrics.startOffset);
        setProgressValue(0);
        lastTsRef.current = 0;
      }
    }
    setIsPlaying(true);
  }, [contentRef, refreshMetrics, setProgressValue]);

  const pause = useCallback(() => setIsPlaying(false), []);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  useEffect(() => {
    if (!contentRef.current) return;
    const element = contentRef.current;
    readingUnitsRef.current = countReadingUnits(element.textContent || '');
    setDurationSeconds(getDurationSeconds(wordsPerMinute, readingUnitsRef.current));
    const { startOffset, endOffset, totalDistance } = refreshMetrics();
    const isNewContent = contentKeyRef.current !== contentKey;
    contentKeyRef.current = contentKey;
    offsetRef.current = isNewContent
      ? startOffset
      : clamp(offsetRef.current ?? startOffset, Math.min(startOffset, endOffset), Math.max(startOffset, endOffset));
    applyOffset(element, offsetRef.current);

    const nextProgress = totalDistance > 0
      ? getProgressFromOffset(offsetRef.current, metricsRef.current)
      : 1;
    setProgressValue(nextProgress);
  }, [contentRef, contentKey, refreshMetrics, setProgressValue, wordsPerMinute]);

  useEffect(() => {
    const handleResize = () => {
      refreshMetrics();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [refreshMetrics]);

  useEffect(() => {
    if (!isPlaying || !contentRef.current) return undefined;

    let animationId = null;
    lastTsRef.current = 0;
    lastProgressSyncRef.current = 0;

    const frame = (ts) => {
      const element = contentRef.current;
      if (!element) return;

      const metrics = metricsRef.current;

      if (offsetRef.current === null) {
        offsetRef.current = metrics.startOffset;
        applyOffset(element, offsetRef.current);
      }

      if (!lastTsRef.current) lastTsRef.current = ts;
      let dt = (ts - lastTsRef.current) / 1000;
      dt = Math.min(dt, 0.1);
      lastTsRef.current = ts;

      const pixelsPerSecond = getScrollPixelsPerSecond(wordsPerMinute, metrics);

      if (pixelsPerSecond > 0) {
        offsetRef.current += metrics.direction * pixelsPerSecond * dt;

        const reachedEnd = metrics.direction > 0
          ? offsetRef.current >= metrics.endOffset
          : offsetRef.current <= metrics.endOffset;

        if (reachedEnd) {
          offsetRef.current = metrics.endOffset;
          applyOffset(element, offsetRef.current);
          setProgressValue(1);
          setIsPlaying(false);
          return;
        }

        offsetRef.current = clamp(
          offsetRef.current,
          Math.min(metrics.startOffset, metrics.endOffset),
          Math.max(metrics.startOffset, metrics.endOffset)
        );
        applyOffset(element, offsetRef.current);

        if (ts - lastProgressSyncRef.current > 250) {
          setProgressValue(getProgressFromOffset(offsetRef.current, metrics));
          lastProgressSyncRef.current = ts;
        }
      } else if (metrics.totalDistance <= 0 && progressRef.current !== 1) {
        setProgressValue(1);
      }

      animationId = requestAnimationFrame(frame);
    };

    animationId = requestAnimationFrame(frame);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPlaying, wordsPerMinute, contentRef, setProgressValue]);

  return {
    isPlaying,
    progress,
    durationSeconds,
    play,
    pause,
    toggle,
    restart,
    reset,
    seekToProgress,
    seekByPixels
  };
};
