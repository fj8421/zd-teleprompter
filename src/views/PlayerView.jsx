import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getText } from '../utils/textStore';
import { useSettings } from '../store/SettingsContext';
import { useTeleprompter } from '../hooks/useTeleprompter';
import { useFullscreen } from '../hooks/useFullscreen';
import { useKeyboard } from '../hooks/useKeyboard';
import { useMicSpeed } from '../hooks/useMicSpeed';
import { useSpeedToast } from '../hooks/useSpeedToast';
import { useAutoHideControls } from '../hooks/useAutoHideControls';
import { ControlBar } from '../components/ControlBar';
import { ProgressBar } from '../components/ProgressBar';
import { LineIndicator } from '../components/LineIndicator';
import { SettingsSheet } from '../components/SettingsSheet';
import { CameraPreview } from '../components/CameraPreview';
import { SETTINGS_LIMITS } from '../config/settingsDefaults';
import { AppleDialog, useAppleDialog } from '../components/AppleDialog';
import { countHtmlTextUnits, htmlToPlainText } from '../utils/textStats';
import { useCamera } from '../hooks/useCamera';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { isMediaRecorderSupported } from '../utils/recorderSupport';

const getViewportHeight = () => (typeof window !== 'undefined' ? window.innerHeight : 0);

export const PlayerView = ({ textId, onBack }) => {
  const { settings, dispatch } = useSettings();
  const [text, setText] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [widthDragPreview, setWidthDragPreview] = useState(null);
  const [focusGuideDragPreview, setFocusGuideDragPreview] = useState(null);
  const [viewportHeight, setViewportHeight] = useState(getViewportHeight);
  const { dialog, showAlert, closeDialog } = useAppleDialog();

  const playerRef = useRef(null);
  const contentRef = useRef(null);
  const scrubStartYRef = useRef(0);
  const scrubDraggingRef = useRef(false);
  const widthDraggingRef = useRef(false);
  const widthDragSideRef = useRef('right');
  const widthStartXRef = useRef(0);
  const widthStartWidthRef = useRef(0);
  const focusGuideDraggingRef = useRef(false);
  const focusGuideDragEdgeRef = useRef('top');
  const focusGuideStartYRef = useRef(0);
  const focusGuideStartHeightRef = useRef(0);

  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(playerRef);
  const { visible: controlsVisible, reveal: revealControls } = useAutoHideControls(isFullscreen);

  const isMicSpeedMode = settings.speedMode === 'mic';
  const textUnits = useMemo(() => countHtmlTextUnits(text?.html || ''), [text?.html]);
  const referenceText = useMemo(() => htmlToPlainText(text?.html || ''), [text?.html]);
  const { speed: micSpeed, error: micError } = useMicSpeed(isMicSpeedMode, referenceText);
  const calibratedMicSpeed = Math.round(micSpeed * settings.micSpeedFactor);
  const effectiveSpeed = isMicSpeedMode ? calibratedMicSpeed : settings.speed;
  const micStatusText = micError === 'MIC_UNSUPPORTED'
    ? '麦克风不可用'
    : micError === 'MIC_DENIED'
      ? '麦克风被拒绝'
      : `${effectiveSpeed} wpm · ${settings.micSpeedFactor.toFixed(1)}x`;

  const { isPlaying, progress, durationSeconds, play, pause, toggle, reset, seekToProgress, seekByPixels } = useTeleprompter(
    contentRef,
    effectiveSpeed,
    settings.indicatorPos,
    text?.id,
    playerRef
  );

  const { stream: cameraStream, devices: cameraDevices, error: cameraError } = useCamera({
    enabled: settings.cameraEnabled,
    facingMode: settings.cameraFacing,
    deviceId: settings.cameraDeviceId,
    resolution: settings.cameraResolution
  });

  const recorder = useMediaRecorder(cameraStream, { resolution: settings.cameraResolution });

  const { toast: speedToast, show: showSpeedToast } = useSpeedToast(isFullscreen);

  const handleSpeedPreviewStart = useCallback(() => play(), [play]);
  const handleSpeedPreviewEnd = useCallback(() => pause(), [pause]);

  const shouldIgnoreManualSeek = useCallback((target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('button, input, textarea, [contenteditable="true"], .sheet, .sheet-overlay, [data-no-scrub="true"]'));
  }, []);

  const handleWheel = useCallback((event) => {
    if (showSettings || shouldIgnoreManualSeek(event.target)) return;
    event.preventDefault();
    seekByPixels(event.deltaY * 1.2);
  }, [seekByPixels, shouldIgnoreManualSeek, showSettings]);

  const handleScrubPointerDown = useCallback((event) => {
    revealControls();
    if (event.pointerType === 'mouse' || showSettings || shouldIgnoreManualSeek(event.target)) {
      scrubDraggingRef.current = false;
      return;
    }
    scrubStartYRef.current = event.clientY;
    scrubDraggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, [revealControls, shouldIgnoreManualSeek, showSettings]);

  const handleScrubPointerMove = useCallback((event) => {
    if (!scrubDraggingRef.current || showSettings) return;
    event.preventDefault();
    const deltaY = event.clientY - scrubStartYRef.current;
    scrubStartYRef.current = event.clientY;
    seekByPixels(-deltaY * 1.5);
  }, [seekByPixels, showSettings]);

  const handleScrubPointerUp = useCallback((event) => {
    scrubDraggingRef.current = false;
    const playerElement = playerRef.current;
    if (playerElement?.hasPointerCapture?.(event.pointerId)) {
      playerElement.releasePointerCapture(event.pointerId);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportHeight(getViewportHeight());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateWidthFromClient = useCallback((clientX, clientY) => {
    const deltaPercent = ((clientX - widthStartXRef.current) / window.innerWidth) * 200;
    const nextWidth = Math.round(Math.max(
      SETTINGS_LIMITS.width.min,
      Math.min(
        SETTINGS_LIMITS.width.max,
        widthStartWidthRef.current + (widthDragSideRef.current === 'left' ? -deltaPercent : deltaPercent)
      )
    ));
    dispatch({ type: 'SET_WIDTH', value: nextWidth });
    setWidthDragPreview({ value: nextWidth, x: clientX, y: clientY });
  }, [dispatch]);

  const handleWidthPointerDown = useCallback((event, side) => {
    if (showSettings) return;
    widthDraggingRef.current = true;
    widthDragSideRef.current = side;
    widthStartXRef.current = event.clientX;
    widthStartWidthRef.current = settings.width;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateWidthFromClient(event.clientX, event.clientY);
    event.preventDefault();
  }, [settings.width, showSettings, updateWidthFromClient]);

  const handleWidthPointerMove = useCallback((event) => {
    if (!widthDraggingRef.current) return;
    updateWidthFromClient(event.clientX, event.clientY);
  }, [updateWidthFromClient]);

  const handleWidthPointerUp = useCallback(() => {
    if (!widthDraggingRef.current) return;
    widthDraggingRef.current = false;
    setWidthDragPreview(null);
  }, []);

  const updateFocusGuideHeight = useCallback((clientY) => {
    const rawDelta = clientY - focusGuideStartYRef.current;
    const edgeDelta = focusGuideDragEdgeRef.current === 'bottom' ? rawDelta : -rawDelta;
    const deltaPercent = (edgeDelta / window.innerHeight) * 150;
    const nextHeight = Math.round(Math.max(
      SETTINGS_LIMITS.focusGuideHeight.min,
      Math.min(SETTINGS_LIMITS.focusGuideHeight.max, focusGuideStartHeightRef.current + deltaPercent)
    ));
    dispatch({ type: 'SET_FOCUS_GUIDE_HEIGHT', value: nextHeight });
    setFocusGuideDragPreview(nextHeight);
  }, [dispatch]);

  const handleFocusGuidePointerDown = useCallback((event, edge) => {
    if (!settings.focusGuideEnabled || showSettings) return;
    focusGuideDraggingRef.current = true;
    focusGuideDragEdgeRef.current = edge;
    focusGuideStartYRef.current = event.clientY;
    focusGuideStartHeightRef.current = settings.focusGuideHeight;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, [settings.focusGuideEnabled, settings.focusGuideHeight, showSettings]);

  const handleFocusGuidePointerMove = useCallback((event) => {
    if (!focusGuideDraggingRef.current) return;
    updateFocusGuideHeight(event.clientY);
  }, [updateFocusGuideHeight]);

  const handleFocusGuidePointerUp = useCallback(() => {
    if (!focusGuideDraggingRef.current) return;
    focusGuideDraggingRef.current = false;
    setFocusGuideDragPreview(null);
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handleScrubPointerMove, { passive: false });
    window.addEventListener('pointerup', handleScrubPointerUp);
    window.addEventListener('pointercancel', handleScrubPointerUp);
    window.addEventListener('pointermove', handleWidthPointerMove);
    window.addEventListener('pointerup', handleWidthPointerUp);
    window.addEventListener('pointercancel', handleWidthPointerUp);
    window.addEventListener('pointermove', handleFocusGuidePointerMove);
    window.addEventListener('pointerup', handleFocusGuidePointerUp);
    window.addEventListener('pointercancel', handleFocusGuidePointerUp);

    return () => {
      window.removeEventListener('pointermove', handleScrubPointerMove);
      window.removeEventListener('pointerup', handleScrubPointerUp);
      window.removeEventListener('pointercancel', handleScrubPointerUp);
      window.removeEventListener('pointermove', handleWidthPointerMove);
      window.removeEventListener('pointerup', handleWidthPointerUp);
      window.removeEventListener('pointercancel', handleWidthPointerUp);
      window.removeEventListener('pointermove', handleFocusGuidePointerMove);
      window.removeEventListener('pointerup', handleFocusGuidePointerUp);
      window.removeEventListener('pointercancel', handleFocusGuidePointerUp);
    };
  }, [
    handleScrubPointerMove, handleScrubPointerUp,
    handleWidthPointerMove, handleWidthPointerUp,
    handleFocusGuidePointerMove, handleFocusGuidePointerUp,
  ]);

  useEffect(() => {
    const playerElement = playerRef.current;
    if (!playerElement) return undefined;
    playerElement.addEventListener('wheel', handleWheel, { passive: false });
    return () => playerElement.removeEventListener('wheel', handleWheel);
  }, [handleWheel, text]);

  useEffect(() => {
    if (textId) {
      const loadedText = getText(textId);
      if (loadedText) {
        setText(loadedText);
      } else {
        showAlert({ title: '文本不存在', onAction: onBack });
      }
    }
  }, [textId, onBack, showAlert]);

  const handleToggleCameraButton = useCallback(() => {
    if (!settings.cameraEnabled) {
      if (!isMediaRecorderSupported()) {
        showAlert({ title: '当前浏览器不支持录制' });
        return;
      }
      dispatch({ type: 'SET_CAMERA_ENABLED', value: true });
      return;
    }
    if (recorder.isRecording) {
      recorder.stop();
      return;
    }
    if (recorder.hasPreview) {
      recorder.discardPreview();
    }
    if (cameraStream) {
      recorder.start();
    }
  }, [settings.cameraEnabled, recorder, cameraStream, dispatch, showAlert]);

  const handleSwitchCamera = useCallback(() => {
    const videoInputs = cameraDevices || [];
    if (videoInputs.length > 1) {
      const currentId = settings.cameraDeviceId || cameraStream?.getVideoTracks?.()[0]?.getSettings?.().deviceId;
      const idx = Math.max(0, videoInputs.findIndex((d) => d.deviceId === currentId));
      const next = videoInputs[(idx + 1) % videoInputs.length];
      dispatch({ type: 'SET_CAMERA_DEVICE_ID', value: next.deviceId });
      return;
    }
    const nextFacing = settings.cameraFacing === 'user' ? 'environment' : 'user';
    dispatch({ type: 'SET_CAMERA_DEVICE_ID', value: null });
    dispatch({ type: 'SET_CAMERA_FACING', value: nextFacing });
  }, [cameraDevices, cameraStream, settings.cameraDeviceId, settings.cameraFacing, dispatch]);

  const handleCloseCamera = useCallback(() => {
    if (recorder.isRecording) recorder.stop();
    if (recorder.hasPreview) recorder.discardPreview();
    dispatch({ type: 'SET_CAMERA_ENABLED', value: false });
  }, [recorder, dispatch]);

  useKeyboard({
    ' ': toggle,
    'Space': toggle,
    'ArrowLeft': () => {
      if (isMicSpeedMode) {
        const nextFactor = Math.max(
          SETTINGS_LIMITS.micSpeedFactor.min,
          Math.round((settings.micSpeedFactor - SETTINGS_LIMITS.micSpeedFactor.step) * 10) / 10
        );
        dispatch({ type: 'SET_MIC_SPEED_FACTOR', value: nextFactor });
        showSpeedToast(`${nextFactor.toFixed(1)}x`);
      } else {
        const nextSpeed = Math.max(SETTINGS_LIMITS.speed.min, settings.speed - SETTINGS_LIMITS.speed.step);
        dispatch({ type: 'SET_SPEED', value: nextSpeed });
        showSpeedToast(nextSpeed);
      }
    },
    'ArrowRight': () => {
      if (isMicSpeedMode) {
        const nextFactor = Math.min(
          SETTINGS_LIMITS.micSpeedFactor.max,
          Math.round((settings.micSpeedFactor + SETTINGS_LIMITS.micSpeedFactor.step) * 10) / 10
        );
        dispatch({ type: 'SET_MIC_SPEED_FACTOR', value: nextFactor });
        showSpeedToast(`${nextFactor.toFixed(1)}x`);
      } else {
        const nextSpeed = Math.min(SETTINGS_LIMITS.speed.max, settings.speed + SETTINGS_LIMITS.speed.step);
        dispatch({ type: 'SET_SPEED', value: nextSpeed });
        showSpeedToast(nextSpeed);
      }
    },
    'ArrowUp': () => {
      dispatch({ type: 'SET_INDICATOR_POS', value: Math.max(SETTINGS_LIMITS.indicatorPos.min, settings.indicatorPos - SETTINGS_LIMITS.indicatorPos.step) });
    },
    'ArrowDown': () => {
      dispatch({ type: 'SET_INDICATOR_POS', value: Math.min(SETTINGS_LIMITS.indicatorPos.max, settings.indicatorPos + SETTINGS_LIMITS.indicatorPos.step) });
    },
    'm': () => dispatch({ type: 'TOGGLE_MIRROR_H' }),
    'M': () => dispatch({ type: 'TOGGLE_MIRROR_H' }),
    'v': () => dispatch({ type: 'TOGGLE_MIRROR_V' }),
    'V': () => dispatch({ type: 'TOGGLE_MIRROR_V' }),
    'f': toggleFullscreen,
    'F': toggleFullscreen,
    'r': reset,
    'R': reset,
    'c': () => {
      if (settings.cameraEnabled) handleCloseCamera();
      else handleToggleCameraButton();
    },
    'C': () => {
      if (settings.cameraEnabled) handleCloseCamera();
      else handleToggleCameraButton();
    },
    'o': () => {
      if (!settings.cameraEnabled) return;
      if (recorder.isRecording) recorder.stop();
      else if (cameraStream) recorder.start();
    },
    'O': () => {
      if (!settings.cameraEnabled) return;
      if (recorder.isRecording) recorder.stop();
      else if (cameraStream) recorder.start();
    },
    'Escape': () => {
      if (isFullscreen) toggleFullscreen();
      else onBack();
    }
  }, !showSettings);

  if (!text) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        加载中...
        <AppleDialog
          dialog={dialog}
          onClose={() => {
            closeDialog();
            onBack();
          }}
        />
      </div>
    );
  }

  const transform = `scaleX(${settings.mirrorH ? -1 : 1}) scaleY(${settings.mirrorV ? -1 : 1})`;
  const focusGuideHeightPx = viewportHeight * (settings.focusGuideHeight / 100);
  const effectiveIndicatorPos = settings.mirrorV ? 100 - settings.indicatorPos : settings.indicatorPos;
  const focusGuideCenterY = viewportHeight * (effectiveIndicatorPos / 100);
  const focusGuideTop = Math.max(0, focusGuideCenterY - (focusGuideHeightPx / 2));
  const focusGuideMiddleY = focusGuideCenterY;
  const focusGuideBottom = Math.min(viewportHeight, focusGuideTop + focusGuideHeightPx);
  const focusGuideBoxWidth = `${settings.width}%`;
  const focusGuideOuterInsetX = 12;
  const focusGuideRenderLeft = `calc(50% - ${settings.width / 2}% - ${focusGuideOuterInsetX}px)`;
  const focusGuideRenderWidth = `calc(${focusGuideBoxWidth} + ${focusGuideOuterInsetX * 2}px)`;
  const focusGuideRenderRightLeft = `calc(50% + ${settings.width / 2}% + ${focusGuideOuterInsetX}px - 14px)`;
  const guideEnabled = settings.focusGuideEnabled !== false;
  const upperOpacity = guideEnabled ? (settings.mirrorV ? 0.45 : 1) : 1;
  const lowerOpacity = guideEnabled ? (settings.mirrorV ? 1 : 0.45) : 1;
  const outerOpacity = guideEnabled ? 0 : 1;
  const sharedTextLayerStyle = {
    fontSize: `${settings.fontSize}px`,
    lineHeight: settings.lineHeight,
    width: `${settings.width}%`,
    textAlign: settings.align,
    userSelect: 'none',
    willChange: 'transform',
    position: 'absolute',
    top: '40vh',
    left: '50%',
    transform: 'translateX(-50%) translateY(var(--tp-offset, 0px))',
    paddingBottom: '60vh',
    touchAction: 'none'
  };

  const renderFixedTextLayer = (clipPath, opacity, ariaHidden = true) => (
    <div
      aria-hidden={ariaHidden}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 31,
        pointerEvents: 'none',
        clipPath
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          transform,
          position: 'relative'
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: text.html }}
          style={{
            ...sharedTextLayerStyle,
            color: 'var(--text)',
            opacity
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      ref={playerRef}
      onPointerDown={handleScrubPointerDown}
      onPointerUp={handleScrubPointerUp}
      onPointerCancel={handleScrubPointerUp}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'none',
        overscrollBehavior: 'none',
        background: 'var(--bg)'
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          transform,
          position: 'relative'
        }}
      >
        <div
          ref={contentRef}
          dangerouslySetInnerHTML={{ __html: text.html }}
          style={{
            ...sharedTextLayerStyle,
            color: 'var(--text)',
            opacity: outerOpacity
          }}
        />
      </div>

      {guideEnabled && viewportHeight > 0 && (
        <>
          {renderFixedTextLayer('inset(0px 0px 0px 0px)', 0.16)}
          {renderFixedTextLayer(`inset(${focusGuideTop}px 0 ${Math.max(0, viewportHeight - focusGuideMiddleY)}px 0)`, upperOpacity)}
          {renderFixedTextLayer(`inset(${focusGuideMiddleY}px 0 ${Math.max(0, viewportHeight - focusGuideBottom)}px 0)`, lowerOpacity)}
        </>
      )}

      {viewportHeight > 0 && (
        <>
          <div
            style={{
              position: 'fixed',
              left: focusGuideRenderLeft,
              width: focusGuideRenderWidth,
              top: `${focusGuideTop}px`,
              height: `${focusGuideHeightPx}px`,
              border: guideEnabled ? '0.75px solid rgba(255, 214, 10, 0.9)' : 'none',
              boxShadow: guideEnabled ? '0 0 8px rgba(255, 214, 10, 0.16)' : 'none',
              background: 'transparent',
              borderRadius: '6px',
              zIndex: 53,
              pointerEvents: 'none'
            }}
          />

          {guideEnabled && (
            <>
              <div
                data-no-scrub="true"
                onPointerDown={(event) => handleFocusGuidePointerDown(event, 'top')}
                style={{
                  position: 'fixed',
                  left: focusGuideRenderLeft,
                  width: focusGuideRenderWidth,
                  top: `${focusGuideTop - 10}px`,
                  height: '20px',
                  zIndex: 54,
                  cursor: 'ns-resize',
                  touchAction: 'none',
                  background: 'transparent'
                }}
              />

              <div
                data-no-scrub="true"
                onPointerDown={(event) => handleFocusGuidePointerDown(event, 'bottom')}
                style={{
                  position: 'fixed',
                  left: focusGuideRenderLeft,
                  width: focusGuideRenderWidth,
                  top: `${focusGuideTop + focusGuideHeightPx - 10}px`,
                  height: '20px',
                  zIndex: 54,
                  cursor: 'ns-resize',
                  touchAction: 'none',
                  background: 'transparent'
                }}
              />

              <div
                data-no-scrub="true"
                onPointerDown={(event) => handleWidthPointerDown(event, 'left')}
                style={{
                  position: 'fixed',
                  left: focusGuideRenderLeft,
                  top: `${focusGuideTop}px`,
                  width: '14px',
                  height: `${focusGuideHeightPx}px`,
                  zIndex: 55,
                  cursor: 'ew-resize',
                  touchAction: 'none',
                  background: 'transparent'
                }}
              />

              <div
                data-no-scrub="true"
                onPointerDown={(event) => handleWidthPointerDown(event, 'right')}
                style={{
                  position: 'fixed',
                  left: focusGuideRenderRightLeft,
                  top: `${focusGuideTop}px`,
                  width: '14px',
                  height: `${focusGuideHeightPx}px`,
                  zIndex: 55,
                  cursor: 'ew-resize',
                  touchAction: 'none',
                  background: 'transparent'
                }}
              />
            </>
          )}

          {!guideEnabled && (
            <>
              <div
                data-no-scrub="true"
                onPointerDown={(event) => handleWidthPointerDown(event, 'left')}
                style={{
                  position: 'fixed',
                  left: focusGuideRenderLeft,
                  top: `${focusGuideTop}px`,
                  width: '14px',
                  height: `${focusGuideHeightPx}px`,
                  zIndex: 55,
                  cursor: 'ew-resize',
                  touchAction: 'none',
                  background: 'rgba(255, 214, 10, 0.18)',
                  borderRadius: '999px'
                }}
              />

              <div
                data-no-scrub="true"
                onPointerDown={(event) => handleWidthPointerDown(event, 'right')}
                style={{
                  position: 'fixed',
                  left: focusGuideRenderRightLeft,
                  top: `${focusGuideTop}px`,
                  width: '14px',
                  height: `${focusGuideHeightPx}px`,
                  zIndex: 55,
                  cursor: 'ew-resize',
                  touchAction: 'none',
                  background: 'rgba(255, 214, 10, 0.18)',
                  borderRadius: '999px'
                }}
              />
            </>
          )}

          <div
            style={{
              position: 'fixed',
              left: '50%',
              top: `${focusGuideMiddleY}px`,
              transform: 'translate(-50%, -140%)',
              padding: '6px 10px',
              borderRadius: '999px',
              background: 'rgba(28, 28, 30, 0.92)',
              color: 'var(--text)',
              fontSize: '12px',
              zIndex: 70,
              pointerEvents: 'none',
              opacity: focusGuideDragPreview !== null ? 1 : 0,
              transition: 'opacity 0.15s ease'
            }}
          >
            {(focusGuideDragPreview ?? settings.focusGuideHeight)}%
          </div>
        </>
      )}

      {widthDragPreview && (
        <div
          style={{
            position: 'fixed',
            left: `${widthDragPreview.x}px`,
            top: `${Math.max(12, widthDragPreview.y - 48)}px`,
            transform: 'translate(-50%, -100%)',
            padding: '6px 10px',
            borderRadius: '999px',
            background: 'rgba(28, 28, 30, 0.92)',
            color: 'var(--text)',
            fontSize: '12px',
            zIndex: 210,
            pointerEvents: 'none'
          }}
        >
          {widthDragPreview.value}%
        </div>
      )}

      <LineIndicator
        mode={settings.indicatorMode}
        position={settings.indicatorPos}
        mirrorV={settings.mirrorV}
        onPositionChange={(pos) => dispatch({ type: 'SET_INDICATOR_POS', value: pos })}
      />

      <ProgressBar progress={progress} durationSeconds={durationSeconds} onSeek={seekToProgress} />

      {controlsVisible && (
        <>
          {!isFullscreen && (
            <button
              onClick={onBack}
              style={{
                position: 'fixed',
                top: 'var(--space-lg)',
                left: 'var(--space-lg)',
                padding: '8px 16px',
                background: 'rgba(28, 28, 30, 0.8)',
                backdropFilter: 'blur(12px)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '15px',
                zIndex: 200,
                cursor: 'pointer'
              }}
            >
              ‹ 返回
            </button>
          )}

          {isMicSpeedMode && (
            <div
              data-no-scrub="true"
              style={{
                position: 'fixed',
                top: 'var(--space-lg)',
                right: 'var(--space-lg)',
                padding: '8px 16px',
                background: 'rgba(28, 28, 30, 0.8)',
                backdropFilter: 'blur(12px)',
                borderRadius: '8px',
                color: 'var(--text)',
                fontSize: '13px',
                zIndex: 200,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ color: micError ? 'var(--danger)' : 'var(--accent)' }}>
                {micError ? '!' : '●'}
              </span>
              <span style={{ fontWeight: '600' }}>{micStatusText}</span>
            </div>
          )}

          <ControlBar
            isPlaying={isPlaying}
            onTogglePlay={toggle}
            onToggleMirrorH={() => dispatch({ type: 'TOGGLE_MIRROR_H' })}
            onToggleMirrorV={() => dispatch({ type: 'TOGGLE_MIRROR_V' })}
            onToggleFullscreen={toggleFullscreen}
            onOpenSettings={() => setShowSettings(true)}
            onToggleCamera={handleToggleCameraButton}
            cameraEnabled={settings.cameraEnabled}
            isRecording={recorder.isRecording}
            recordingDurationMs={recorder.durationMs}
            isFullscreen={isFullscreen}
            mirrorH={settings.mirrorH}
            mirrorV={settings.mirrorV}
          />
        </>
      )}

      {speedToast !== null && (
        <div
          data-no-scrub="true"
          style={{
            position: 'fixed',
            top: isMicSpeedMode ? 'calc(var(--space-lg) + 42px)' : 'var(--space-lg)',
            right: 'var(--space-lg)',
            padding: '8px 16px',
            background: 'rgba(28, 28, 30, 0.8)',
            backdropFilter: 'blur(12px)',
            borderRadius: '8px',
            color: 'var(--text)',
            fontSize: '13px',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span style={{ color: 'var(--accent)' }}>{isMicSpeedMode ? '校准' : '速度'}</span>
          <span style={{ fontWeight: '600' }}>{isMicSpeedMode ? speedToast : `${speedToast} wpm`}</span>
        </div>
      )}

      {settings.cameraEnabled && (
        <CameraPreview
          stream={cameraStream}
          error={cameraError}
          devices={cameraDevices}
          isRecording={recorder.isRecording}
          durationMs={recorder.durationMs}
          previewUrl={recorder.previewUrl}
          hasPreview={recorder.hasPreview}
          onSwitchCamera={handleSwitchCamera}
          onToggleRecord={() => {
            if (recorder.isRecording) {
              recorder.stop();
              return;
            }
            if (recorder.hasPreview) recorder.discardPreview();
            if (cameraStream) recorder.start();
          }}
          onDownload={recorder.downloadPreview}
          onDiscardPreview={recorder.discardPreview}
          onClose={handleCloseCamera}
        />
      )}

      <SettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        textUnits={textUnits}
        onSpeedPreviewStart={handleSpeedPreviewStart}
        onSpeedPreviewEnd={handleSpeedPreviewEnd}
        cameraDevices={cameraDevices}
      />
      <AppleDialog dialog={dialog} onClose={closeDialog} />

      <style>{`
        .css-fullscreen {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999 !important;
        }
      `}</style>
    </div>
  );
};
