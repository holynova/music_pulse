import { useState, useRef } from 'react';
import { AudioPlayer } from './components/AudioPlayer';
import { CanvasStage } from './components/CanvasStage';
import { AudioAnalyzer } from './utils/audioAnalyzer';
import { type PulseSettings, SettingsPanel } from './components/SettingsPanel';

function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<PulseSettings>({
      sensitivity: 1.5,
      minGap: 300,
      speed: 3,
      alternatingTurns: false,
      frequencyMode: 'vocal',
      showDebug: false
  });
  
  // Analyzer instance should be stable
  const analyzerRef = useRef<AudioAnalyzer>(new AudioAnalyzer());

  const handleAudioSelected = (file: File) => {
    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
    }
    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioSrc(url);
    setIsPlaying(false);
  };

  const handleAudioElement = (element: HTMLAudioElement) => {
    // Connect analyzer to audio element
    console.log("App: Connecting to audio element", element);
    analyzerRef.current.connect(element);

    // Listen to play/pause
    element.onplay = () => {
      console.log("App: Audio Play event detected");
      analyzerRef.current.resume(); // Ensure context is running
      setIsPlaying(true);
    };
    element.onpause = () => {
       console.log("App: Audio Pause event");
       setIsPlaying(false);
    }
    element.onended = () => setIsPlaying(false);
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      {/* Background/Stage */}
      <CanvasStage 
        analyzer={analyzerRef.current} 
        isPlaying={isPlaying} 
        settings={settings}
      />

      {/* Overlay UI */}
      <div className="absolute top-0 left-0 p-4 pointer-events-none">
        <h1 className="text-2xl font-bold text-white drop-shadow-md">
          Music Pulse
        </h1>
        <p className="text-slate-400 text-sm">
           {audioFile ? `Playing: ${audioFile.name}` : 'Select a song to start'}
        </p>
      </div>
      
      {/* Settings Panel */}
      <SettingsPanel settings={settings} onSettingsChange={setSettings} />

      {/* Controls */}
      <AudioPlayer 
        src={audioSrc}
        onAudioSelected={handleAudioSelected}
        onAudioElement={handleAudioElement}
      />
    </div>
  )
}

export default App
