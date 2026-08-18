import { describe, expect, it } from 'vitest';
import { detectPeaks } from './beatDetection';

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
});
