import { useState, useEffect } from 'react';
import { SETTINGS_LIMITS } from '../config/settingsDefaults';

export const LineIndicator = ({ mode, position, onPositionChange, mirrorV = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(position);
  useEffect(() => {
    if (!isDragging) {
      setDragPosition(mirrorV ? 100 - position : position);
    }
  }, [position, isDragging, mirrorV]);

  const updatePosition = (clientY) => {
    const ratio = Math.max(0, Math.min(1, clientY / window.innerHeight));
    const visualPosition = Math.round(Math.max(
      SETTINGS_LIMITS.indicatorPos.min,
      Math.min(SETTINGS_LIMITS.indicatorPos.max, ratio * 100)
    ));
    const nextPosition = mirrorV ? 100 - visualPosition : visualPosition;

    setDragPosition(visualPosition);
    onPositionChange(nextPosition);
  };

  const handlePointerDown = (event) => {
    if (mode !== 'free') return;

    setIsDragging(true);
    updatePosition(event.clientY);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!isDragging || mode !== 'free') return;

    updatePosition(event.clientY);
  };

  const handlePointerUp = (event) => {
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const top = `${mode === 'center' ? 50 : (mirrorV ? 100 - position : position)}%`;
  const displayPosition = isDragging ? dragPosition : (mirrorV ? 100 - position : position);

  return (
    <>
      <div
        data-no-scrub="true"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top,
          transform: 'translateY(-50%)',
          height: '28px',
          zIndex: 90,
          cursor: mode === 'free' ? 'ns-resize' : 'default',
          pointerEvents: mode === 'free' ? 'auto' : 'none',
          touchAction: 'none'
        }}
      />

      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top,
          transform: 'translateY(-50%)',
          height: '4px',
          background: 'var(--indicator)',
          borderRadius: '2px',
          boxShadow: '0 0 12px var(--indicator)',
          zIndex: 91,
          pointerEvents: 'none'
        }}
      />

      {isDragging && (
        <div
          style={{
            position: 'fixed',
            top: `${displayPosition}%`,
            left: '50%',
            transform: 'translate(-50%, -140%)',
            padding: '6px 10px',
            borderRadius: '999px',
            background: 'rgba(28, 28, 30, 0.92)',
            color: 'var(--text)',
            fontSize: '12px',
            zIndex: 70,
            pointerEvents: 'none'
          }}
        >
          视觉 {displayPosition}%
        </div>
      )}
    </>
  );
};
