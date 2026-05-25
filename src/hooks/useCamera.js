import { useState, useEffect, useRef, useCallback } from 'react';
import { getResolutionConstraints } from '../utils/recorderSupport';

const buildVideoConstraints = ({ facingMode, deviceId, resolution }) => {
  const base = getResolutionConstraints(resolution);
  if (deviceId) {
    return { ...base, deviceId: { exact: deviceId } };
  }
  return { ...base, facingMode: { ideal: facingMode || 'user' } };
};

export const useCamera = ({ enabled, facingMode, deviceId, resolution }) => {
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);
  const requestIdRef = useRef(0);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === 'videoinput'));
    } catch (e) {
      console.error('enumerateDevices failed:', e);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopStream();
      setError(null);
      return undefined;
    }

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      setError('CAMERA_UNSUPPORTED');
      return undefined;
    }

    let cancelled = false;
    const requestId = ++requestIdRef.current;

    const acquire = async () => {
      try {
        setError(null);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        const next = await mediaDevices.getUserMedia({
          video: buildVideoConstraints({ facingMode, deviceId, resolution }),
          audio: true
        });
        if (cancelled || requestId !== requestIdRef.current) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = next;
        setStream(next);
        refreshDevices();
      } catch (e) {
        if (cancelled || requestId !== requestIdRef.current) return;
        console.error('getUserMedia failed:', e);
        if (e?.name === 'NotAllowedError') {
          setError('CAMERA_DENIED');
        } else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') {
          setError('CAMERA_NOT_FOUND');
        } else {
          setError('CAMERA_ERROR');
        }
        setStream(null);
      }
    };

    acquire();

    return () => {
      cancelled = true;
    };
  }, [enabled, facingMode, deviceId, resolution, refreshDevices, stopStream]);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.addEventListener) return undefined;
    const handler = () => refreshDevices();
    mediaDevices.addEventListener('devicechange', handler);
    return () => mediaDevices.removeEventListener('devicechange', handler);
  }, [refreshDevices]);

  return { stream, devices, error, refreshDevices };
};
