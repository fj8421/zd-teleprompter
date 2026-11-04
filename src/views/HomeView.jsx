import { useState, useEffect, useCallback, useRef } from 'react';
import { listTexts, deleteText } from '../utils/textStore';
import { countHtmlTextUnits } from '../utils/textStats';
import { AppleDialog, useAppleDialog } from '../components/AppleDialog';
import { APP_LIMITS } from '../config/settingsDefaults';

const PULL_REFRESH_THRESHOLD = 72;
const PULL_REFRESH_MAX_DISTANCE = 120;

export const HomeView = ({ onNavigate }) => {
  const [texts, setTexts] = useState([]);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef(null);
  const touchStartYRef = useRef(0);
  const pullDistanceRef = useRef(0);
  const pullingRef = useRef(false);
  const { dialog, showConfirm, closeDialog } = useAppleDialog();

  const refreshTexts = useCallback(() => {
    setTexts(listTexts());
  }, []);

  const setPullDistanceValue = useCallback((value) => {
    pullDistanceRef.current = value;
    setPullDistance(value);
  }, []);

  useEffect(() => {
    refreshTexts();
  }, [refreshTexts]);

  const handleTouchStart = useCallback((event) => {
    if (isRefreshing) return;
    const node = scrollRef.current;
    if (!node || node.scrollTop > 0) return;
    touchStartYRef.current = event.touches[0]?.clientY || 0;
    pullingRef.current = true;
  }, [isRefreshing]);

  const handleTouchMove = useCallback((event) => {
    if (!pullingRef.current || isRefreshing) return;
    const node = scrollRef.current;
    const currentY = event.touches[0]?.clientY || 0;
    const delta = currentY - touchStartYRef.current;
    if (!node || node.scrollTop > 0 || delta <= 0) {
      pullingRef.current = false;
      setPullDistanceValue(0);
      return;
    }
    event.preventDefault();
    setPullDistanceValue(Math.min(PULL_REFRESH_MAX_DISTANCE, delta * 0.45));
  }, [isRefreshing, setPullDistanceValue]);

  const handleTouchEnd = useCallback(() => {
    if (!pullingRef.current) return;
    pullingRef.current = false;
    if (pullDistanceRef.current >= PULL_REFRESH_THRESHOLD) {
      setIsRefreshing(true);
      window.setTimeout(() => {
        window.location.reload();
      }, 180);
      return;
    }
    setPullDistanceValue(0);
  }, [refreshTexts, setPullDistanceValue]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    node.addEventListener('touchstart', handleTouchStart, { passive: true });
    node.addEventListener('touchmove', handleTouchMove, { passive: false });
    node.addEventListener('touchend', handleTouchEnd);
    node.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
      node.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    showConfirm({
      title: '删除文本',
      message: '确定删除这篇文本吗？此操作无法撤销。',
      confirmText: '删除',
      destructive: true,
      onConfirm: () => {
        deleteText(id);
        setTexts(listTexts());
      },
    });
  };

  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const formatDate = (timestamp) => dateFormatter.format(new Date(timestamp));

  return (
    <div
      ref={scrollRef}
      style={{
      width: '100%',
      height: '100%',
      overflow: 'auto',
      padding: 'var(--space-2xl)',
      overscrollBehaviorY: 'contain',
      WebkitOverflowScrolling: 'touch'
    }}>
      <div style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '50%',
        transform: `translate(-50%, ${Math.max(0, pullDistance - 24)}px)`,
        opacity: pullDistance > 8 || isRefreshing ? 1 : 0,
        transition: pullingRef.current ? 'none' : 'transform 180ms ease, opacity 180ms ease',
        zIndex: 100,
        pointerEvents: 'none',
        padding: '8px 14px',
        borderRadius: 999,
        color: '#fff',
        fontSize: 13,
        background: 'rgba(28, 28, 30, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.24)'
      }}>
        {isRefreshing ? '正在刷新…' : pullDistance >= PULL_REFRESH_THRESHOLD ? '松开刷新' : '下拉刷新'}
      </div>

      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        transform: `translateY(${pullDistance}px)`,
        transition: pullingRef.current ? 'none' : 'transform 180ms ease'
      }}>
        <div style={{
          marginBottom: 'var(--space-3xl)'
        }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '32px', fontWeight: '700', marginBottom: 'var(--space-sm)' }}>
            <img src="/favicon.svg" alt="" style={{ width: '36px', height: '36px' }} />
            <span>刘二妮提词器</span>
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            {texts.length} / {APP_LIMITS.maxTexts}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          {texts.map(text => (
            <div
              key={text.id}
              className="list-item"
              onClick={() => onNavigate('editor', text.id)}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '17px', fontWeight: '500', marginBottom: '4px' }}>
                  {text.title || '未标题'}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  [{countHtmlTextUnits(text.html)}字] 更新于{formatDate(text.updatedAt)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <button
                  className="btn-danger"
                  onClick={(e) => handleDelete(text.id, e)}
                  style={{ fontSize: '14px', padding: '4px 12px' }}
                >
                  删除
                </button>
                <span className="list-item-arrow">›</span>
              </div>
            </div>
          ))}

          {texts.length < APP_LIMITS.maxTexts && (
            <div
              className="list-item"
              onClick={() => onNavigate('editor', null)}
              style={{
                justifyContent: 'center',
                color: 'var(--accent)'
              }}
            >
              <span style={{ fontSize: '20px', marginRight: 'var(--space-sm)' }}>+</span>
              <span style={{ fontSize: '17px', fontWeight: '500' }}>新建文本</span>
            </div>
          )}

          {texts.length >= APP_LIMITS.maxTexts && (
            <div style={{
              padding: 'var(--space-lg)',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '14px'
            }}>
              已达到 {APP_LIMITS.maxTexts} 篇上限，删除后可继续添加
            </div>
          )}
        </div>
      </div>
      <AppleDialog dialog={dialog} onClose={closeDialog} />
    </div>
  );
};
