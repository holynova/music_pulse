import { useEffect, useRef } from 'react';
import { getCopy, type Language } from '../lib/i18n';
import type { BeatMarker, EnergySample } from '../types/audio';

interface TimelineProps {
  beats: BeatMarker[];
  language: Language;
  envelope: EnergySample[];
  currentTime: number;
  duration: number;
  activeBeatIndex: number;
  onSeek: (time: number) => void;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function Timeline({ beats, envelope, currentTime, duration, activeBeatIndex, language, onSeek }: TimelineProps) {
  const waveformRef = useRef<HTMLCanvasElement>(null);
  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
  const copy = getCopy(language);

  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;
    context.strokeStyle = 'rgba(198, 233, 237, 0.24)';
    context.beginPath();
    envelope.forEach((sample, index) => {
      const x = (index / Math.max(1, envelope.length - 1)) * width;
      const amplitude = Math.max(2, sample.value * (height - 4));
      context.moveTo(x, (height - amplitude) / 2);
      context.lineTo(x, (height + amplitude) / 2);
    });
    context.stroke();
  }, [envelope]);

  return (
    <div className="timeline-block">
      <div className="timeline-meta">
        <span className="timecode">{formatTime(currentTime)}</span>
        <span className="timeline-label">{copy.pulseTimeline}</span>
        <span className="timecode">{formatTime(duration)}</span>
      </div>
      <div className="timeline-track">
        <canvas ref={waveformRef} className="timeline-waveform" aria-hidden="true" />
        <div className="timeline-progress" style={{ width: `${progress * 100}%` }} />
        {beats.map((beat, index) => {
          const left = duration > 0 ? `${(beat.time / duration) * 100}%` : '0%';
          return (
            <button
              key={beat.id}
              type="button"
              className={`beat-marker ${index === activeBeatIndex ? 'beat-marker-active' : ''}`}
              style={{ left }}
              title={`${copy.jumpToBeat} ${formatTime(beat.time)}`}
              aria-label={`${copy.jumpToBeat} ${formatTime(beat.time)}`}
              onClick={() => onSeek(beat.time)}
            />
          );
        })}
        <input
          className="timeline-input"
          type="range"
          min="0"
          max={duration || 1}
          step="0.01"
          value={Math.min(currentTime, duration || 1)}
          onChange={(event) => onSeek(Number(event.target.value))}
          aria-label={copy.seekTrack}
        />
      </div>
    </div>
  );
}
