import { useEffect, useRef, useState, useCallback } from 'react';
import { useSettings } from '../store/SettingsContext';
import { SETTINGS_LIMITS } from '../config/settingsDefaults';

const BASE_WIDTH = 240;
const DEFAULT_ASPECT = 16 / 9;
const EDGE_MARGIN = 4;
const BOTTOM_RESERVED = 8;
const CONTROLS_MIN_WIDTH = 150;

const formatDuration = (ms) => {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const resolvePixelPosition = (raw, viewportWidth, viewportHeight, width, height) => {
  const maxLeft = Math.max(EDGE_MARGIN, viewportWidth - width - EDGE_MARGIN);
  const maxTop = Math.max(EDGE_MARGIN, viewportHeight - height - BOTTOM_RESERVED);
  if (!raw || typeof raw !== 'object') {
    return { left: maxLeft, top: maxTop };
  }
  if (typeof raw.xRatio === 'number' && typeof raw.yRatio === 'number') {
    const left = raw.xRatio * (viewportWidth - width);
    const top = raw.yRatio * (viewportHeight - height);
    return { left, top };
  }
  const left = typeof raw.x === 'number' ? (raw.x < 0 ? viewportWidth - width + raw.x : raw.x) : maxLeft;
  const top = typeof raw.y === 'number' ? (raw.y < 0 ? viewportHeight - height + raw.y : raw.y) : maxTop;
  return { left, top };
};

const clampPosition = (left, top, width, height, viewportWidth, viewportHeight) => {
  const maxLeft = Math.max(EDGE_MARGIN, viewportWidth - width - EDGE_MARGIN);
  const maxTop = Math.max(EDGE_MARGIN, viewportHeight - height - BOTTOM_RESERVED);
  return {
    left: Math.min(maxLeft, Math.max(EDGE_MARGIN, left)),
    top: Math.min(maxTop, Math.max(EDGE_MARGIN, top))
  };
};

const toRatio = (left, top, width, height, viewportWidth, viewportHeight) => {
  const denomX = Math.max(1, viewportWidth - width);
  const denomY = Math.max(1, viewportHeight - height);
  return {
    xRatio: Math.min(1, Math.max(0, left / denomX)),
    yRatio: Math.min(1, Math.max(0, top / denomY))
  };
};

const SwitchIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 2l3 3-3 3" />
    <path d="M3 11V9a4 4 0 0 1 4-4h13" />
    <path d="M7 22l-3-3 3-3" />
    <path d="M21 13v2a4 4 0 0 1-4 4H4" />
  </svg>
);

const RecordDot = ({ active }) => (
  <span
    style={{
      width: 10,
      height: 10,
      borderRadius: active ? 2 : '50%',
      background: '#ff453a',
      display: 'inline-block',
      animation: active ? 'tp-rec-pulse 1.2s ease-in-out infinite' : 'none'
    }}
  />
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v12" />
    <path d="M7 11l5 5 5-5" />
    <path d="M5 20h14" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </svg>
);

const PlaybackIcon = ({ playing }) => (
  playing ? (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
      <path d="M7 5v14l12-7z" />
    </svg>
  )
);

const ResizeIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 4L8 16" />
    <path d="M20 11V4h-7" />
    <path d="M4 20l5-5" />
    <path d="M4 14v6h6" />
  </svg>
);

const pipButtonStyle = (extra = {}) => ({
  pointerEvents: 'auto',
  width: 28,
  height: 28,
  borderRadius: '50%',
  background: 'rgba(28, 28, 30, 0.78)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  border: 'none',
  padding: 0,
  ...extra
});

export const CameraPreview = ({
  stream,
  error,
  devices,
  isRecording,
  durationMs,
  previewUrl,
  hasPreview,
  onSwitchCamera,
  onToggleRecord,
  onClose,
  onDownload,
  onDiscardPreview
}) => {
  const { settings, dispatch } = useSettings();
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const [viewport, setViewport] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 0,
    h: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  const [position, setPosition] = useState(null);
  const [scale, setScale] = useState(settings.pipScale || 1);
  const [aspect, setAspect] = useState(DEFAULT_ASPECT);
  const [showControls, setShowControls] = useState(true);
  const [playbackPlaying, setPlaybackPlaying] = useState(false);

  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, y: 0, scale: 1 });
  const pointersRef = useRef(new Map());
  const pinchStartRef = useRef(null);
  const hideTimerRef = useRef(null);

  const width = BASE_WIDTH * scale;
  const height = width / aspect;
  const inPreview = hasPreview && !isRecording;
  const tooSmallForControls = width < CONTROLS_MIN_WIDTH;

  useEffect(() => {
    const handleResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  useEffect(() => {
    setScale(Math.max(SETTINGS_LIMITS.pipScale.min, Math.min(SETTINGS_LIMITS.pipScale.max, settings.pipScale || 1)));
  }, [settings.pipScale]);

  useEffect(() => {
    if (draggingRef.current) return;
    const resolved = resolvePixelPosition(settings.pipPosition, viewport.w, viewport.h, width, height);
    const clamped = clampPosition(resolved.left, resolved.top, width, height, viewport.w, viewport.h);
    setPosition(clamped);
  }, [viewport.w, viewport.h, settings.pipPosition, width, height]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const playVideo = ({ retryMuted = false } = {}) => {
      const promise = video.play?.();
      if (promise?.then) {
        promise.then(() => setPlaybackPlaying(true)).catch(() => {
          if (retryMuted && !video.muted) {
            video.muted = true;
            const mutedPromise = video.play?.();
            if (mutedPromise?.then) {
              mutedPromise.then(() => setPlaybackPlaying(true)).catch(() => setPlaybackPlaying(false));
            }
            return;
          }
          setPlaybackPlaying(false);
        });
      }
    };

    video.playsInline = true;
    if (inPreview) {
      video.pause();
      video.srcObject = null;
      video.src = previewUrl || '';
      video.loop = true;
      video.muted = false;
      video.defaultMuted = false;
      video.load();
      playVideo({ retryMuted: true });
    } else if (stream) {
      video.pause();
      video.src = '';
      video.removeAttribute('src');
      video.load();
      video.srcObject = stream;
      video.loop = false;
      video.muted = true;
      video.defaultMuted = true;
      setPlaybackPlaying(false);
      playVideo();
    }
  }, [inPreview, previewUrl, stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const updateAspect = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw > 0 && vh > 0) setAspect(vw / vh);
    };
    const onPlay = () => setPlaybackPlaying(true);
    const onPause = () => setPlaybackPlaying(false);
    video.addEventListener('loadedmetadata', updateAspect);
    video.addEventListener('resize', updateAspect);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    if (video.readyState >= 1) updateAspect();
    return () => {
      video.removeEventListener('loadedmetadata', updateAspect);
      video.removeEventListener('resize', updateAspect);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [stream, previewUrl, inPreview]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return undefined;
    const blockTouch = (event) => {
      if (event.target.closest('[data-pip-control], [data-pip-resize]')) return;
      event.preventDefault();
    };
    node.addEventListener('touchstart', blockTouch, { passive: false });
    node.addEventListener('touchmove', blockTouch, { passive: false });
    return () => {
      node.removeEventListener('touchstart', blockTouch);
      node.removeEventListener('touchmove', blockTouch);
    };
  }, []);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 2200);
  }, []);

  useEffect(() => {
    showControlsTemporarily();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [showControlsTemporarily]);

  useEffect(() => {
    if (!tooSmallForControls) showControlsTemporarily();
  }, [tooSmallForControls, showControlsTemporarily]);

  const persistPosition = useCallback((left, top) => {
    const ratio = toRatio(left, top, width, height, viewport.w, viewport.h);
    dispatch({ type: 'SET_PIP_POSITION', value: ratio });
  }, [viewport.w, viewport.h, width, height, dispatch]);

  const handleContainerPointerDown = useCallback((event) => {
    if (event.target.closest('[data-pip-control]')) return;
    if (event.target.closest('[data-pip-resize]')) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      pinchStartRef.current = { distance: Math.hypot(dx, dy), scale };
      draggingRef.current = false;
      return;
    }

    draggingRef.current = true;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      left: position?.left ?? 0,
      top: position?.top ?? 0
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    showControlsTemporarily();
  }, [position, scale, showControlsTemporarily]);

  const handleContainerPointerMove = useCallback((event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const distance = Math.hypot(dx, dy);
      const ratio = distance / pinchStartRef.current.distance;
      const next = Math.max(
        SETTINGS_LIMITS.pipScale.min,
        Math.min(SETTINGS_LIMITS.pipScale.max, pinchStartRef.current.scale * ratio)
      );
      setScale(Number(next.toFixed(2)));
      return;
    }

    if (!draggingRef.current || !position) return;
    const dx = event.clientX - dragStartRef.current.x;
    const dy = event.clientY - dragStartRef.current.y;
    const next = clampPosition(
      dragStartRef.current.left + dx,
      dragStartRef.current.top + dy,
      width,
      height,
      viewport.w,
      viewport.h
    );
    setPosition(next);
  }, [position, width, height, viewport.w, viewport.h]);

  const handleContainerPointerUp = useCallback((event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }
    if (draggingRef.current) {
      draggingRef.current = false;
      if (position) persistPosition(position.left, position.top);
    }
    if (containerRef.current?.hasPointerCapture?.(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }
  }, [position, persistPosition]);

  useEffect(() => {
    const onMove = (e) => {
      if (!resizingRef.current) return;
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      const delta = (dx - dy) / 200;
      const next = Math.max(
        SETTINGS_LIMITS.pipScale.min,
        Math.min(SETTINGS_LIMITS.pipScale.max, resizeStartRef.current.scale + delta)
      );
      setScale(Number(next.toFixed(2)));
    };
    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = false;
      dispatch({ type: 'SET_PIP_SCALE', value: scale });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [scale, dispatch]);

  const handleResizePointerDown = useCallback((event) => {
    event.stopPropagation();
    resizingRef.current = true;
    resizeStartRef.current = { x: event.clientX, y: event.clientY, scale };
    showControlsTemporarily();
  }, [scale, showControlsTemporarily]);

  const handleTogglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inPreview && video.muted) {
      video.muted = false;
      if (video.paused) video.play().catch(() => {});
      return;
    }
    if (video.paused) {
      if (inPreview) video.muted = false;
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [inPreview]);

  if (!position) return null;

  const errorText = (() => {
    switch (error) {
      case 'CAMERA_DENIED': return '摄像头被拒绝';
      case 'CAMERA_NOT_FOUND': return '未找到摄像头';
      case 'CAMERA_UNSUPPORTED': return '当前浏览器不支持';
      case 'CAMERA_ERROR': return '摄像头出错';
      default: return null;
    }
  })();

  const showSwitch = !inPreview;
  const mirrorTransform = !inPreview && settings.pipMirror ? 'scaleX(-1)' : 'none';
  const hasVideoSource = !!stream || inPreview;

  return (
    <div
      ref={containerRef}
      data-no-scrub="true"
      onPointerDown={handleContainerPointerDown}
      onPointerMove={handleContainerPointerMove}
      onPointerUp={handleContainerPointerUp}
      onPointerCancel={handleContainerPointerUp}
      onMouseEnter={showControlsTemporarily}
      onMouseMove={showControlsTemporarily}
      style={{
        position: 'fixed',
        left: position.left,
        top: position.top,
        width,
        height,
        borderRadius: 12,
        overflow: 'hidden',
        background: '#000',
        boxShadow: inPreview
          ? '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 214, 10, 0.6)'
          : '0 8px 24px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        zIndex: 220,
        cursor: draggingRef.current ? 'grabbing' : 'grab',
        touchAction: 'none',
        userSelect: 'none'
      }}
    >
      {hasVideoSource ? (
        <video
          ref={videoRef}
          autoPlay={!inPreview}
          playsInline
          muted={!inPreview}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transform: mirrorTransform,
            pointerEvents: 'none',
            display: 'block',
            background: '#000'
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontSize: 12,
            padding: 12,
            textAlign: 'center'
          }}
        >
          {errorText || '正在打开摄像头...'}
        </div>
      )}

      {isRecording && !tooSmallForControls && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            left: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            background: 'rgba(0, 0, 0, 0.55)',
            color: '#fff',
            borderRadius: 999,
            fontSize: 11,
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none'
          }}
        >
          <RecordDot active />
          <span>REC {formatDuration(durationMs)}</span>
        </div>
      )}

      {inPreview && showControls && !tooSmallForControls && (
        <button
          data-pip-control="true"
          onClick={(e) => { e.stopPropagation(); onDownload?.(); showControlsTemporarily(); }}
          onPointerDown={(e) => e.stopPropagation()}
          type="button"
          aria-label="下载录像"
          title="下载录像"
          style={pipButtonStyle({
            position: 'absolute',
            top: 6,
            left: 6,
            background: 'rgba(255, 214, 10, 0.92)',
            color: '#1c1c1e'
          })}
        >
          <DownloadIcon />
        </button>
      )}

      {inPreview && !tooSmallForControls && (
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            padding: '3px 8px',
            background: 'rgba(0, 0, 0, 0.55)',
            color: '#fff',
            borderRadius: 999,
            fontSize: 11,
            fontVariantNumeric: 'tabular-nums',
            pointerEvents: 'none'
          }}
        >
          预览
        </div>
      )}

      {showControls && !tooSmallForControls && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 6,
            pointerEvents: 'none'
          }}
        >
          {showSwitch && (
            <button
              data-pip-control="true"
              onClick={(e) => { e.stopPropagation(); onSwitchCamera?.(); showControlsTemporarily(); }}
              onPointerDown={(e) => e.stopPropagation()}
              type="button"
              aria-label="切换摄像头"
              title="切换摄像头"
              style={pipButtonStyle()}
            >
              <SwitchIcon />
            </button>
          )}

          {inPreview ? (
            <>
              <button
                data-pip-control="true"
                onClick={(e) => { e.stopPropagation(); handleTogglePlayback(); showControlsTemporarily(); }}
                onPointerDown={(e) => e.stopPropagation()}
                type="button"
                aria-label={playbackPlaying ? '暂停' : '播放'}
                title={playbackPlaying ? '暂停' : '播放'}
                style={pipButtonStyle()}
              >
                <PlaybackIcon playing={playbackPlaying} />
              </button>
              <button
                data-pip-control="true"
                onClick={(e) => { e.stopPropagation(); onDiscardPreview?.(); showControlsTemporarily(); }}
                onPointerDown={(e) => e.stopPropagation()}
                type="button"
                aria-label="丢弃录像"
                title="丢弃录像"
                style={pipButtonStyle()}
              >
                <TrashIcon />
              </button>
            </>
          ) : (
            <button
              data-pip-control="true"
              onClick={(e) => { e.stopPropagation(); onToggleRecord?.(); showControlsTemporarily(); }}
              onPointerDown={(e) => e.stopPropagation()}
              type="button"
              aria-label={isRecording ? '停止录制' : '开始录制'}
              title={isRecording ? '停止录制' : '开始录制'}
              disabled={!stream}
              style={pipButtonStyle({
                cursor: stream ? 'pointer' : 'not-allowed',
                opacity: stream ? 1 : 0.5
              })}
            >
              <RecordDot active={isRecording} />
            </button>
          )}

          <button
            data-pip-control="true"
            onClick={(e) => { e.stopPropagation(); onClose?.(); }}
            onPointerDown={(e) => e.stopPropagation()}
            type="button"
            aria-label="关闭摄像头"
            title="关闭摄像头"
            style={pipButtonStyle()}
          >
            <CloseIcon />
          </button>
        </div>
      )}

      <div
        data-pip-resize="true"
        onPointerDown={handleResizePointerDown}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: 22,
          height: 22,
          cursor: 'nesw-resize',
          touchAction: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: showControls ? 'rgba(255, 255, 255, 0.85)' : 'transparent',
          background: showControls ? 'rgba(0, 0, 0, 0.32)' : 'transparent',
          borderBottomLeftRadius: 8,
          transition: 'opacity 0.15s ease'
        }}
      >
        <ResizeIcon />
      </div>
    </div>
  );
};
