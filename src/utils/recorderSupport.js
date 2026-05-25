const PREFERRED_MIME_TYPES = [
  { mime: 'video/mp4;codecs=avc1,mp4a.40.2', ext: 'mp4' },
  { mime: 'video/mp4', ext: 'mp4' },
  { mime: 'video/webm;codecs=vp9,opus', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8,opus', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' }
];

export const isMediaRecorderSupported = () => (
  typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined'
);

export const pickRecorderMimeType = () => {
  if (!isMediaRecorderSupported()) return null;
  for (const candidate of PREFERRED_MIME_TYPES) {
    if (window.MediaRecorder.isTypeSupported?.(candidate.mime)) {
      return candidate;
    }
  }
  return { mime: '', ext: 'webm' };
};

export const getResolutionConstraints = (resolution) => {
  switch (Number(resolution)) {
    case 1080:
      return { width: { ideal: 1920 }, height: { ideal: 1080 } };
    case 480:
      return { width: { ideal: 854 }, height: { ideal: 480 } };
    case 720:
    default:
      return { width: { ideal: 1280 }, height: { ideal: 720 } };
  }
};

export const getRecorderBitrate = (resolution) => {
  switch (Number(resolution)) {
    case 1080:
      return 6_000_000;
    case 480:
      return 1_500_000;
    case 720:
    default:
      return 3_000_000;
  }
};

export const buildRecordingFileName = (ext = 'webm', date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `紫电录像_${stamp}.${ext}`;
};

export const downloadBlob = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
