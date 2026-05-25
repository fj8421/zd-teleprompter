import { useState, useEffect } from 'react';
import { getSelectionRect, applyColor, removeColor } from '../utils/richtext';

const COLORS = ['#ff453a', '#ff9f0a', '#ffd60a', '#32d74b', '#64d2ff', '#bf5af2'];

export const ColorPopover = ({ editorRef }) => {
  const [rect, setRect] = useState(null);
  const popoverLeft = rect ? Math.max(120, Math.min(window.innerWidth - 120, rect.left + rect.width / 2)) : 0;
  const popoverTop = rect ? Math.max(12, rect.top - 50) : 0;

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const selectionRect = getSelectionRect();
      if (
        selectionRect
        && editorRef.current?.contains(selection.anchorNode)
        && editorRef.current?.contains(selection.focusNode)
      ) {
        setRect(selectionRect);
      } else {
        setRect(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [editorRef]);

  if (!rect) return null;

  const handleColorClick = (color) => {
    applyColor(color);
    setRect(null);
    editorRef.current?.focus();
  };

  const handleReset = () => {
    removeColor();
    setRect(null);
    editorRef.current?.focus();
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: popoverLeft,
        top: popoverTop,
        transform: 'translateX(-50%)',
        background: 'rgba(28, 28, 30, 0.95)',
        backdropFilter: 'blur(24px)',
        borderRadius: '12px',
        padding: '8px 12px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        zIndex: 1000,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
      }}
    >
      {COLORS.map(color => (
        <button
          key={color}
          onClick={() => handleColorClick(color)}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: color,
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.1s ease'
          }}
          onMouseDown={(e) => e.preventDefault()}
        />
      ))}
      <div style={{ width: '1px', height: '20px', background: 'var(--divider)' }} />
      <button
        onClick={handleReset}
        onMouseDown={(e) => e.preventDefault()}
        style={{
          padding: '4px 8px',
          background: 'none',
          border: 'none',
          color: 'var(--text-secondary)',
          fontSize: '13px',
          cursor: 'pointer'
        }}
      >
        还原
      </button>
    </div>
  );
};
