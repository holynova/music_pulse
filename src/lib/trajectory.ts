import type { BeatMarker, PulseSettings } from '../types/audio';

export interface Point {
  x: number;
  y: number;
}

export interface TrajectorySegment {
  startTime: number;
  endTime: number;
  start: Point;
  end: Point;
}

export interface TrajectoryMarker extends BeatMarker {
  position: Point;
}

export interface Trajectory {
  duration: number;
  segments: TrajectorySegment[];
  markers: TrajectoryMarker[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function seededRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function move(point: Point, angle: number, distance: number): Point {
  return {
    x: point.x + Math.cos(angle) * distance,
    y: point.y + Math.sin(angle) * distance,
  };
}

export function buildTrajectory(
  duration: number,
  beats: BeatMarker[],
  settings: Pick<PulseSettings, 'speed' | 'turnStyle'>,
): Trajectory {
  const safeDuration = Math.max(0.01, duration);
  const usableBeats = beats.filter((beat) => beat.time > 0.01 && beat.time < safeDuration);
  const segments: TrajectorySegment[] = [];
  const markers: TrajectoryMarker[] = [];
  let cursor = { x: 0, y: 0 };
  let heading = 0;
  let startTime = 0;

  usableBeats.forEach((beat, index) => {
    const endTime = Math.max(startTime, beat.time);
    const segment = {
      startTime,
      endTime,
      start: cursor,
      end: move(cursor, heading, (endTime - startTime) * settings.speed),
    };
    segments.push(segment);
    cursor = segment.end;
    markers.push({ ...beat, position: cursor });

    const direction = settings.turnStyle === 'zigzag'
      ? index % 2 === 0 ? 1 : -1
      : seededRandom(index + 17) > 0.5 ? 1 : -1;
    const randomness = settings.turnStyle === 'zigzag' ? 1 : 0.72 + seededRandom(index + 83) * 0.28;
    const angle = Math.PI * (0.26 + beat.strength * 0.42) * randomness;
    heading += direction * angle;
    startTime = endTime;
  });

  segments.push({
    startTime,
    endTime: safeDuration,
    start: cursor,
    end: move(cursor, heading, (safeDuration - startTime) * settings.speed),
  });

  return { duration: safeDuration, segments, markers };
}

export function positionAt(trajectory: Trajectory, time: number): Point {
  const target = clamp(time, 0, trajectory.duration);
  const segment = trajectory.segments.find((item) => target <= item.endTime) ?? trajectory.segments.at(-1);

  if (!segment || segment.endTime <= segment.startTime) {
    return segment?.end ?? { x: 0, y: 0 };
  }

  const progress = clamp(
    (target - segment.startTime) / (segment.endTime - segment.startTime),
    0,
    1,
  );

  return {
    x: segment.start.x + (segment.end.x - segment.start.x) * progress,
    y: segment.start.y + (segment.end.y - segment.start.y) * progress,
  };
}

export function findBeatIndex(beats: BeatMarker[], time: number): number {
  let activeIndex = -1;
  for (let index = 0; index < beats.length; index += 1) {
    const beat = beats[index];
    if (beat && beat.time <= time) {
      activeIndex = index;
    } else {
      break;
    }
  }
  return activeIndex;
}
