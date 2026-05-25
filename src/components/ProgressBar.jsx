import { useRef, useState } from 'react';

export const ProgressBar = ({ progress, durationSeconds = 0, onSeek }) => {
  const [isDragging, setIsDragging] = useState(false);
  const barRef = useRef(null);

  const normalizedProgress = Math.max(0, Math.min(1, progress));
  const totalSeconds = Math.max(0, Math.round(durationSeconds));
  const currentSeconds = totalSeconds > 0
    ? Math.min(totalSeconds, Math.round(normalizedProgress * totalSeconds))
    : 0;

  const updateProgressFromClientX = (clientX) => {
    if (!barRef.current || !onSeek) return;

    const rect = barRef.current.getBoundingClientRect();
    const ratio = rect.width > 0
      ? Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      : 0;

    onSeek(ratio);
  };

  const handlePointerDown = (event) => {
    if (!onSeek) return;

    setIsDragging(true);
    updateProgressFromClientX(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!isDragging || !onSeek) return;

    updateProgressFromClientX(event.clientX);
  };

  const handlePointerUp = (event) => {
    if (!onSeek) return;

    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      data-no-scrub="true"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(normalizedProgress * 100)}
      ref={barRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'fixed',
        bottom: 60,
        left: 0,
        right: 0,
        height: '12px',
        padding: '5px 0',
        background: 'rgba(255, 255, 255, 0.05)',
        zIndex: 100,
        cursor: onSeek ? 'ew-resize' : 'default',
        touchAction: 'none'
      }}
    >
      <div
        style={{
          height: '2px',
          marginTop: '5px',
          background: 'rgba(255, 255, 255, 0.12)',
          width: '100%'
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--indicator)',
            width: 'var(--tp-progress, 0%)',
            transition: isDragging ? 'none' : 'width 0.1s linear'
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          right: '8px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'rgba(255, 255, 255, 0.45)',
          fontSize: '11px',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none'
        }}
      >
        {currentSeconds}/{totalSeconds}
      </div>
    </div>
  );
};
