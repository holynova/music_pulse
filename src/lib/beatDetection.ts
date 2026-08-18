import type { AnalysisResult, BeatMarker, EnergySample } from '../types/audio';

const FRAME_SIZE = 2048;
const HOP_SIZE = 512;
const DEFAULT_MIN_GAP = 0.22;

export interface BeatDetectionOptions {
  sensitivity?: number;
  minGap?: number;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

interface BrowserWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Audio analysis was cancelled.', 'AbortError');
  }
}

function createAudioContext(): AudioContext {
  const audioWindow = window as BrowserWindow;
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('This browser does not support the Web Audio API.');
  }

  return new AudioContextConstructor();
}

function readFrameRms(buffer: AudioBuffer, start: number, frameSize: number): number {
  const end = Math.min(buffer.length, start + frameSize);
  const sampleCount = end - start;

  if (sampleCount <= 0) {
    return 0;
  }

  let sum = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let index = start; index < end; index += 1) {
      const sample = samples[index] ?? 0;
      sum += sample * sample;
    }
  }

  return Math.sqrt(sum / (sampleCount * buffer.numberOfChannels));
}

function buildEnergySeries(
  buffer: AudioBuffer,
  options: BeatDetectionOptions,
): { values: number[]; times: number[] } {
  const frameCount = Math.max(1, Math.ceil((buffer.length - FRAME_SIZE) / HOP_SIZE) + 1);
  const values: number[] = [];
  const times: number[] = [];
  let smoothed = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    checkCancelled(options.signal);
    const start = frame * HOP_SIZE;
    const raw = readFrameRms(buffer, start, FRAME_SIZE) * 255;
    smoothed = frame === 0 ? raw : smoothed * 0.78 + raw * 0.22;
    values.push(smoothed);
    times.push(Math.min(buffer.duration, (start + FRAME_SIZE / 2) / buffer.sampleRate));

    if (frame % 48 === 0) {
      options.onProgress?.(0.28 + (frame / frameCount) * 0.32);
    }
  }

  return { values, times };
}

function buildRollingAverage(values: number[], radius: number): number[] {
  const averages = new Array<number>(values.length).fill(0);
  let rollingSum = 0;

  for (let index = 0; index < values.length; index += 1) {
    rollingSum += values[index] ?? 0;
    if (index > radius) {
      rollingSum -= values[index - radius - 1] ?? 0;
    }

    const windowSize = Math.min(index + 1, radius + 1);
    averages[index] = rollingSum / windowSize;
  }

  return averages;
}

export function detectPeaks(
  values: number[],
  times: number[],
  sensitivity: number,
  minGap: number,
): BeatMarker[] {
  const baselineRadius = Math.max(8, Math.round(1.2 / (HOP_SIZE / 44100)));
  const averages = buildRollingAverage(values, baselineRadius);
  const candidates: Array<{ index: number; score: number }> = [];
  const sensitivityFactor = clamp(1.24 - sensitivity * 0.25, 0.6, 1.22);

  for (let index = 2; index < values.length - 2; index += 1) {
    const value = values[index] ?? 0;
    const previous = values[index - 1] ?? 0;
    const next = values[index + 1] ?? 0;
    const baseline = averages[index] ?? 0;
    const threshold = Math.max(5.5, baseline * sensitivityFactor + 3.5);
    const onset = value - Math.min(previous, baseline);
    const isLocalPeak = value >= previous && value >= next;

    if (isLocalPeak && value > threshold && onset > 3) {
      candidates.push({
        index,
        score: clamp((value - threshold) / Math.max(12, value), 0, 1),
      });
    }
  }

  const sorted = [...candidates].sort((left, right) => {
    return (right.score ?? 0) - (left.score ?? 0);
  });
  const selected: Array<{ index: number; score: number }> = [];

  for (const candidate of sorted) {
    const candidateTime = times[candidate.index] ?? 0;
    const tooClose = selected.some((item) => {
      const selectedTime = times[item.index] ?? 0;
      return Math.abs(selectedTime - candidateTime) < minGap;
    });

    if (!tooClose) {
      selected.push(candidate);
    }
  }

  return selected
    .sort((left, right) => left.index - right.index)
    .map((candidate, id) => ({
      id,
      time: times[candidate.index] ?? 0,
      strength: clamp(0.34 + candidate.score * 0.66, 0.34, 1),
    }));
}

function createEnvelope(values: number[], times: number[], averages: number[]): EnergySample[] {
  const maxSamples = 900;
  const step = Math.max(1, Math.ceil(values.length / maxSamples));
  const peak = values.reduce((maximum, value) => Math.max(maximum, value), 1);
  const result: EnergySample[] = [];

  for (let index = 0; index < values.length; index += step) {
    const value = values[index] ?? 0;
    result.push({
      time: times[index] ?? 0,
      value: clamp(value / peak, 0, 1),
      threshold: clamp((averages[index] ?? 0) / peak, 0, 1),
    });
  }

  return result;
}

export async function analyzeAudioFile(
  file: File,
  options: BeatDetectionOptions = {},
): Promise<AnalysisResult> {
  const context = createAudioContext();
  options.onProgress?.(0.05);

  try {
    checkCancelled(options.signal);
    const encoded = await file.arrayBuffer();
    options.onProgress?.(0.16);
    checkCancelled(options.signal);

    const buffer = await context.decodeAudioData(encoded);
    options.onProgress?.(0.26);
    checkCancelled(options.signal);

    const series = buildEnergySeries(buffer, options);
    const radius = Math.max(8, Math.round(1.2 / (HOP_SIZE / buffer.sampleRate)));
    const averages = buildRollingAverage(series.values, radius);
    const beats = detectPeaks(
      series.values,
      series.times,
      options.sensitivity ?? 1,
      options.minGap ?? DEFAULT_MIN_GAP,
    );

    options.onProgress?.(0.94);
    return {
      duration: buffer.duration,
      beats,
      envelope: createEnvelope(series.values, series.times, averages),
    };
  } finally {
    await context.close();
  }
}
