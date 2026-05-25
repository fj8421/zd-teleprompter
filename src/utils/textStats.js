export const htmlToPlainText = (html = '') => {
  const container = document.createElement('div');
  container.innerHTML = html;
  return container.textContent || '';
};

export const countTextUnits = (text = '') => {
  const withoutHan = text.replace(/[\p{Script=Han}]/gu, ' ');
  const hanCount = (text.match(/[\p{Script=Han}]/gu) || []).length;
  const digitCount = (withoutHan.match(/\p{N}/gu) || []).length;
  const wordCount = (withoutHan.match(/[\p{L}]+(?:['’.-][\p{L}]+)*/gu) || []).length;

  return hanCount + digitCount + wordCount;
};

export const countHtmlTextUnits = (html = '') => countTextUnits(htmlToPlainText(html));
