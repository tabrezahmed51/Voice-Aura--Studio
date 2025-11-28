
import React, { useRef, useEffect } from 'react';

interface PitchVisualizerProps {
  originalPitch: number | null; // Hz
  correctedPitch: number | null; // Hz
  isActive: boolean;
}

const BG_COLOR = '#2b2d31'; // brand-secondary
const ORIGINAL_PITCH_COLOR = '#b8bac2'; // brand-subtext
const CORRECTED_PITCH_COLOR = '#5865f2'; // brand-accent
const MIN_HZ = 50;
const MAX_HZ = 1000;

const PitchVisualizer: React.FC<PitchVisualizerProps> = ({ originalPitch, correctedPitch, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pitchHistory = useRef<{original: number[], corrected: number[]}>({original: [], corrected: []}).current;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Make canvas size reactive to its parent container
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };

    resizeCanvas(); // Initial size
    window.addEventListener('resize', resizeCanvas); // Adjust on resize
    
    const mapPitchToY = (pitch: number) => {
        const logPitch = Math.log(pitch);
        const logMin = Math.log(MIN_HZ);
        const logMax = Math.log(MAX_HZ);
        const range = logMax - logMin;
        if (range === 0) return canvas.height / 2;
        // Invert Y-axis for canvas coordinates (0 is top)
        return canvas.height * (1 - (logPitch - logMin) / range);
    };

    const maxHistory = canvas.width / 2; // one point every 2 pixels
    if (isActive) {
        if (originalPitch !== null && correctedPitch !== null) {
            pitchHistory.original.push(originalPitch);
            pitchHistory.corrected.push(correctedPitch);
        }
        // Keep history from getting too long
        if (pitchHistory.original.length > maxHistory) {
            pitchHistory.original.shift();
            pitchHistory.corrected.shift();
        }
    } else if (pitchHistory.original.length > 0) {
        // Clear history gradually when inactive
        pitchHistory.original.shift();
        pitchHistory.corrected.shift();
    }


    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    // Clear canvas
    canvasCtx.fillStyle = BG_COLOR;
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    const drawLine = (history: number[], color: string, lineWidth: number) => {
        canvasCtx.lineWidth = lineWidth;
        canvasCtx.strokeStyle = color;
        canvasCtx.beginPath();
        
        let started = false;
        for (let i = 0; i < history.length; i++) {
            const x = canvas.width * (i / (maxHistory - 1));
            const y = mapPitchToY(history[i]);
            if (!isNaN(y)) {
                if (!started) {
                    canvasCtx.moveTo(x, y);
                    started = true;
                } else {
                    canvasCtx.lineTo(x, y);
                }
            }
        }
        canvasCtx.stroke();
    };

    // Draw lines
    drawLine(pitchHistory.original, ORIGINAL_PITCH_COLOR, 2);
    drawLine(pitchHistory.corrected, CORRECTED_PITCH_COLOR, 3);

    const animationFrameId = requestAnimationFrame(() => {}); // Keep animation loop running

    return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('resize', resizeCanvas); // Clean up event listener
    };

  }, [originalPitch, correctedPitch, isActive, pitchHistory]);

  return (
    <div className="w-full h-32 bg-brand-secondary rounded-lg">
      <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  );
};

export default PitchVisualizer;