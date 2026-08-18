import { describe, expect, it } from 'vitest';
import { analyzePcmChannels, detectPeaks } from './beatDetection';

function synthesizePianoPattern(sampleRate: number): { samples: Float32Array; targets: number[] } {
  const duration = 8;
  const samples = new Float32Array(duration * sampleRate);
  const targets = Array.from({ length: 14 }, (_, index) => 0.5 + index * 0.5);

  targets.forEach((time) => {
    const amplitude = time < 4 ? 0.72 : 0.075;
    const start = Math.round(time * sampleRate);
    const noteLength = Math.round(sampleRate * 0.28);
    for (let offset = 0; offset < noteLength && start + offset < samples.length; offset += 1) {
      const noteTime = offset / sampleRate;
      const envelope = Math.exp(-noteTime * 13);
      const tone = Math.sin(2 * Math.PI * 440 * noteTime)
        + Math.sin(2 * Math.PI * 880 * noteTime) * 0.42
        + Math.sin(2 * Math.PI * 1760 * noteTime) * 0.16;
      samples[start + offset] = (samples[start + offset] ?? 0) + amplitude * envelope * tone * 0.55;
    }
  });

  return { samples, targets };
}

function countMatches(times: number[], targets: number[], tolerance = 0.08): number {
  return targets.filter((target) => times.some((time) => Math.abs(time - target) <= tolerance)).length;
}

describe('detectPeaks', () => {
  it('keeps separated energy peaks and removes near duplicates', () => {
    const times = Array.from({ length: 18 }, (_, index) => index * 0.1);
    const values = [
      8, 9, 10, 78, 14, 12, 10, 72, 18, 14, 13, 69, 20, 18, 16, 58, 17, 15,
    ];

    const beats = detectPeaks(values, times, 1, 0.22);

    expect(beats.length).toBe(4);
    beats.forEach((beat, index) => {
      expect(beat.time).toBeCloseTo([0.3, 0.7, 1.1, 1.5][index] ?? 0, 8);
    });
    expect(beats.every((beat) => beat.strength >= 0.34 && beat.strength <= 1)).toBe(true);
  });

  it('returns no markers for a flat signal', () => {
    const times = Array.from({ length: 24 }, (_, index) => index * 0.1);
    const values = new Array(24).fill(12);

    expect(detectPeaks(values, times, 1, 0.22)).toEqual([]);
  });

  it('keeps the same pulse pattern when a passage becomes much quieter', () => {
    const times = Array.from({ length: 240 }, (_, index) => index * 0.1);
    const values = times.map((_, index) => {
      const isPulse = index % 10 === 5;
      const isQuietPassage = index >= 120;
      if (isQuietPassage) return isPulse ? 2.4 : 0.35;
      return isPulse ? 24 : 3.5;
    });

    const beats = detectPeaks(values, times, 1, 0.22);
    const loudCount = beats.filter((beat) => beat.time < 12).length;
    const quietCount = beats.filter((beat) => beat.time >= 12).length;

    expect(loudCount).toBeGreaterThanOrEqual(10);
    expect(quietCount).toBeGreaterThanOrEqual(10);
    expect(Math.abs(loudCount - quietCount)).toBeLessThanOrEqual(2);
  });

  it('is nearly invariant when the whole signal is turned down', () => {
    const times = Array.from({ length: 180 }, (_, index) => index * 0.1);
    const values = times.map((_, index) => index % 8 === 3 ? 18 : 2.5);
    const quieterValues = values.map((value) => value * 0.08);

    const normal = detectPeaks(values, times, 1, 0.22).map((beat) => beat.time);
    const quiet = detectPeaks(quieterValues, times, 1, 0.22).map((beat) => beat.time);

    expect(quiet).toEqual(normal);
  });

  it('makes sensitivity materially affect local detail', () => {
    const times = Array.from({ length: 220 }, (_, index) => index * 0.1);
    const values = times.map((_, index) => {
      if (index % 20 === 5) return 12;
      if (index % 20 === 15) return 4.3;
      return 1;
    });

    const restrained = detectPeaks(values, times, 0.1, 0.22);
    const detailed = detectPeaks(values, times, 3, 0.22);

    expect(detailed.length).toBeGreaterThan(restrained.length * 1.5);
  });

  it('detects piano-like attacks in both loud and quiet passages', async () => {
    const { samples, targets } = synthesizePianoPattern(44100);
    const result = await analyzePcmChannels([samples], 44100, { sensitivity: 1, minGap: 0.3 });
    const detectedTimes = result.beats.map((beat) => beat.time);

    expect(countMatches(detectedTimes, targets.slice(0, 7))).toBeGreaterThanOrEqual(6);
    expect(countMatches(detectedTimes, targets.slice(7))).toBeGreaterThanOrEqual(6);
  });

  it('keeps onset timing stable between 44.1 kHz and 48 kHz audio', async () => {
    const at44100 = synthesizePianoPattern(44100);
    const at48000 = synthesizePianoPattern(48000);
    const [result44100, result48000] = await Promise.all([
      analyzePcmChannels([at44100.samples], 44100, { sensitivity: 1, minGap: 0.3 }),
      analyzePcmChannels([at48000.samples], 48000, { sensitivity: 1, minGap: 0.3 }),
    ]);

    const times44100 = result44100.beats.map((beat) => beat.time);
    const times48000 = result48000.beats.map((beat) => beat.time);
    expect(countMatches(times48000, times44100, 0.025)).toBe(times44100.length);
  });

  it('does not invent pulse markers in silence', async () => {
    const silence = new Float32Array(44100 * 4);
    const result = await analyzePcmChannels([silence], 44100, { sensitivity: 3, minGap: 0.12 });

    expect(result.beats).toEqual([]);
  });
});
