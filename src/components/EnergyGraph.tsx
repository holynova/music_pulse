import { useEffect, useRef } from 'react';

interface EnergyGraphProps {
  energy: number;
  threshold: number;
  width?: number;
  height?: number;
}

export function EnergyGraph({ energy, threshold, width = 200, height = 50 }: EnergyGraphProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const historyRef = useRef<number[]>([]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Add current energy
        historyRef.current.push(energy);
        if (historyRef.current.length > width) {
            historyRef.current.shift();
        }
        
        // Render
        ctx.clearRect(0, 0, width, height);
        
        // Draw Threshold Line
        ctx.beginPath();
        const thY = height - (threshold / 255) * height;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, thY);
        ctx.lineTo(width, thY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw Energy Line
        ctx.beginPath();
        ctx.strokeStyle = '#f43f5e'; // Rose-500
        ctx.lineWidth = 1.5;
        
        for (let i = 0; i < historyRef.current.length; i++) {
            const val = historyRef.current[i];
            const x = i;
            const y = height - (val / 255) * height;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        
        // Beat Indicator (if above threshold)
        if (energy > threshold) {
             ctx.fillStyle = '#f43f5e';
             ctx.fillRect(width - 5, 0, 5, 5);
        }
        
    }, [energy, threshold, width, height]); // Potentially expensive if energy updates 60fps? Yes, but this is a debug component.
    // Ideally we drive this from loop too, but React effect binding is OK for simple debug.
    // Actually, force update might be better, but prop update is cleaner for now.

    return (
        <canvas 
            ref={canvasRef} 
            width={width} 
            height={height} 
            className="w-full h-12 bg-slate-900/50 rounded border border-slate-700 mt-2"
        />
    );
}
