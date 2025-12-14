export class AudioAnalyzer {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private source: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array;
  private bufferLength: number;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048; // Higher resolution for better bass isolation
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
  }

  private connectedElement: HTMLAudioElement | null = null;

  connect(audioElement: HTMLAudioElement) {
    if (this.connectedElement === audioElement) {
      console.log("Analyzer: Already connected to this element.");
      return; 
    }

    if (this.source) {
      this.source.disconnect();
    }
    
    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => console.log("Analyzer: Context resumed"));
    }

    try {
        console.log("Analyzer: Creating MediaElementSource...");
        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        this.connectedElement = audioElement;
        console.log("Analyzer: Connected successfully");
    } catch (e) {
        console.warn("AudioAnalyzer: Failed to create source (might be already connected)", e);
    }
  }

  getAverageEnergy(minHz: number, maxHz: number): number {
    this.analyser.getByteFrequencyData(this.dataArray as any);
    
    const sampleRate = this.audioContext.sampleRate;
    const binCount = this.bufferLength;
    const binWidth = sampleRate / this.analyser.fftSize; // sampleRate / 2048
    
    let startBin = Math.floor(minHz / binWidth);
    let endBin = Math.ceil(maxHz / binWidth);
    
    // Clamp
    if (startBin < 0) startBin = 0;
    if (endBin > binCount) endBin = binCount;
    if (startBin >= endBin) return 0;
    
    let sum = 0;
    const count = endBin - startBin;
    
    for (let i = startBin; i < endBin; i++) {
        sum += this.dataArray[i];
    }
    return sum / count;
  }
  
  // Keep for backward compat or just use the new one
  getBassEnergy(): number {
      return this.getAverageEnergy(20, 150);
  }
  
  resume() {
      if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
      }
  }
}
