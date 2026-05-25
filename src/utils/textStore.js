// 本地存储管理

import { APP_LIMITS } from '../config/settingsDefaults';

const KEY = 'tp.texts';

const createId = (list) => {
  let max = 0;
  for (const item of list) {
    const m = /^t(\d+)$/.exec(item?.id || '');
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return `t${max + 1}`;
};

const normalizeTexts = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(text => text && typeof text === 'object');
};

const persistTexts = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      throw new Error('QUOTA');
    }
    throw new Error('STORAGE');
  }
};

export const listTexts = () => {
  try {
    return normalizeTexts(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return [];
  }
};

export const getText = (id) => {
  const list = listTexts();
  return list.find(t => t.id === id);
};

export const saveText = ({ id, title, html }) => {
  const list = listTexts();
  const idx = id ? list.findIndex(t => t.id === id) : -1;
  const now = Date.now();
  let savedText = null;

  if (idx >= 0) {
    savedText = { ...list[idx], title, html, updatedAt: now };
    list[idx] = savedText;
  } else {
    if (list.length >= APP_LIMITS.maxTexts) {
      throw new Error('LIMIT');
    }
    savedText = {
      id: id || createId(list),
      title,
      html,
      createdAt: now,
      updatedAt: now
    };
    list.push(savedText);
  }

  persistTexts(list);
  return savedText;
};

export const deleteText = (id) => {
  const list = listTexts();
  const filtered = list.filter(t => t.id !== id);
  persistTexts(filtered);
};
