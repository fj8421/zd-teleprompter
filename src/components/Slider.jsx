import { useState, useRef, useEffect } from 'react';
import '../styles/apple.css';

export const Slider = ({ value, min, max, step = 1, unit = '', onChange, onDragStart, onDragEnd }) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const updateValue = (clientX) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const newValue = min + ratio * (max - min);
    const steppedValue = Math.round(newValue / step) * step;

    onChange(Math.max(min, Math.min(max, steppedValue)));
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    onDragStart?.();
    updateValue(e.clientX);
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (isDragging) {
      updateValue(e.clientX);
    }
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    onDragEnd?.();
    if (e.target.hasPointerCapture?.(e.pointerId)) {
      e.target.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={sliderRef}
      className="slider"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="slider-track" style={{ width: `${percentage}%` }} />
      <div className="slider-thumb" style={{ left: `${percentage}%` }} />
    </div>
  );
};
