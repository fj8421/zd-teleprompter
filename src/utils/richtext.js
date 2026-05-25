// 富文本编辑工具（Selection API）

export const applyColor = (color) => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return false;

  try {
    const span = document.createElement('span');
    span.style.color = color;
    range.surroundContents(span);

    // 清除选区
    selection.removeAllRanges();
    return true;
  } catch (e) {
    // 如果选区跨越多个元素，surroundContents 会失败
    // 降级方案：提取内容后包裹
    try {
      const fragment = range.extractContents();
      const span = document.createElement('span');
      span.style.color = color;
      span.appendChild(fragment);
      range.insertNode(span);
      selection.removeAllRanges();
      return true;
    } catch {
      return false;
    }
  }
};

export const removeColor = () => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return false;

  try {
    const fragment = range.extractContents();
    const container = document.createElement('div');
    container.appendChild(fragment);

    container.querySelectorAll('[style]').forEach(element => {
      element.style.color = '';

      if (!element.getAttribute('style')) {
        element.removeAttribute('style');
      }
    });

    container.querySelectorAll('span:not([style])').forEach(span => {
      span.replaceWith(...span.childNodes);
    });

    const cleanedFragment = document.createDocumentFragment();
    while (container.firstChild) {
      cleanedFragment.appendChild(container.firstChild);
    }

    const resetSpan = document.createElement('span');
    resetSpan.style.color = 'var(--text)';
    resetSpan.appendChild(cleanedFragment);

    range.insertNode(resetSpan);
    selection.removeAllRanges();
    return true;
  } catch {
    return false;
  }
};

export const getSelectionRect = () => {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  if (range.collapsed || !selection.toString().trim()) return null;

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
  const rect = rects.find((candidate) => (
    candidate.bottom >= 0
    && candidate.top <= viewportHeight
    && candidate.right >= 0
    && candidate.left <= viewportWidth
  )) || range.getBoundingClientRect();

  if (rect.width === 0 && rect.height === 0) return null;

  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
};

const cleanElementStyles = (element) => {
  element.querySelectorAll('[style]').forEach((node) => {
    node.style.background = '';
    node.style.backgroundColor = '';
    node.style.backgroundImage = '';
    node.style.fontSize = '';
    node.style.fontFamily = '';
    node.style.lineHeight = '';
    node.style.letterSpacing = '';

    if (!node.getAttribute('style')) {
      node.removeAttribute('style');
    }
  });

  element.querySelectorAll('[bgcolor]').forEach((node) => {
    node.removeAttribute('bgcolor');
  });

  element.querySelectorAll('font').forEach((node) => {
    node.removeAttribute('face');
    node.removeAttribute('size');
  });
};

export const sanitizeHtml = (html) => {
  const container = document.createElement('div');
  container.innerHTML = html;
  cleanElementStyles(container);
  return container.innerHTML;
};
