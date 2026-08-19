import { describe, expect, it } from 'vitest';
import { buildTrajectory, findBeatIndex, positionAt } from './trajectory';
import type { BeatMarker } from '../types/audio';

const beats: BeatMarker[] = [
  { id: 0, time: 1, strength: 0.8 },
  { id: 1, time: 2.5, strength: 0.5 },
];

describe('trajectory', () => {
  it('follows audio time and turns at marker positions', () => {
    const trajectory = buildTrajectory(5, beats, { speed: 100, turnStyle: 'random' });
    const beforeTurn = positionAt(trajectory, 0.5);
    const atFirstBeat = positionAt(trajectory, 1);
    const afterTurn = positionAt(trajectory, 1.5);

    expect(beforeTurn).toEqual({ x: 50, y: 0 });
    expect(atFirstBeat).toEqual(trajectory.markers[0]?.position);
    expect(afterTurn.y).not.toBe(0);
  });

  it('is deterministic for the same beat map and settings', () => {
    const first = buildTrajectory(5, beats, { speed: 88, turnStyle: 'random' });
    const second = buildTrajectory(5, beats, { speed: 88, turnStyle: 'random' });
    expect(first).toEqual(second);
  });

  it('finds the latest marker at a playback position', () => {
    expect(findBeatIndex(beats, 0.2)).toBe(-1);
    expect(findBeatIndex(beats, 1)).toBe(0);
    expect(findBeatIndex(beats, 4)).toBe(1);
  });
});
