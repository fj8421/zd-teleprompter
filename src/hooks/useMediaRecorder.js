import { useState, useRef, useCallback, useEffect } from 'react';
import {
  isMediaRecorderSupported,
  pickRecorderMimeType,
  getRecorderBitrate,
  buildRecordingFileName,
  downloadBlob
} from '../utils/recorderSupport';

export const useMediaRecorder = (stream, { resolution } = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const extRef = useRef('webm');
  const startTimeRef = useRef(0);
  const accumulatedRef = useRef(0);
  const tickRef = useRef(null);
  const previewUrlRef = useRef(null);

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewBlob(null);
    setPreviewUrl(null);
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch (e) {
        console.error('Recorder stop failed:', e);
      }
    }
  }, []);

  const start = useCallback(() => {
    if (!isMediaRecorderSupported()) {
      setError('RECORDER_UNSUPPORTED');
      return false;
    }
    if (!stream) {
      setError('RECORDER_NO_STREAM');
      return false;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      return false;
    }

    revokePreview();

    const picked = pickRecorderMimeType();
    extRef.current = picked?.ext || 'webm';

    let recorder;
    try {
      const options = {
        videoBitsPerSecond: getRecorderBitrate(resolution)
      };
      if (picked?.mime) options.mimeType = picked.mime;
      recorder = new MediaRecorder(stream, options);
    } catch (e) {
      console.error('MediaRecorder init failed:', e);
      setError('RECORDER_INIT_FAILED');
      return false;
    }

    chunksRef.current = [];
    accumulatedRef.current = 0;
    startTimeRef.current = performance.now();

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      clearTick();
      const blob = new Blob(chunksRef.current, { type: picked?.mime || 'video/webm' });
      chunksRef.current = [];
      setIsRecording(false);
      setIsPaused(false);
      accumulatedRef.current = 0;
      if (blob.size > 0) {
        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewBlob(blob);
        setPreviewUrl(url);
      } else {
        setDurationMs(0);
      }
    };

    recorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      setError('RECORDER_ERROR');
    };

    try {
      recorder.start(1000);
    } catch (e) {
      console.error('Recorder start failed:', e);
      setError('RECORDER_START_FAILED');
      return false;
    }

    recorderRef.current = recorder;
    setError(null);
    setIsRecording(true);
    setIsPaused(false);
    setDurationMs(0);

    tickRef.current = setInterval(() => {
      if (!recorderRef.current || recorderRef.current.state !== 'recording') return;
      const elapsed = accumulatedRef.current + (performance.now() - startTimeRef.current);
      setDurationMs(elapsed);
    }, 250);

    return true;
  }, [stream, resolution, revokePreview]);

  const pause = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    try {
      recorder.pause();
      accumulatedRef.current += performance.now() - startTimeRef.current;
      setIsPaused(true);
    } catch (e) {
      console.error('Recorder pause failed:', e);
    }
  }, []);

  const resume = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    try {
      recorder.resume();
      startTimeRef.current = performance.now();
      setIsPaused(false);
    } catch (e) {
      console.error('Recorder resume failed:', e);
    }
  }, []);

  const downloadPreview = useCallback(() => {
    if (!previewBlob) return false;
    downloadBlob(previewBlob, buildRecordingFileName(extRef.current));
    return true;
  }, [previewBlob]);

  const discardPreview = useCallback(() => {
    revokePreview();
    setDurationMs(0);
  }, [revokePreview]);

  useEffect(() => () => {
    clearTick();
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try { recorder.stop(); } catch (e) { /* ignore */ }
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!stream && recorderRef.current && recorderRef.current.state !== 'inactive') {
      stop();
    }
  }, [stream, stop]);

  return {
    isRecording,
    isPaused,
    durationMs,
    error,
    previewBlob,
    previewUrl,
    hasPreview: !!previewBlob,
    start,
    pause,
    resume,
    stop,
    downloadPreview,
    discardPreview
  };
};
