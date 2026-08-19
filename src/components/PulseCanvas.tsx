import { useEffect, useRef } from 'react';
import { type Language } from '../lib/i18n';
import { positionAt, type Trajectory } from '../lib/trajectory';
import type { PulseSettings } from '../types/audio';

interface PulseCanvasProps {
  trajectory: Trajectory | null;
  currentTime: number;
  activeBeatIndex: number;
  isPlaying: boolean;
  language: Language;
  settings: PulseSettings;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pointOnSegment(
  segment: Trajectory['segments'][number],
  time: number,
) {
  const progress = segment.endTime <= segment.startTime
    ? 1
    : clamp((time - segment.startTime) / (segment.endTime - segment.startTime), 0, 1);

  return {
    x: segment.start.x + (segment.end.x - segment.start.x) * progress,
    y: segment.start.y + (segment.end.y - segment.start.y) * progress,
  };
}

export function PulseCanvas({ trajectory, currentTime, activeBeatIndex, isPlaying, language, settings }: PulseCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimensionsRef = useRef({ width: 0, height: 0, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dimensionsRef.current = { width: rect.width, height: rect.height, dpr };
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height, dpr } = dimensionsRef.current;
    const context = canvas.getContext('2d');
    if (!context || width === 0 || height === 0) return;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#0b0f10';
    context.fillRect(0, 0, width, height);

    if (!trajectory) {
      context.strokeStyle = 'rgba(203, 230, 237, 0.1)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(width / 2 - 42, height / 2);
      context.lineTo(width / 2 + 42, height / 2);
      context.stroke();
      return;
    }

    const current = positionAt(trajectory, currentTime);
    const trailStart = Math.max(0, currentTime - settings.trailLength);
    context.save();
    context.translate(width / 2 - current.x, height / 2 - current.y);

    for (const segment of trajectory.segments) {
      if (segment.endTime < trailStart || segment.startTime > currentTime) continue;

      const startTime = Math.max(segment.startTime, trailStart);
      const endTime = Math.min(segment.endTime, currentTime);
      const start = pointOnSegment(segment, startTime);
      const end = pointOnSegment(segment, endTime);
      const age = currentTime - endTime;
      const alpha = clamp(0.18 + (1 - age / settings.trailLength) * 0.72, 0.18, 0.9);

      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.lineWidth = 1.6 + alpha * 1.5;
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.strokeStyle = `rgba(205, 237, 241, ${alpha})`;
      context.stroke();
    }

    if (settings.showMarkers) {
      for (const [index, marker] of trajectory.markers.entries()) {
        if (marker.time < trailStart || marker.time > currentTime) continue;
        const age = currentTime - marker.time;
        const isActive = index === activeBeatIndex && age < 0.34;
        const markerAlpha = isActive ? 1 : clamp(0.3 + (1 - age / settings.trailLength) * 0.5, 0.24, 0.78);

        context.beginPath();
        context.arc(marker.position.x, marker.position.y, isActive ? 4.4 : 3, 0, Math.PI * 2);
        context.fillStyle = `rgba(242, 180, 72, ${markerAlpha})`;
        context.fill();

        if (isActive) {
          const pulse = isPlaying ? clamp(1 - age / 0.34, 0, 1) : 0.5;
          context.beginPath();
          context.arc(marker.position.x, marker.position.y, 8 + pulse * 15, 0, Math.PI * 2);
          context.strokeStyle = `rgba(242, 180, 72, ${pulse * 0.55})`;
          context.lineWidth = 1.4;
          context.stroke();
        }
      }
    }

    context.beginPath();
    context.arc(current.x, current.y, 4.5, 0, Math.PI * 2);
    context.fillStyle = '#f4fbfb';
    context.shadowColor = 'rgba(171, 238, 231, 0.65)';
    context.shadowBlur = 16;
    context.fill();
    context.shadowBlur = 0;
    context.restore();

    context.fillStyle = 'rgba(205, 237, 241, 0.3)';
    context.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
    context.fillText(language === 'zh' ? (isPlaying ? '实时轨迹' : '轨迹暂停') : (isPlaying ? 'LIVE PATH' : 'PATH HOLD'), 18, height - 18);
  }, [activeBeatIndex, currentTime, isPlaying, language, settings, trajectory]);

  return (
    <canvas
      ref={canvasRef}
      className="pulse-canvas"
      aria-label="Music pulse trajectory visualization"
    />
  );
}
