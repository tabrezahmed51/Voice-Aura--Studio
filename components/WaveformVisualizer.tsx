
import React, { useRef, useEffect } from 'react';

interface WaveformVisualizerProps {
  analyserNode?: AnalyserNode;
  audioBuffer?: AudioBuffer;
  isRecording: boolean;
}

const WAVE_COLOR = '#5865f2'; // brand-accent
const BG_COLOR = '#2b2d31'; // brand-secondary

const drawRealtimeWaveform = (
  canvas: HTMLCanvasElement,
  analyserNode: AnalyserNode
) => {
  const canvasCtx = canvas.getContext('2d');
  if (!canvasCtx) return;

  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  let animationFrameId: number;

  const draw = () => {
    animationFrameId = requestAnimationFrame(draw);
    analyserNode.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = BG_COLOR;
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = WAVE_COLOR;
    canvasCtx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  };

  draw();
  return () => cancelAnimationFrame(animationFrameId);
};

const drawStaticWaveform = (
  canvas: HTMLCanvasElement,
  audioBuffer: AudioBuffer
) => {
  const canvasCtx = canvas.getContext('2d');
  if (!canvasCtx) return;

  const data = audioBuffer.getChannelData(0);
  const step = Math.ceil(data.length / canvas.width);
  const amp = canvas.height / 2;

  canvasCtx.fillStyle = BG_COLOR;
  canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  canvasCtx.lineWidth = 1;
  canvasCtx.strokeStyle = WAVE_COLOR;
  canvasCtx.beginPath();

  for (let i = 0; i < canvas.width; i++) {
    let min = 1.0;
    let max = -1.0;

    for (let j = 0; j < step; j++) {
      const datum = data[i * step + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    canvasCtx.moveTo(i, (1 + min) * amp);
    canvasCtx.lineTo(i, (1 + max) * amp);
  }
  canvasCtx.stroke();
};

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  analyserNode,
  audioBuffer,
  isRecording,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    let cancelAnimation: (() => void) | undefined;

    if (isRecording && analyserNode) {
      cancelAnimation = drawRealtimeWaveform(canvas, analyserNode);
    } else if (!isRecording && audioBuffer) {
      drawStaticWaveform(canvas, audioBuffer);
    } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = BG_COLOR;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = WAVE_COLOR;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        }
    }

    return () => {
      if (cancelAnimation) {
        cancelAnimation();
      }
      window.removeEventListener('resize', resizeCanvas); // Clean up event listener
    };
  }, [analyserNode, audioBuffer, isRecording]);

  return (
    <div className="w-full h-24 bg-brand-secondary rounded-lg">
        <canvas ref={canvasRef} className="w-full h-full"></canvas>
    </div>
  );
};

export default WaveformVisualizer;