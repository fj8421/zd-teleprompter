import { useState, useEffect, useRef, useCallback } from 'react';
import { createSpeechProfile, SpeedEstimator } from '../utils/speedEstimator';
import { SETTINGS_DEFAULTS } from '../config/settingsDefaults';

export const useMicSpeed = (enabled, referenceText = '') => {
  const [speed, setSpeed] = useState(SETTINGS_DEFAULTS.speed);
  const [error, setError] = useState(null);
  const [isActive, setIsActive] = useState(false);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const estimatorRef = useRef(null);
  const rafRef = useRef(null);
  const dataArrayRef = useRef(null);
  const speechProfileRef = useRef(createSpeechProfile(referenceText));

  useEffect(() => {
    speechProfileRef.current = createSpeechProfile(referenceText);
    estimatorRef.current?.reset(speechProfileRef.current);
  }, [referenceText]);

  const cleanupAudio = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    estimatorRef.current = null;
    dataArrayRef.current = null;
    setIsActive(false);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);

      cleanupAudio();

      const mediaDevices = navigator.mediaDevices;
      const getUserMedia = mediaDevices?.getUserMedia?.bind(mediaDevices);

      if (!getUserMedia) {
        throw new Error('MIC_UNSUPPORTED');
      }

      const stream = await getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('MIC_UNSUPPORTED');
      }

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.15;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      estimatorRef.current = new SpeedEstimator(speechProfileRef.current);

      setIsActive(true);

      let lastUpdate = 0;
      const analyze = (timestamp) => {
        if (!analyserRef.current || !estimatorRef.current) return;

        // 节流到约 50ms 一次
        if (timestamp - lastUpdate > 50) {
          analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
          const estimatedSpeed = estimatorRef.current.estimateSpeed(
            dataArrayRef.current,
            timestamp
          );
          setSpeed(estimatedSpeed);
          lastUpdate = timestamp;
        }

        rafRef.current = requestAnimationFrame(analyze);
      };

      rafRef.current = requestAnimationFrame(analyze);
    } catch (e) {
      console.error('Mic access failed:', e);
      cleanupAudio();
      if (e.message === 'MIC_UNSUPPORTED') {
        setError('MIC_UNSUPPORTED');
      } else if (e.name === 'NotAllowedError') {
        setError('MIC_DENIED');
      } else {
        setError('MIC_ERROR');
      }
      setIsActive(false);
    }
  }, [cleanupAudio]);

  const stop = useCallback(() => {
    cleanupAudio();
    setError(null);
    setSpeed(SETTINGS_DEFAULTS.speed);
  }, [cleanupAudio]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      stop();
    }

    return () => stop();
  }, [enabled, start, stop]);

  return {
    speed,
    error,
    isActive,
    retry: start
  };
};
