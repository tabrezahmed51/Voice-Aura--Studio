
import React, { useState, useRef, useEffect } from 'react';

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
);
const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);
const VolumeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);


const bufferToWave = (abuffer: AudioBuffer): Blob => {
    const numOfChan = abuffer.numberOfChannels;
    const length = abuffer.length * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    };
    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint32(numOfChan * 2 * 8 / 8);
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    const channels = Array.from({ length: abuffer.numberOfChannels }, (_, i) => abuffer.getChannelData(i));
    let offset = 0;
    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            // interleave channels
            const sample = Math.max(-1, Math.min(1, channels[i][offset]));
            const intSample = sample < 0 ? sample * 32768 : sample * 32767;
            view.setInt16(pos, intSample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([view], { type: 'audio/wav' });
};


interface AudioPlayerProps {
  audioBuffer: AudioBuffer | null;
  title: string;
  showDownloadButton?: boolean;
  onDelete?: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioBuffer, title, showDownloadButton = true, onDelete }) => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackTime, setPlaybackTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const audioElRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let url: string | null = null;
        if (audioBuffer) {
            try {
                const wavBlob = bufferToWave(audioBuffer);
                url = URL.createObjectURL(wavBlob);
                setAudioUrl(url);
            } catch (e) {
                console.error("Error creating WAV blob from audio buffer:", e);
                setAudioUrl(null);
            }
        } else {
            setAudioUrl(null);
            setIsPlaying(false);
            setPlaybackTime(0);
            setDuration(0);
        }

        return () => {
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [audioBuffer]);

    useEffect(() => {
        const audioElement = audioElRef.current;
        if (audioElement) {
            audioElement.volume = volume;
        }
    }, [volume]);
    
    const handlePlayPause = () => {
        if (audioElRef.current) {
            if (isPlaying) {
                audioElRef.current.pause();
            } else {
                audioElRef.current.play();
            }
        }
    }
    
    useEffect(() => {
        if(progressRef.current && duration > 0) {
            const progress = (playbackTime / duration) * 100;
            progressRef.current.style.background = `linear-gradient(to right, #5865f2 ${progress}%, #2b2d31 ${progress}%)`;
        } else if (progressRef.current) {
             progressRef.current.style.background = '#2b2d31';
        }
    }, [playbackTime, duration]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    const downloadFileName = `${title.toLowerCase().replace(/\s/g, '_')}.wav`;
    const isDisabled = !audioBuffer;

    return (
        <div className={`bg-brand-primary p-3 rounded-lg ${isDisabled ? 'opacity-50' : ''}`}>
            <h4 className="font-semibold text-sm sm:text-base text-brand-text mb-2">{title}</h4>
            <div className="w-full flex flex-wrap items-center gap-2">
                <button onClick={handlePlayPause} disabled={isDisabled} className="p-2 hover:bg-brand-secondary rounded-full disabled:cursor-not-allowed">
                    {isPlaying ? <PauseIcon/> : <PlayIcon/>}
                </button>
                <input 
                    ref={progressRef}
                    type="range" 
                    min="0" 
                    max={duration || 1}
                    value={playbackTime} 
                    onChange={(e) => { if(audioElRef.current) audioElRef.current.currentTime = parseFloat(e.target.value) }} 
                    disabled={isDisabled}
                    className="flex-grow h-1.5 rounded-lg appearance-none cursor-pointer accent-brand-accent disabled:cursor-not-allowed" 
                    style={{background: '#2b2d31'}}
                />
                <span className="text-xs sm:text-sm w-auto min-w-[70px] text-center text-brand-subtext">{formatTime(playbackTime)} / {formatTime(duration)}</span>
                <VolumeIcon />
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={volume} 
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    disabled={isDisabled} 
                    className="w-20 h-1.5 bg-brand-secondary rounded-lg appearance-none cursor-pointer accent-brand-accent disabled:cursor-not-allowed"
                />
                {showDownloadButton && (
                    <a href={isDisabled ? undefined : audioUrl!} download={downloadFileName} className={`p-2 hover:bg-brand-secondary rounded-full ${isDisabled ? 'pointer-events-none opacity-50' : ''}`} title="Download">
                        <DownloadIcon/>
                    </a>
                )}
                {onDelete && (
                     <button onClick={onDelete} disabled={isDisabled} className="p-2 text-brand-subtext hover:text-red-400 rounded-full disabled:cursor-not-allowed" title="Clear Audio">
                        <TrashIcon/>
                    </button>
                )}
                {audioUrl && <audio 
                    ref={audioElRef} 
                    src={audioUrl} 
                    onPlay={() => setIsPlaying(true)} 
                    onPause={() => setIsPlaying(false)} 
                    onTimeUpdate={(e) => setPlaybackTime(e.currentTarget.currentTime)} 
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} 
                    onEnded={() => {setIsPlaying(false); setPlaybackTime(0);}}
                ></audio>}
            </div>
        </div>
    );
};

export default AudioPlayer;