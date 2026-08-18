import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ControlDock } from './components/ControlDock';
import { Icon } from './components/Icons';
import { PulseCanvas } from './components/PulseCanvas';
import { SettingsPanel } from './components/SettingsPanel';
import { Timeline } from './components/Timeline';
import { UploadPanel } from './components/UploadPanel';
import { useAudioSession } from './hooks/useAudioSession';
import { formatMoments, getCopy, type Language } from './lib/i18n';
import { buildTrajectory, findBeatIndex } from './lib/trajectory';
import type { DemoTrack, PulseSettings } from './types/audio';

const DEMO_TRACKS: DemoTrack[] = [
  {
    id: 'house',
    title: 'Play House - FREE',
    artist: 'Play House',
    category: 'House · CC0',
    categoryZh: 'House · CC0',
    src: '/audio/play-house-free.mp3',
    filename: 'Play House - FREE.mp3',
  },
  {
    id: 'ragtime',
    title: 'Country Club',
    titleZh: 'Country Club',
    artist: 'Scott Joplin',
    category: 'Piano · Public Domain',
    categoryZh: '钢琴 · 公共领域',
    src: '/audio/country-club-ragtime.mp3',
    filename: 'Scott Joplin - Country Club.mp3',
  },
  {
    id: 'grieg',
    title: 'Piano Concerto in A minor',
    titleZh: 'A 小调钢琴协奏曲',
    artist: 'Edvard Grieg',
    category: 'Classical · Public Domain',
    categoryZh: '古典 · 公共领域',
    src: '/audio/grieg-piano-concerto.mp3',
    filename: 'Edvard Grieg - Piano Concerto.mp3',
  },
];

const DEFAULT_SETTINGS: PulseSettings = {
  sensitivity: 1,
  minGap: 0.22,
  speed: 88,
  trailLength: 18,
  turnStyle: 'random',
  showMarkers: true,
};

function formatDuration(value: number): string {
  if (!Number.isFinite(value)) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function isSupportedAudio(file: File): boolean {
  return file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(file.name);
}

function App() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackPickerRef = useRef<HTMLElement>(null);
  const reanalysisTimerRef = useRef<number | null>(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [loadingDemoId, setLoadingDemoId] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('zh');
  const copy = getCopy(language);
  const { file, source, analysis, selectFile, reanalyze } = useAudioSession(language);

  const result = analysis.result;
  const { speed, turnStyle } = settings;
  const trajectory = useMemo(() => {
    if (!result) return null;
    return buildTrajectory(result.duration, result.beats, { speed, turnStyle });
  }, [result, speed, turnStyle]);
  const activeBeatIndex = findBeatIndex(result?.beats ?? [], currentTime);
  const duration = result?.duration ?? 0;
  const isReady = analysis.phase === 'ready' && Boolean(result && trajectory);

  const revealTrackPicker = useCallback(() => {
    const picker = trackPickerRef.current;
    if (!picker) return;
    picker.scrollIntoView({ behavior: 'smooth', block: 'start' });
    picker.focus({ preventScroll: true });
  }, []);

  const loadFile = useCallback((nextFile: File) => {
    setLoadingDemoId(null);
    setPlaybackError(null);
    if (!isSupportedAudio(nextFile)) {
      setFileError(copy.unsupportedAudio);
      return;
    }

    setFileError(null);
    setCurrentTime(0);
    setIsPlaying(false);
    audioRef.current?.pause();
    void selectFile(nextFile, {
      sensitivity: settings.sensitivity,
      minGap: settings.minGap,
    });
  }, [copy.unsupportedAudio, selectFile, settings.minGap, settings.sensitivity]);

  const loadDemo = useCallback(async (track: DemoTrack) => {
    setLoadingDemoId(track.id);
    setFileError(null);
    try {
      const response = await fetch(track.src);
      if (!response.ok) throw new Error(copy.includedSampleUnavailable);
      const blob = await response.blob();
      loadFile(new File([blob], track.filename, { type: blob.type || 'audio/mpeg' }));
    } catch (error) {
      setLoadingDemoId(null);
      setFileError(error instanceof Error ? error.message : copy.includedSampleLoadFailed);
    }
  }, [copy.includedSampleLoadFailed, copy.includedSampleUnavailable, loadFile]);

  const handleTogglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !isReady) return;
    setPlaybackError(null);

    if (audio.ended || audio.currentTime >= duration) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch {
      setPlaybackError(copy.playbackBlocked);
    }
  }, [copy.playbackBlocked, duration, isReady]);

  const handleRestart = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const handleSeek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.min(Math.max(time, 0), duration);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }, [duration]);

  const handleSettingsChange = useCallback((nextSettings: PulseSettings) => {
    const detectionChanged = nextSettings.sensitivity !== settings.sensitivity || nextSettings.minGap !== settings.minGap;
    setSettings(nextSettings);

    if (detectionChanged && file) {
      audioRef.current?.pause();
      if (reanalysisTimerRef.current) window.clearTimeout(reanalysisTimerRef.current);
      reanalysisTimerRef.current = window.setTimeout(() => {
        void reanalyze({ sensitivity: nextSettings.sensitivity, minGap: nextSettings.minGap });
      }, 450);
    }
  }, [file, reanalyze, settings.minGap, settings.sensitivity]);

  useEffect(() => {
    return () => {
      if (reanalysisTimerRef.current) window.clearTimeout(reanalysisTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateClock = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      if (audio && !audio.paused && !audio.ended) {
        frame = window.requestAnimationFrame(updateClock);
      }
    };

    if (isPlaying) frame = window.requestAnimationFrame(updateClock);
    return () => window.cancelAnimationFrame(frame);
  }, [isPlaying]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-symbol"><Icon name="spark" /></div>
          <div>
            <p className="brand-name">Music Pulse</p>
            <p className="brand-caption">{copy.brandCaption}</p>
          </div>
        </div>
        <div className="topbar-meta">
          <span className="live-indicator"><span /> {copy.browserOnly}</span>
          <button
            className="language-toggle"
            type="button"
            onClick={() => setLanguage((current) => current === 'en' ? 'zh' : 'en')}
            aria-label={language === 'en' ? copy.switchToChinese : copy.switchToEnglish}
            title={language === 'en' ? copy.switchToChinese : copy.switchToEnglish}
          >
            {language === 'en' ? '中文' : 'EN'}
          </button>
          <button className="change-track-button" type="button" onClick={revealTrackPicker}>
            <Icon name="upload" />
            {file ? copy.changeTrack : copy.loadTrack}
          </button>
        </div>
      </header>

      <main id="main-content" className="workspace" lang={language}>
        <section className="main-column" aria-label={copy.pulseVisualizer}>
          <div className="stage-header">
            <div>
              <p className="eyebrow">01 / {copy.pulseMap}</p>
              <h1>{file ? file.name : copy.pulseMap}</h1>
            </div>
            <div className="stage-readout">
              <span className={`status-dot status-${analysis.phase}`} />
              <span>{analysis.phase === 'ready' ? formatMoments(language, result?.beats.length ?? 0) : analysis.phase === 'idle' ? copy.waitingForTrack : analysis.message}</span>
            </div>
          </div>

          <section
            ref={trackPickerRef}
            className="track-picker"
            aria-labelledby="track-picker-title"
            tabIndex={-1}
          >
            <div className="track-picker-header">
              <div>
                <p className="eyebrow">{copy.chooseTrackEyebrow}</p>
                <h2 id="track-picker-title">{copy.chooseTrackTitle}</h2>
                <p>{copy.chooseTrackBody}</p>
              </div>
              <span className="track-picker-note">{copy.localOnly}</span>
            </div>
            <UploadPanel
              language={language}
              onFile={loadFile}
              demoTracks={DEMO_TRACKS}
              demoLoadingId={loadingDemoId}
              onDemo={(track) => void loadDemo(track)}
            />
          </section>

          <div className="visual-stage">
            {isReady && trajectory ? (
              <PulseCanvas
                trajectory={trajectory}
                currentTime={currentTime}
                activeBeatIndex={activeBeatIndex}
                isPlaying={isPlaying}
                language={language}
                settings={settings}
              />
            ) : file && (analysis.phase === 'decoding' || analysis.phase === 'analyzing') ? (
              <div className="stage-state">
                <div className="analysis-spinner"><Icon name="loader" /></div>
                <p className="eyebrow">{analysis.phase === 'decoding' ? copy.decoding : copy.analyzing}</p>
                <h2>{analysis.message}</h2>
                <div className="analysis-progress" aria-label={`${Math.round(analysis.progress * 100)}% complete`}>
                  <span style={{ width: `${analysis.progress * 100}%` }} />
                </div>
                <p className="state-copy">{copy.stageCopy}</p>
              </div>
            ) : analysis.phase === 'error' || fileError ? (
              <div className="stage-state stage-state-error">
                <div className="error-mark"><Icon name="refresh" /></div>
                <p className="eyebrow">{copy.cannotMakeMap}</p>
                <h2>{fileError ?? copy.cannotAnalyzeTrack}</h2>
                <p className="state-copy">{copy.tryAnotherTrack}</p>
                <button className="button button-secondary" type="button" onClick={revealTrackPicker}>{copy.chooseAnother}</button>
              </div>
            ) : (
              <div className="stage-state stage-state-empty">
                <div className="upload-icon" aria-hidden="true"><Icon name="waveform" /></div>
                <p className="eyebrow">{copy.readyForTrack}</p>
                <h2>{copy.emptyTitle}</h2>
                <p className="state-copy">{copy.emptyBody}</p>
              </div>
            )}
            <div className="stage-corner stage-corner-left">{copy.xTime}</div>
            <div className="stage-corner stage-corner-right">{isPlaying ? copy.playing : copy.paused}</div>
          </div>

          {result && trajectory && (
            <>
              <Timeline
                beats={result.beats}
                envelope={result.envelope}
                language={language}
                currentTime={currentTime}
                duration={duration}
                activeBeatIndex={activeBeatIndex}
                onSeek={handleSeek}
              />
              <ControlDock
                fileName={file?.name ?? copy.untitledTrack}
                language={language}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onTogglePlay={() => void handleTogglePlay()}
                onRestart={handleRestart}
                onChooseAnother={revealTrackPicker}
              />
            </>
          )}
          {playbackError && <p className="inline-error" role="alert">{playbackError}</p>}
        </section>

        <aside className="side-column">
          <div className="side-summary">
            <p className="eyebrow">{copy.readout}</p>
            <div className="summary-number">{result ? result.beats.length.toString().padStart(2, '0') : '--'}</div>
            <p className="summary-label">{copy.detectedPulseMoments}</p>
            <div className="summary-details">
              <div><span>{copy.trackLength}</span><strong>{result ? formatDuration(result.duration) : '--:--'}</strong></div>
              <div><span>{copy.analysis}</span><strong>{result ? copy.local : copy.waiting}</strong></div>
            </div>
          </div>
          <SettingsPanel language={language} settings={settings} onChange={handleSettingsChange} />
          <div className="side-note">
            <Icon name="file-audio" />
            <p>{copy.pulseNote}</p>
          </div>
        </aside>
      </main>

      <audio
        ref={audioRef}
        className="sr-only"
        src={source ?? undefined}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(duration);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        aria-label={copy.pulseVisualizer}
      />
      <footer className="footer-note">{copy.footer}</footer>
    </div>
  );
}

export default App;
