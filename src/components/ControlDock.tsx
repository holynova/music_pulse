import { Icon } from './Icons';
import { getCopy, type Language } from '../lib/i18n';

interface ControlDockProps {
  fileName: string;
  language: Language;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onRestart: () => void;
  onChooseAnother: () => void;
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function ControlDock({
  fileName,
  language,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onRestart,
  onChooseAnother,
}: ControlDockProps) {
  const copy = getCopy(language);
  return (
    <div className="control-dock">
      <div className="control-track-info">
        <span className="track-status-dot" aria-hidden="true" />
        <div className="min-w-0">
          <p className="track-name" title={fileName}>{fileName}</p>
          <p className="track-position">{formatTime(currentTime)} / {formatTime(duration)}</p>
        </div>
      </div>
      <div className="control-buttons">
        <button className="icon-button" type="button" onClick={onRestart} aria-label={copy.restartTrack} title={copy.restartTrack}>
          <Icon name="refresh" />
        </button>
        <button className="play-button" type="button" onClick={onTogglePlay} aria-label={isPlaying ? copy.pauseTrack : copy.playTrack}>
          <Icon name={isPlaying ? 'pause' : 'play'} />
        </button>
      </div>
      <button className="text-button" type="button" onClick={onChooseAnother}>{copy.chooseAnother}</button>
    </div>
  );
}
