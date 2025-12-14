import { useEffect, useRef, useState } from 'react';
import { AudioAnalyzer } from '../utils/audioAnalyzer';
import { type PulseSettings } from './SettingsPanel';
import { EnergyGraph } from './EnergyGraph';

interface CanvasStageProps {
  analyzer: AudioAnalyzer | null;
  isPlaying: boolean;
  settings: PulseSettings;
}

interface Point {
  x: number;
  y: number;
}

interface Vector {
  x: number;
  y: number;
}

export function CanvasStage({ analyzer, isPlaying, settings }: CanvasStageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Debug State for Graph
  const [currentEnergy, setCurrentEnergy] = useState(0);
  
  // Simulation State
  const headRef = useRef<Point>({ x: 0, y: 0 });
  const velocityRef = useRef<Vector>({ x: settings.speed, y: 0 }); // Initial speed
  const pointsRef = useRef<Point[]>([]);
  const lastBeatTimeRef = useRef<number>(0);
  const avgEnergyRef = useRef<number>(0); // Running average
  const lastTurnDirRef = useRef<number>(1);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // ... (rest of code)


    // Handle Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (!isPlaying || !analyzer) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const animate = (_time: number) => {
      // 1. Analyze Audio
      let energy = 0;
      if (settings.frequencyMode === 'vocal') {
          // Human voice vocal range focus (fundamental 100-300Hz, harmonics 300-3000Hz)
          // For visualization presence, 300-2000Hz works well
          energy = analyzer.getAverageEnergy(300, 2000);
      } else {
          // Bass focus
          energy = analyzer.getAverageEnergy(20, 150);
      }
      
      // Update Running Average
      // Simple Low Pass Filter: avg = avg * 0.95 + curr * 0.05
      // If avg is 0 (start), verify instant
      if (avgEnergyRef.current === 0) avgEnergyRef.current = energy;
      else avgEnergyRef.current = avgEnergyRef.current * 0.96 + energy * 0.04;
      
      // Calculate Dynamic Threshold
      const dynamicThreshold = avgEnergyRef.current * settings.sensitivity;
      
      // Update Debug State
      if (settings.showDebug) {
          // Pass current energy and the calculated dynamic threshold
          setCurrentEnergy(energy);
          // We need to pass the dynamic threshold value to graph, checking props...
          // EnergyGraph takes 'threshold'. We will pass the calculated one.
      }
      
      const now = performance.now();
      
      // 2. Detect Beat
      // Beat if: 
      // A) Energy > Average * Sensitivity
      // B) Energy > Min Floor (e.g. 50/255) to avoid noise
      // C) Time Gap met
      const minLevel = 40;
      const isBeat = energy > dynamicThreshold && energy > minLevel && (now - lastBeatTimeRef.current > settings.minGap); 
      
      if (isBeat) {
        lastBeatTimeRef.current = now;
        
        // Boost Average on beat to prevent double trigger? 
        // avgEnergyRef.current = energy; // Optional Strategy
        
        // Calculate Beat Strength (0.0 to 1.0)
        // Excess energy above threshold
        const excess = Math.max(0, energy - dynamicThreshold);
        // Normalize roughly (assuming max excess is around 50-100 usually, but can be up to 255)
        const intensity = Math.min(1.0, excess / 50); 
        
        // Random Turn: Angle depends on Intensity
        // High intensity -> Sharper turns (closer to 90 or more)
        // Low intensity -> Slight adjust
        
        // Direction Logic
        let dir;
        if (settings.alternatingTurns) {
            dir = -lastTurnDirRef.current;
        } else {
            dir = Math.random() > 0.5 ? 1 : -1;
        }
        lastTurnDirRef.current = dir;
        
        let turnAngle;
        if (settings.alternatingTurns) {
            // Fixed 90 degrees for alternating mode
            turnAngle = Math.PI / 2;
        } else {
            // Base turn + Intensity boost
            const minTurn = Math.PI / 6;
            const maxTurn = Math.PI * 0.75;
            
            // Randomness factor 
            const randomFactor = 0.5 + Math.random() * 0.5; 
            
            turnAngle = minTurn + (maxTurn - minTurn) * intensity * randomFactor;
        }
        
        const currentAngle = Math.atan2(velocityRef.current.y, velocityRef.current.x);
        const newAngle = currentAngle + (dir * turnAngle);
        
        velocityRef.current = {
            x: Math.cos(newAngle) * settings.speed,
            y: Math.sin(newAngle) * settings.speed
        };
      } else {
        // Update speed in case setting changed but direction hasn't
        // Normalize current velocity and multiply by new speed
        const currentAngle = Math.atan2(velocityRef.current.y, velocityRef.current.x);
         velocityRef.current = {
            x: Math.cos(currentAngle) * settings.speed,
            y: Math.sin(currentAngle) * settings.speed
        };
      }
      
      // 3. Update Position
      const head = headRef.current;
      head.x += velocityRef.current.x;
      head.y += velocityRef.current.y;
      
      pointsRef.current.push({ ...head });
      
      // Fading Trail Logic: Limit history
      // e.g. Keep last 200 points (approx 3-4 seconds at 60fps)
      // Increasing this makes the tail longer
      const MAX_POINTS = 300; 
      if (pointsRef.current.length > MAX_POINTS) {
          pointsRef.current.shift();
      }
      
      // 4. Render
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0f172a'; // Background
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.save();
          // Camera follow
          const camX = -head.x + canvas.width / 2;
          const camY = -head.y + canvas.height / 2;
          ctx.translate(camX, camY);
          
          // Draw Line segments with fading opacity
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          if (pointsRef.current.length > 1) {
              // Batch drawing? Individual segments allows gradient alpha
              // We can do a simpler optimization: Draw 10 segments with different alphas instead of 300 strokes
              // But 300 strokes is actually fine for Canvas 2D on modern devices.
              
              for (let i = 0; i < pointsRef.current.length - 1; i++) {
                  const p1 = pointsRef.current[i];
                  const p2 = pointsRef.current[i + 1];
                  
                  ctx.beginPath();
                  ctx.moveTo(p1.x, p1.y);
                  ctx.lineTo(p2.x, p2.y);
                  
                  // Alpha based on index (0 = oldest/transparent, length = newest/opaque)
                  const alpha = i / (pointsRef.current.length - 1);
                  // Ease the alpha for smoother fade? 
                  // alpha * alpha makes it fade faster at tail
                  ctx.strokeStyle = `rgba(96, 165, 250, ${alpha})`; 
                  ctx.stroke();
              }
          }
          
          // Draw Head Glow
          ctx.beginPath();
          ctx.fillStyle = '#fff';
          ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        }
      }

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, analyzer, settings]); // Re-bind if settings change

  // Calculate threshold for render outside loop to pass to EnergyGraph
  // Since we calculate it IN the loop, we might not have it here easily.
  // We can just rely on the EnergyGraph to render what we pass.
  // We can pass the average * sensitivity.
  // BUT the average is in a ref. 
  // Let's modify EnergyGraph to accept 'average' and 'sensitivity' instead of 'threshold' to compute itself?
  // Or just use a state for threshold visualization. 
  // Simplest: use a ref for debug threshold and update it in the loop but that won't trigger render.
  // The 'currentEnergy' state update triggers the render. So we can also update 'currentThreshold' state.
  
  return (
    <>
        <canvas 
          ref={canvasRef} 
          className="absolute top-0 left-0 w-full h-full block"
        />
        {settings.showDebug && (
            <div className="absolute top-20 right-4 z-40 pointer-events-none">
                <EnergyGraph 
                    energy={currentEnergy} 
                    threshold={avgEnergyRef.current * settings.sensitivity} 
                />
            </div>
        )}
    </>
  );
}
