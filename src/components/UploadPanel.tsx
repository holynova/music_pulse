import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { Icon } from './Icons';
import { getCopy, type Language } from '../lib/i18n';
import type { DemoTrack } from '../types/audio';

interface UploadPanelProps {
  onFile: (file: File) => void;
  language: Language;
  demoTracks?: DemoTrack[];
  demoLoadingId?: string | null;
  onDemo?: (track: DemoTrack) => void;
}

export function UploadPanel({ onFile, language, demoTracks, demoLoadingId = null, onDemo }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const copy = getCopy(language);

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    onFile(file);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  };

  return (
    <div
      className={`upload-panel ${isDragging ? 'upload-panel-dragging' : ''}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setIsDragging(false);
      }}
      onDrop={handleDrop}
    >
      <div className="upload-panel-intro">
        <div className="upload-icon" aria-hidden="true">
          <Icon name="waveform" />
        </div>
        <div className="upload-panel-copy">
          <p className="eyebrow">{copy.localAudioAnalysis}</p>
          <h2 className="upload-title">{copy.uploadTitle}</h2>
          <p className="upload-copy">{copy.uploadCopy}</p>
        </div>
      </div>
      <div className="upload-panel-action">
        <button className="button button-primary" type="button" onClick={() => inputRef.current?.click()}>
          <Icon name="upload" />
          {copy.chooseAudio}
        </button>
        <span className="upload-hint">{copy.uploadHint}</span>
      </div>
      {demoTracks && onDemo && (
        <div className="demo-tracks">
          <p className="demo-heading">{copy.includedExamples}</p>
          <div className="demo-track-list">
            {demoTracks.map((track, index) => (
              <DemoTrackButton
                key={track.id}
                track={track}
                index={index}
                language={language}
                loading={demoLoadingId === track.id}
                disabled={demoLoadingId !== null}
                onClick={() => onDemo(track)}
              />
            ))}
          </div>
        </div>
      )}
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="audio/*"
        onChange={handleChange}
        aria-label={copy.chooseAnotherAudio}
      />
    </div>
  );
}

interface DemoTrackButtonProps {
  track: DemoTrack;
  index: number;
  language: Language;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}

function DemoTrackButton({ track, index, language, loading, disabled, onClick }: DemoTrackButtonProps) {
  const copy = getCopy(language);
  const title = language === 'zh' ? track.titleZh ?? track.title : track.title;
  const category = language === 'zh' ? track.categoryZh ?? track.category : track.category;
  const label = `${String(index + 1).padStart(2, '0')} ${title} ${category} · ${track.artist}`;

  return (
    <button
      className="demo-track"
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title}
    >
      <span className="demo-index">{String(index + 1).padStart(2, '0')}</span>
      <span className="demo-copy">
        <strong>{title}</strong>
        <small>{category} · {track.artist}</small>
      </span>
      <Icon name={loading ? 'loader' : 'play'} aria-hidden="true" />
      {loading && <span className="sr-only">{copy.analyzing}</span>}
    </button>
  );
}
