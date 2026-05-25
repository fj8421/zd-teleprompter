// 麦克风语速估算器（wpm）

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const createSpeechProfile = (text = '') => {
  const hanCount = (text.match(/[\p{Script=Han}]/gu) || []).length;
  const latinWords = (text.match(/[\p{Script=Latin}\p{N}]+(?:['’.-][\p{Script=Latin}\p{N}]+)*/gu) || []).length;
  const readingUnits = Math.max(1, hanCount + latinWords);
  const chineseRatio = hanCount / readingUnits;

  return {
    chineseRatio,
    syllablesPerReadingUnit: clamp((chineseRatio * 1.15) + ((1 - chineseRatio) * 1.45), 1.05, 1.6)
  };
};

export class SpeedEstimator {
  constructor(profile = createSpeechProfile()) {
    this.profile = profile;
    this.peaks = [];
    this.energyWindow = [];
    this.windowSize = 4500;
    this.minPeakGap = 120;
    this.lastPeakTime = 0;
    this.lastEnergy = 0;
    this.lastDelta = 0;
    this.noiseFloor = 0.012;
    this.smoothSpeed = 120;
    this.alpha = 0.18;
    this.lastSoundTime = 0;
  }

  calculateEnergy(dataArray) {
    let sum = 0;
    for (let index = 0; index < dataArray.length; index++) {
      const normalized = (dataArray[index] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  updateNoiseFloor(energy) {
    this.energyWindow.push(energy);
    if (this.energyWindow.length > 120) {
      this.energyWindow.shift();
    }

    const sorted = [...this.energyWindow].sort((a, b) => a - b);
    const quietIndex = Math.floor(sorted.length * 0.25);
    const quietEnergy = sorted[quietIndex] ?? energy;
    this.noiseFloor = (this.noiseFloor * 0.95) + (quietEnergy * 0.05);
  }

  detectPeak(energy, timestamp) {
    this.updateNoiseFloor(energy);

    const speechGate = Math.max(0.018, this.noiseFloor * 2.6);
    const peakGate = Math.max(0.004, this.noiseFloor * 0.35);
    const delta = energy - this.lastEnergy;
    const isLocalPeak = this.lastDelta > peakGate && delta <= 0;
    const hasEnoughGap = timestamp - this.lastPeakTime >= this.minPeakGap;

    if (energy > speechGate) {
      this.lastSoundTime = timestamp;
    }

    if (isLocalPeak && this.lastEnergy > speechGate && hasEnoughGap) {
      this.peaks.push(timestamp);
      this.lastPeakTime = timestamp;
    }

    this.lastDelta = delta;
    this.lastEnergy = energy;

    const cutoff = timestamp - this.windowSize;
    this.peaks = this.peaks.filter(time => time > cutoff);
  }

  estimateSpeed(dataArray, timestamp) {
    const energy = this.calculateEnergy(dataArray);
    this.detectPeak(energy, timestamp);

    const silenceDuration = timestamp - this.lastSoundTime;
    const isSilent = silenceDuration > 800;
    const activeWindowSeconds = Math.max(1, Math.min(this.windowSize, timestamp - (this.peaks[0] ?? timestamp)) / 1000);
    const syllablesPerSecond = this.peaks.length / activeWindowSeconds;
    const readingUnitsPerMinute = (syllablesPerSecond * 60) / this.profile.syllablesPerReadingUnit;
    const rawSpeed = isSilent ? 0 : clamp(readingUnitsPerMinute, 60, 360);
    const alpha = isSilent ? 0.12 : this.alpha;

    this.smoothSpeed = (alpha * rawSpeed) + ((1 - alpha) * this.smoothSpeed);

    return Math.round(clamp(this.smoothSpeed, 0, 360));
  }

  reset(profile = this.profile) {
    this.profile = profile;
    this.peaks = [];
    this.energyWindow = [];
    this.lastPeakTime = 0;
    this.lastEnergy = 0;
    this.lastDelta = 0;
    this.noiseFloor = 0.012;
    this.smoothSpeed = 120;
    this.lastSoundTime = 0;
  }
}
