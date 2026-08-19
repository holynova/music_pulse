import { useCallback, useEffect, useRef, useState } from 'react';
import { getCopy, type Language } from '../lib/i18n';
import { analyzeAudioFile } from '../lib/beatDetection';
import type { AnalysisState } from '../types/audio';

function createInitialAnalysis(language: Language): AnalysisState {
  return {
    phase: 'idle',
    progress: 0,
    message: getCopy(language).waitingForTrack,
    error: null,
    result: null,
  };
}

function formatError(error: unknown, language: Language): string {
  const copy = getCopy(language);
  if (error instanceof DOMException && error.name === 'AbortError') {
    return copy.analysisCancelled;
  }
  return copy.cannotReadAudio;
}

interface DetectionOptions {
  sensitivity?: number;
  minGap?: number;
}

export function useAudioSession(language: Language) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState>(() => createInitialAnalysis(language));
  const abortRef = useRef<AbortController | null>(null);
  const sourceRef = useRef<string | null>(null);

  const runAnalysis = useCallback(async (nextFile: File, options: DetectionOptions = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const copy = getCopy(language);
    setAnalysis({
      phase: 'decoding',
      progress: 0.04,
      message: copy.readingAudio,
      error: null,
      result: null,
    });

    try {
      const result = await analyzeAudioFile(nextFile, {
        signal: controller.signal,
        sensitivity: options.sensitivity,
        minGap: options.minGap,
        onProgress: (progress) => {
          setAnalysis({
            phase: progress < 0.27 ? 'decoding' : 'analyzing',
            progress,
            message: progress < 0.27 ? copy.decodingTrack : copy.findingPulse,
            error: null,
            result: null,
          });
        },
      });

      if (!controller.signal.aborted) {
        setAnalysis({
          phase: 'ready',
          progress: 1,
          message: copy.pulseMapReady,
          error: null,
          result,
        });
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setAnalysis({
          phase: 'error',
          progress: 0,
          message: copy.analysisError,
          error: formatError(error, language),
          result: null,
        });
      }
    }
  }, [language]);

  const selectFile = useCallback(async (nextFile: File, options: DetectionOptions = {}) => {
    setFile(nextFile);
    if (sourceRef.current) {
      URL.revokeObjectURL(sourceRef.current);
    }
    const nextSource = URL.createObjectURL(nextFile);
    sourceRef.current = nextSource;
    setSource(nextSource);
    await runAnalysis(nextFile, options);
  }, [runAnalysis]);

  const reanalyze = useCallback(async (options: DetectionOptions = {}) => {
    if (file) {
      await runAnalysis(file, options);
    }
  }, [file, runAnalysis]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (sourceRef.current) URL.revokeObjectURL(sourceRef.current);
    };
  }, []);

  return { file, source, analysis, selectFile, reanalyze };
}
