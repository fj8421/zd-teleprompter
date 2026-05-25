import { useState, useEffect } from 'react';
import { listTexts, deleteText } from '../utils/textStore';
import { countHtmlTextUnits } from '../utils/textStats';
import { AppleDialog, useAppleDialog } from '../components/AppleDialog';
import { APP_LIMITS } from '../config/settingsDefaults';

export const HomeView = ({ onNavigate }) => {
  const [texts, setTexts] = useState([]);
  const { dialog, showConfirm, closeDialog } = useAppleDialog();

  useEffect(() => {
    setTexts(listTexts());
  }, []);

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
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'auto',
      padding: 'var(--space-2xl)'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <div style={{
          marginBottom: 'var(--space-3xl)'
        }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '32px', fontWeight: '700', marginBottom: 'var(--space-sm)' }}>
            <img src="/favicon.svg" alt="" style={{ width: '36px', height: '36px' }} />
            <span>紫电提词器</span>
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
