import { useState, useEffect, useRef } from 'react';
import { getText, saveText } from '../utils/textStore';
import { ColorPopover } from '../components/ColorPopover';
import { countTextUnits } from '../utils/textStats';
import { sanitizeHtml } from '../utils/richtext';
import { AppleDialog, useAppleDialog } from '../components/AppleDialog';
import { APP_LIMITS } from '../config/settingsDefaults';

const updateEditorEmptyState = (element) => {
  if (!element) return;

  const text = (element.textContent || '').replace(/\u00a0/g, '').trim();
  element.dataset.empty = text ? 'false' : 'true';
};

const getCharacterCount = (element) => {
  return countTextUnits(element?.textContent || '');
};

const syncEditorState = (element, setCharacterCount) => {
  if (!element) return;

  updateEditorEmptyState(element);
  setCharacterCount(getCharacterCount(element));
};

const sanitizeEditorContent = (editorElement) => {
  const html = sanitizeHtml(editorElement?.innerHTML || '');

  if (editorElement && editorElement.innerHTML !== html) {
    editorElement.innerHTML = html;
  }

  return html;
};

const insertHtmlAtSelection = (html) => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const template = document.createElement('template');
  template.innerHTML = html;
  const fragment = template.content;
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);

  if (lastNode) {
    const newRange = document.createRange();
    newRange.setStartAfter(lastNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
  }
};

const insertTextAtSelection = (text) => {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);

  const newRange = document.createRange();
  newRange.setStartAfter(node);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
};

const pasteSanitizedContent = (event) => {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;

  const html = clipboardData.getData('text/html');
  const text = clipboardData.getData('text/plain');

  event.preventDefault();
  if (html) {
    insertHtmlAtSelection(sanitizeHtml(html));
  } else if (text) {
    insertTextAtSelection(text);
  }
};

export const EditorView = ({ textId, onNavigate, onBack }) => {
  const [title, setTitle] = useState('');
  const [characterCount, setCharacterCount] = useState(0);
  const editorRef = useRef(null);
  const { dialog, showAlert, closeDialog } = useAppleDialog();

  useEffect(() => {
    if (textId) {
      const text = getText(textId);
      if (text) {
        setTitle(text.title);
        if (editorRef.current) {
          editorRef.current.innerHTML = sanitizeHtml(text.html);
          updateEditorEmptyState(editorRef.current);
          setCharacterCount(getCharacterCount(editorRef.current));
        }
      }
    } else {
      setTitle('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        updateEditorEmptyState(editorRef.current);
        setCharacterCount(0);
      }
    }
  }, [textId]);

  useEffect(() => {
    if (!textId) {
      requestAnimationFrame(() => {
        editorRef.current?.focus();
      });
    }
  }, [textId]);

  const showSaveError = (e) => {
    console.error('Failed to save text:', e);

    if (e.message === 'LIMIT') {
      showAlert({ title: '无法保存', message: `已达到 ${APP_LIMITS.maxTexts} 篇上限` });
    } else if (e.message === 'QUOTA') {
      showAlert({ title: '无法保存', message: '存储空间不足' });
    } else if (e.message === 'STORAGE') {
      showAlert({ title: '无法保存', message: '浏览器禁止本地存储，无法保存' });
    } else {
      showAlert({ title: '无法保存', message: '保存失败' });
    }
  };

  const handleSave = () => {
    const currentHtml = sanitizeEditorContent(editorRef.current);

    try {
      saveText({
        id: textId,
        title: title || '未标题',
        html: currentHtml
      });
      showAlert({ title: '保存成功', actionText: '好', onAction: onBack });
    } catch (e) {
      showSaveError(e);
    }
  };

  const handlePlay = () => {
    const currentHtml = sanitizeEditorContent(editorRef.current);
    if (!currentHtml.trim()) {
      showAlert({ title: '无法开始', message: '请先输入内容' });
      return;
    }

    // 临时保存
    try {
      const savedText = saveText({
        id: textId,
        title: title || '未标题',
        html: currentHtml
      });
      onNavigate('player', savedText.id);
    } catch (e) {
      showSaveError(e);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-lg)',
          borderBottom: '1px solid var(--divider)'
        }}
      >
        <button
          className="btn btn-text"
          onClick={onBack}
          style={{ fontSize: '17px' }}
        >
          ‹ 返回
        </button>

        <div style={{
          flex: 1,
          margin: '0 var(--space-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px'
        }}>
          <input
            className="input"
            type="text"
            placeholder="未标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              textAlign: 'center',
              background: 'transparent'
            }}
          />
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '12px',
            lineHeight: 1.2,
            userSelect: 'none'
          }}>
            （{characterCount}字）
          </div>
        </div>

        <button
          className="btn btn-text"
          onClick={handleSave}
          style={{ fontSize: '17px' }}
        >
          ✓ 保存
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 'var(--space-2xl)'
        }}
      >
        <div
          ref={editorRef}
          className="editor-content"
          contentEditable
          suppressContentEditableWarning
          dir="ltr"
          data-empty="true"
          data-placeholder="在这里输入提词文本..."
          onInput={(e) => {
            syncEditorState(e.currentTarget, setCharacterCount);
          }}
          onPaste={(e) => {
            const editorElement = e.currentTarget;
            pasteSanitizedContent(e);
            requestAnimationFrame(() => {
              syncEditorState(editorElement, setCharacterCount);
            });
          }}
          onCut={(e) => {
            const editorElement = e.currentTarget;
            requestAnimationFrame(() => {
              syncEditorState(editorElement, setCharacterCount);
            });
          }}
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            fontSize: '18px',
            lineHeight: 1.8,
            outline: 'none',
            minHeight: '300px',
            color: 'var(--text)',
            textAlign: 'left',
            direction: 'ltr',
            unicodeBidi: 'plaintext',
            userSelect: 'text',
            WebkitUserSelect: 'text'
          }}
        />
      </div>

      <ColorPopover editorRef={editorRef} />
      <AppleDialog dialog={dialog} onClose={closeDialog} />

      <div
        style={{
          padding: 'var(--space-2xl)',
          borderTop: '1px solid var(--divider)'
        }}
      >
        <button
          className="btn btn-primary"
          onClick={handlePlay}
          style={{
            width: '100%',
            fontSize: '17px',
            fontWeight: '600'
          }}
        >
          开始
        </button>
      </div>
    </div>
  );
};

