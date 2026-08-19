import type { AnalysisResult, BeatMarker, EnergySample } from '../types/audio';

const FFT_SIZE = 512;
const ANALYSIS_SAMPLE_RATE = 22050;
const HOP_SIZE = 256;
const LOCAL_WINDOW_SECONDS = 4;
const LOCAL_STATS_STEP_SECONDS = 1;
const PULSE_WINDOW_SECONDS = 8;
const PULSE_STEP_SECONDS = 4;
const DEFAULT_MIN_GAP = 0.22;

export interface BeatDetectionOptions {
  sensitivity?: number;
  minGap?: number;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

interface BrowserWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

interface SignalSeries {
  novelty: number[];
  rms: number[];
  times: number[];
}

interface AdaptiveProfile {
  baseline: number[];
  spread: number[];
  threshold: number[];
  normalized: number[];
}

interface PulseProfile {
  lagFrames: number[];
  confidence: number[];
}

interface PeakCandidate {
  index: number;
  score: number;
  strength: number;
  gap: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function checkCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Audio analysis was cancelled.', 'AbortError');
  }
}

function createAudioContext(): AudioContext {
  const audioWindow = window as BrowserWindow;
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('This browser does not support the Web Audio API.');
  }

  return new AudioContextConstructor();
}

function percentile(sortedValues: number[], quantile: number): number {
  if (sortedValues.length === 0) return 0;
  const position = clamp(quantile, 0, 1) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sortedValues[lowerIndex] ?? 0;
  const upper = sortedValues[upperIndex] ?? lower;
  return lower + (upper - lower) * (position - lowerIndex);
}

function lowerBound(values: number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((values[middle] ?? 0) < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function inferFrameDuration(times: number[]): number {
  if (times.length < 2) return HOP_SIZE / ANALYSIS_SAMPLE_RATE;
  const sampleCount = Math.min(32, times.length - 1);
  let total = 0;
  let valid = 0;
  for (let index = 1; index <= sampleCount; index += 1) {
    const difference = (times[index] ?? 0) - (times[index - 1] ?? 0);
    if (difference > 0) {
      total += difference;
      valid += 1;
    }
  }
  return valid > 0 ? total / valid : HOP_SIZE / ANALYSIS_SAMPLE_RATE;
}

function buildAdaptiveProfile(
  values: number[],
  times: number[],
  sensitivity: number,
): AdaptiveProfile {
  if (values.length === 0) {
    return { baseline: [], spread: [], threshold: [], normalized: [] };
  }

  const frameDuration = inferFrameDuration(times);
  const duration = (times.at(-1) ?? 0) + frameDuration;
  const blockCount = Math.max(1, Math.ceil(duration / LOCAL_STATS_STEP_SECONDS));
  const blockBaselines = new Array<number>(blockCount).fill(0);
  const blockSpreads = new Array<number>(blockCount).fill(1);
  const blockThresholds = new Array<number>(blockCount).fill(0);
  const halfWindow = LOCAL_WINDOW_SECONDS / 2;
  const thresholdZ = clamp(2.45 - sensitivity * 0.5, 0.8, 2.45);
  const rangeFactor = clamp(0.65 - sensitivity * 0.17, 0.12, 0.64);

  for (let block = 0; block < blockCount; block += 1) {
    const center = (block + 0.5) * LOCAL_STATS_STEP_SECONDS;
    const startIndex = lowerBound(times, Math.max(0, center - halfWindow));
    const endIndex = lowerBound(times, Math.min(duration, center + halfWindow));
    const localValues = values
      .slice(startIndex, Math.max(startIndex + 1, endIndex))
      .sort((left, right) => left - right);
    const median = percentile(localValues, 0.5);
    const lowerDeviations = localValues
      .filter((value) => value <= median)
      .map((value) => median - value)
      .sort((left, right) => left - right);
    const lowerMad = percentile(lowerDeviations, 0.5) * 1.4826;
    const lowerQuartileSpread = Math.max(0, median - percentile(localValues, 0.25)) / 0.6745;
    const upperRange = Math.max(0, percentile(localValues, 0.98) - median);
    const localSpread = Math.max(lowerMad, lowerQuartileSpread, upperRange * 0.12, 1e-9);
    const noiseThreshold = median + Math.max(lowerMad, lowerQuartileSpread) * thresholdZ;
    const rangeThreshold = median + upperRange * rangeFactor;

    blockBaselines[block] = median;
    blockSpreads[block] = localSpread;
    blockThresholds[block] = Math.max(noiseThreshold, rangeThreshold);
  }

  const baseline = new Array<number>(values.length).fill(0);
  const spread = new Array<number>(values.length).fill(1);
  const threshold = new Array<number>(values.length).fill(0);
  const normalized = new Array<number>(values.length).fill(0);
  for (let index = 0; index < values.length; index += 1) {
    const blockPosition = clamp(
      (times[index] ?? 0) / LOCAL_STATS_STEP_SECONDS - 0.5,
      0,
      blockCount - 1,
    );
    const lowerBlock = Math.floor(blockPosition);
    const upperBlock = clamp(lowerBlock + 1, 0, blockCount - 1);
    const mix = blockPosition - lowerBlock;
    const localBaseline = (blockBaselines[lowerBlock] ?? 0) * (1 - mix)
      + (blockBaselines[upperBlock] ?? 0) * mix;
    const localSpread = (blockSpreads[lowerBlock] ?? 1) * (1 - mix)
      + (blockSpreads[upperBlock] ?? 1) * mix;
    const localThreshold = (blockThresholds[lowerBlock] ?? 0) * (1 - mix)
      + (blockThresholds[upperBlock] ?? 0) * mix;
    const value = values[index] ?? 0;

    baseline[index] = localBaseline;
    spread[index] = localSpread;
    threshold[index] = localThreshold;
    normalized[index] = Math.max(0, (value - localBaseline) / localSpread);
  }

  return { baseline, spread, threshold, normalized };
}

function buildPulseProfile(normalized: number[], times: number[]): PulseProfile {
  const frameDuration = inferFrameDuration(times);
  const minLag = Math.max(2, Math.round(0.28 / frameDuration));
  const maxLag = Math.max(minLag, Math.round(1 / frameDuration));
  const framesPerWindow = Math.max(maxLag * 2 + 1, Math.round(PULSE_WINDOW_SECONDS / frameDuration));
  const framesPerStep = Math.max(1, Math.round(PULSE_STEP_SECONDS / frameDuration));
  const blockCount = Math.max(1, Math.ceil(normalized.length / framesPerStep));
  const blockLags = new Array<number>(blockCount).fill(0);
  const blockConfidence = new Array<number>(blockCount).fill(0);

  for (let block = 0; block < blockCount; block += 1) {
    const center = block * framesPerStep + Math.floor(framesPerStep / 2);
    const start = Math.max(0, center - Math.floor(framesPerWindow / 2));
    const end = Math.min(normalized.length, start + framesPerWindow);
    let bestLag = 0;
    let bestScore = 0;
    const scores: number[] = [];

    for (let lag = minLag; lag <= maxLag && start + lag < end; lag += 1) {
      let overlap = 0;
      let leftEnergy = 0;
      let rightEnergy = 0;
      for (let index = start + lag; index < end; index += 1) {
        const left = clamp((normalized[index - lag] ?? 0) - 0.35, 0, 4);
        const right = clamp((normalized[index] ?? 0) - 0.35, 0, 4);
        overlap += Math.min(left, right);
        leftEnergy += left;
        rightEnergy += right;
      }
      const score = overlap / Math.max(1e-9, Math.sqrt(leftEnergy * rightEnergy));
      scores.push(score);
      if (score > bestScore) {
        bestScore = score;
        bestLag = lag;
      }
    }

    const sortedScores = [...scores].sort((left, right) => left - right);
    const typicalScore = percentile(sortedScores, 0.55);
    const distinctiveness = (bestScore - typicalScore) / Math.max(bestScore, 1e-9);
    blockLags[block] = bestLag;
    blockConfidence[block] = clamp((bestScore - 0.18) * 1.45, 0, 1)
      * clamp(distinctiveness * 2.4, 0, 1);
  }

  const lagFrames = new Array<number>(normalized.length).fill(0);
  const confidence = new Array<number>(normalized.length).fill(0);
  for (let index = 0; index < normalized.length; index += 1) {
    const blockPosition = clamp(index / framesPerStep - 0.5, 0, blockCount - 1);
    const lowerBlock = Math.floor(blockPosition);
    const upperBlock = clamp(lowerBlock + 1, 0, blockCount - 1);
    const mix = blockPosition - lowerBlock;
    lagFrames[index] = Math.round(
      (blockLags[lowerBlock] ?? 0) * (1 - mix) + (blockLags[upperBlock] ?? 0) * mix,
    );
    confidence[index] = (blockConfidence[lowerBlock] ?? 0) * (1 - mix)
      + (blockConfidence[upperBlock] ?? 0) * mix;
  }

  return { lagFrames, confidence };
}

function nearbyMaximum(values: number[], center: number, radius: number): number {
  let maximum = 0;
  const start = Math.max(0, center - radius);
  const end = Math.min(values.length - 1, center + radius);
  for (let index = start; index <= end; index += 1) {
    maximum = Math.max(maximum, values[index] ?? 0);
  }
  return maximum;
}

function findAdaptivePeaks(
  values: number[],
  times: number[],
  sensitivity: number,
  minGap: number,
  activity?: number[],
): { beats: BeatMarker[]; profile: AdaptiveProfile } {
  const profile = buildAdaptiveProfile(values, times, sensitivity);
  if (values.length < 3) return { beats: [], profile };

  const pulse = buildPulseProfile(profile.normalized, times);
  const frameDuration = inferFrameDuration(times);
  const peakRadius = Math.max(1, Math.round(0.045 / frameDuration));
  const supportRadius = Math.max(1, Math.round(0.045 / frameDuration));
  const sensitivityGap = minGap * clamp(1.1 - sensitivity * 0.1, 0.72, 1.1);
  const activityValues = activity ?? values;
  const sortedActivity = [...activityValues].sort((left, right) => left - right);
  const activityReference = percentile(sortedActivity, 0.95);
  const silenceFloor = Math.max(1e-8, activityReference * 0.0008);
  const candidates: PeakCandidate[] = [];

  for (let index = peakRadius; index < values.length - peakRadius; index += 1) {
    const value = values[index] ?? 0;
    const localMaximum = nearbyMaximum(values, index, peakRadius);
    if (value < localMaximum || (activityValues[index] ?? 0) <= silenceFloor) continue;

    const normalized = profile.normalized[index] ?? 0;
    const lag = pulse.lagFrames[index] ?? 0;
    const confidence = pulse.confidence[index] ?? 0;
    const previousPulse = lag > 0
      ? nearbyMaximum(profile.normalized, index - lag, supportRadius)
      : 0;
    const nextPulse = lag > 0
      ? nearbyMaximum(profile.normalized, index + lag, supportRadius)
      : 0;
    const pulseSupport = clamp(Math.max(previousPulse, nextPulse) / 4, 0, 1) * confidence;
    const localThresholdZ = Math.max(
      0.25,
      ((profile.threshold[index] ?? 0) - (profile.baseline[index] ?? 0))
        / Math.max(profile.spread[index] ?? 0, 1e-9),
    );
    const clearsAdaptiveThreshold = value > (profile.threshold[index] ?? Number.POSITIVE_INFINITY);
    const rhythmRescue = confidence > 0.16
      && pulseSupport > 0.12
      && normalized > localThresholdZ * 0.72;

    if (!clearsAdaptiveThreshold && !rhythmRescue) continue;

    const detailScore = clamp((normalized - localThresholdZ * 0.65) / 3, 0, 1);
    const score = detailScore * 0.82 + pulseSupport * 0.18;
    const localPeriod = lag * frameDuration;
    const adaptiveGap = confidence > 0.2 && localPeriod > 0
      ? clamp(
        Math.min(sensitivityGap, localPeriod * 0.42),
        Math.min(0.09, sensitivityGap),
        sensitivityGap,
      )
      : sensitivityGap;

    candidates.push({
      index,
      score,
      strength: clamp(0.3 + detailScore * 0.5 + pulseSupport * 0.2, 0.3, 1),
      gap: adaptiveGap,
    });
  }

  const selected: PeakCandidate[] = [];
  for (const candidate of candidates) {
    const previous = selected.at(-1);
    if (!previous) {
      selected.push(candidate);
      continue;
    }

    const distance = (times[candidate.index] ?? 0) - (times[previous.index] ?? 0);
    const requiredGap = Math.min(candidate.gap, previous.gap);
    if (distance >= requiredGap) {
      selected.push(candidate);
    } else if (candidate.score > previous.score * 1.22) {
      selected[selected.length - 1] = candidate;
    }
  }

  return {
    beats: selected.map((candidate, id) => ({
      id,
      time: times[candidate.index] ?? 0,
      strength: candidate.strength,
    })),
    profile,
  };
}

export function detectPeaks(
  values: number[],
  times: number[],
  sensitivity: number,
  minGap: number,
): BeatMarker[] {
  return findAdaptivePeaks(values, times, sensitivity, minGap).beats;
}

function buildBitReversal(size: number): Uint16Array {
  const bits = Math.round(Math.log2(size));
  const result = new Uint16Array(size);
  for (let index = 0; index < size; index += 1) {
    let source = index;
    let reversed = 0;
    for (let bit = 0; bit < bits; bit += 1) {
      reversed = (reversed << 1) | (source & 1);
      source >>= 1;
    }
    result[index] = reversed;
  }
  return result;
}

const FFT_BIT_REVERSAL = buildBitReversal(FFT_SIZE);
const FFT_COSINE = Float64Array.from(
  { length: FFT_SIZE / 2 },
  (_, index) => Math.cos((2 * Math.PI * index) / FFT_SIZE),
);
const FFT_SINE = Float64Array.from(
  { length: FFT_SIZE / 2 },
  (_, index) => -Math.sin((2 * Math.PI * index) / FFT_SIZE),
);
const HANN_WINDOW = Float64Array.from(
  { length: FFT_SIZE },
  (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (FFT_SIZE - 1)),
);

function transformFrame(
  input: Float64Array,
  real: Float64Array,
  imaginary: Float64Array,
  spectrum: Float64Array,
): void {
  for (let index = 0; index < FFT_SIZE; index += 1) {
    const reversed = FFT_BIT_REVERSAL[index] ?? 0;
    real[reversed] = (input[index] ?? 0) * (HANN_WINDOW[index] ?? 0);
    imaginary[reversed] = 0;
  }

  for (let size = 2; size <= FFT_SIZE; size *= 2) {
    const half = size / 2;
    const tableStep = FFT_SIZE / size;
    for (let start = 0; start < FFT_SIZE; start += size) {
      for (let offset = 0; offset < half; offset += 1) {
        const tableIndex = offset * tableStep;
        const cosine = FFT_COSINE[tableIndex] ?? 1;
        const sine = FFT_SINE[tableIndex] ?? 0;
        const evenIndex = start + offset;
        const oddIndex = evenIndex + half;
        const oddReal = real[oddIndex] ?? 0;
        const oddImaginary = imaginary[oddIndex] ?? 0;
        const rotatedReal = oddReal * cosine - oddImaginary * sine;
        const rotatedImaginary = oddReal * sine + oddImaginary * cosine;
        const evenReal = real[evenIndex] ?? 0;
        const evenImaginary = imaginary[evenIndex] ?? 0;
        real[evenIndex] = evenReal + rotatedReal;
        imaginary[evenIndex] = evenImaginary + rotatedImaginary;
        real[oddIndex] = evenReal - rotatedReal;
        imaginary[oddIndex] = evenImaginary - rotatedImaginary;
      }
    }
  }

  for (let bin = 0; bin < spectrum.length; bin += 1) {
    const binReal = real[bin] ?? 0;
    const binImaginary = imaginary[bin] ?? 0;
    const magnitude = Math.sqrt(binReal * binReal + binImaginary * binImaginary);
    spectrum[bin] = Math.log1p((magnitude * 160) / FFT_SIZE);
  }
}

function spectralFlux(current: Float64Array, previous: Float64Array): number {
  let low = 0;
  let lowCount = 0;
  let middle = 0;
  let middleCount = 0;
  let high = 0;
  let highCount = 0;

  for (let bin = 1; bin < current.length; bin += 1) {
    const frequency = (bin * ANALYSIS_SAMPLE_RATE) / FFT_SIZE;
    if (frequency < 55 || frequency > 8000) continue;
    const previousMaximum = Math.max(
      previous[Math.max(0, bin - 1)] ?? 0,
      previous[bin] ?? 0,
      previous[Math.min(previous.length - 1, bin + 1)] ?? 0,
    );
    const difference = Math.max(0, (current[bin] ?? 0) - previousMaximum);

    if (frequency < 250) {
      low += difference;
      lowCount += 1;
    } else if (frequency < 2000) {
      middle += difference;
      middleCount += 1;
    } else {
      high += difference;
      highCount += 1;
    }
  }

  const lowAverage = low / Math.max(1, lowCount);
  const middleAverage = middle / Math.max(1, middleCount);
  const highAverage = high / Math.max(1, highCount);
  return lowAverage * 0.34 + middleAverage * 0.46 + highAverage * 0.2;
}

async function yieldToBrowser(): Promise<void> {
  if (typeof window === 'undefined') return;
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

async function buildSignalSeries(
  channels: Float32Array[],
  sourceSampleRate: number,
  options: BeatDetectionOptions,
): Promise<SignalSeries> {
  const sourceLength = channels[0]?.length ?? 0;
  const duration = sourceLength / sourceSampleRate;
  const analysisLength = Math.max(1, Math.ceil(duration * ANALYSIS_SAMPLE_RATE));
  const frameCount = Math.max(1, Math.ceil((analysisLength - FFT_SIZE) / HOP_SIZE) + 1);
  const ratio = sourceSampleRate / ANALYSIS_SAMPLE_RATE;
  const input = new Float64Array(FFT_SIZE);
  const real = new Float64Array(FFT_SIZE);
  const imaginary = new Float64Array(FFT_SIZE);
  let previousSpectrum = new Float64Array(FFT_SIZE / 2);
  let currentSpectrum = new Float64Array(FFT_SIZE / 2);
  const rawNovelty = new Array<number>(frameCount).fill(0);
  const rms = new Array<number>(frameCount).fill(0);
  const times = new Array<number>(frameCount).fill(0);
  let previousLogRms = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    checkCancelled(options.signal);
    const analysisStart = frame * HOP_SIZE;
    let mean = 0;
    let squareSum = 0;

    for (let offset = 0; offset < FFT_SIZE; offset += 1) {
      const sourcePosition = (analysisStart + offset) * ratio;
      const sourceIndex = Math.floor(sourcePosition);
      const fraction = sourcePosition - sourceIndex;
      let sample = 0;
      for (const channel of channels) {
        const first = channel[sourceIndex] ?? 0;
        const second = channel[sourceIndex + 1] ?? first;
        sample += first + (second - first) * fraction;
      }
      sample /= Math.max(1, channels.length);
      input[offset] = sample;
      mean += sample;
      squareSum += sample * sample;
    }

    mean /= FFT_SIZE;
    for (let offset = 0; offset < FFT_SIZE; offset += 1) {
      input[offset] = (input[offset] ?? 0) - mean;
    }

    const frameRms = Math.sqrt(squareSum / FFT_SIZE);
    const logRms = Math.log1p(frameRms * 80);
    transformFrame(input, real, imaginary, currentSpectrum);
    const frequencyChange = frame === 0 ? 0 : spectralFlux(currentSpectrum, previousSpectrum);
    const energyChange = Math.max(0, logRms - previousLogRms);
    rawNovelty[frame] = frequencyChange * 0.78 + energyChange * 0.22;
    rms[frame] = frameRms;
    times[frame] = Math.min(duration, (analysisStart + FFT_SIZE / 2) / ANALYSIS_SAMPLE_RATE);
    previousLogRms = logRms;
    [previousSpectrum, currentSpectrum] = [currentSpectrum, previousSpectrum];

    if (frame % 256 === 0) {
      options.onProgress?.(0.28 + (frame / frameCount) * 0.54);
    }
    if (frame > 0 && frame % 1024 === 0) {
      await yieldToBrowser();
    }
  }

  const novelty = rawNovelty.map((value, index) => (
    (rawNovelty[index - 1] ?? value) * 0.2
    + value * 0.6
    + (rawNovelty[index + 1] ?? value) * 0.2
  ));

  return { novelty, rms, times };
}

function createEnvelope(
  values: number[],
  times: number[],
  thresholdValues: number[],
): EnergySample[] {
  const maxSamples = 900;
  const step = Math.max(1, Math.ceil(values.length / maxSamples));
  const peak = values.reduce((maximum, value) => Math.max(maximum, value), 1e-9);
  const thresholdPeak = thresholdValues.reduce((maximum, value) => Math.max(maximum, value), 1e-9);
  const result: EnergySample[] = [];

  for (let index = 0; index < values.length; index += step) {
    result.push({
      time: times[index] ?? 0,
      value: clamp((values[index] ?? 0) / peak, 0, 1),
      threshold: clamp((thresholdValues[index] ?? 0) / thresholdPeak, 0, 1),
    });
  }

  return result;
}

export async function analyzePcmChannels(
  channels: Float32Array[],
  sampleRate: number,
  options: BeatDetectionOptions = {},
): Promise<AnalysisResult> {
  if (channels.length === 0 || (channels[0]?.length ?? 0) === 0 || sampleRate <= 0) {
    return { duration: 0, beats: [], envelope: [] };
  }

  const series = await buildSignalSeries(channels, sampleRate, options);
  options.onProgress?.(0.84);
  checkCancelled(options.signal);
  const detection = findAdaptivePeaks(
    series.novelty,
    series.times,
    options.sensitivity ?? 1,
    options.minGap ?? DEFAULT_MIN_GAP,
    series.rms,
  );
  options.onProgress?.(0.94);

  return {
    duration: (channels[0]?.length ?? 0) / sampleRate,
    beats: detection.beats,
    envelope: createEnvelope(series.rms, series.times, detection.profile.threshold),
  };
}

export async function analyzeAudioFile(
  file: File,
  options: BeatDetectionOptions = {},
): Promise<AnalysisResult> {
  const context = createAudioContext();
  options.onProgress?.(0.05);

  try {
    checkCancelled(options.signal);
    const encoded = await file.arrayBuffer();
    options.onProgress?.(0.16);
    checkCancelled(options.signal);

    const buffer = await context.decodeAudioData(encoded);
    options.onProgress?.(0.26);
    checkCancelled(options.signal);
    const channels = Array.from(
      { length: buffer.numberOfChannels },
      (_, channel) => buffer.getChannelData(channel),
    );
    return await analyzePcmChannels(channels, buffer.sampleRate, options);
  } finally {
    await context.close();
  }
}
