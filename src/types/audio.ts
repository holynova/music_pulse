export interface BeatMarker {
  id: number;
  time: number;
  strength: number;
}

export interface EnergySample {
  time: number;
  value: number;
  threshold: number;
}

export interface AnalysisResult {
  duration: number;
  beats: BeatMarker[];
  envelope: EnergySample[];
}

export interface DemoTrack {
  id: string;
  title: string;
  titleZh?: string;
  artist: string;
  category: string;
  categoryZh?: string;
  src: string;
  filename: string;
}

export type AnalysisPhase = 'idle' | 'decoding' | 'analyzing' | 'ready' | 'error';

export interface AnalysisState {
  phase: AnalysisPhase;
  progress: number;
  message: string;
  error: string | null;
  result: AnalysisResult | null;
}

export type TurnStyle = 'random' | 'zigzag';

export interface PulseSettings {
  sensitivity: number;
  minGap: number;
  speed: number;
  trailLength: number;
  turnStyle: TurnStyle;
  showMarkers: boolean;
}
