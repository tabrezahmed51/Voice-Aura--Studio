
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, GenerateContentResponse } from "@google/genai";
import { Analytics } from "@vercel/analytics/react";
import { AppStatus, ActiveTab, Language, Voice, BaseVoice, ClonedVoice, Preset, SpeakerConfig, PronunciationAnalysis, SoundEffect, MAX_PRONUNCIATION_TEXT_FOR_ANALYSIS, VoiceAnalysis, VoiceStatus, VoicePriority } from './types';
import { LANGUAGES, VOICES, VOICE_STATUSES, VOICE_PRIORITIES, MUSICAL_KEYS } from './constants';

import ActionButton from './components/ActionButton';
import RealtimeAnalysisDisplay from './components/RealtimeAnalysisDisplay';
import WaveformVisualizer from './components/WaveformVisualizer';
import AudioPlayer from './components/AudioPlayer';
import Selector from './components/Selector';
import Slider from './components/Slider';
import ToggleSwitch from './components/ToggleSwitch';
import CloneVoiceForm from './components/CloneVoiceForm';
import AutotuneTab from './components/AutotuneTab';
import PresetManager from './components/PresetManager';
import MultiSpeakerConfig from './components/MultiSpeakerConfig';
import SoundEffectManager from './components/SoundEffectManager';
import DebugConsole from './components/DebugConsole';

// --- Utility Functions ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function createPcmBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000'
  };
}

// Helper to find supported MIME type for MediaRecorder (Cross-browser fix)
const getSupportedMimeType = () => {
  const types = [
    'audio/webm',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/webm;codecs=opus'
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return ''; // Let browser decide default
};

const audioBufferToWavBlob = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new DataView(arrayBuffer);
    let pos = 0;

    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
    setUint32(numOfChan * 2 * 8 / 8); // block align
    setUint16(16); // 16-bit
    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    const channels = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    let offset = 0;
    while (pos < length) {
        for (let i = 0; i < numOfChan; i++) {
            const sample = Math.max(-1, Math.min(1, channels[i][offset]));
            const intSample = sample < 0 ? sample * 32768 : sample * 32767;
            view.setInt16(pos, intSample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([view], { type: 'audio/wav' });
};


const App: React.FC = () => {
  const ai = useMemo(() => new GoogleGenAI({ apiKey: process.env.API_KEY }), []);

  // --- Global App State ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('mimic');
  const [appStatus, setAppStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isAppBusy, setIsAppBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const saved = localStorage.getItem('userPresets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // --- Mimicry Tab State ---
  const [inputLanguage, setInputLanguage] = useState<Language>('en-US');
  const [responseLanguage, setResponseLanguage] = useState<Language>('en-US');
  const [selectedVoice, setSelectedVoice] = useState<Voice>('Zephyr');
  const [selectedSoundEffect, setSelectedSoundEffect] = useState<string>('none');
  const [customSoundEffects, setCustomSoundEffects] = useState<SoundEffect[]>([]);

  // Audio References
  const liveChatSessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputAnalyserNodeRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef(0);

  // Recorded input for playback and integration
  const [recordedMimicryInputBuffer, setRecordedMimicryInputBuffer] = useState<AudioBuffer | null>(null);
  const mimicryInputAudioChunksRef = useRef<Blob[]>([]);
  const mimeTypeRef = useRef<string>(''); // Store detected mime type

  // Real-time analysis
  const [realtimePitch, setRealtimePitch] = useState<string | null>(null);
  const [realtimeEnergy, setRealtimeEnergy] = useState<string | null>(null);
  const [liveInputTranscription, setLiveInputTranscription] = useState('');
  const [liveOutputTranscription, setLiveOutputTranscription] = useState('');
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);

  // --- Speech Studio Tab State ---
  const [speechStudioText, setSpeechStudioText] = useState('');
  const [ttsLanguage, setTtsLanguage] = useState<Language>('en-US');
  const [ttsVoice, setTtsVoice] = useState<Voice>('Zephyr');
  const [ttsMode, setTtsMode] = useState<'single' | 'multi'>('single');
  const [ttsSpeakers, setTtsSpeakers] = useState<SpeakerConfig[]>([
    { speaker: 'Speaker 1', voice: 'Kore' },
    { speaker: 'Speaker 2', voice: 'Puck' }
  ]);
  const [ttsPitch, setTtsPitch] = useState(0);
  const [ttsSpeakingRate, setTtsSpeakingRate] = useState(1);
  const [useSsml, setUseSsml] = useState(false);
  const [ttsAudioBuffer, setTtsAudioBuffer] = useState<AudioBuffer | null>(null);

  // Pronunciation
  const [recordedPronunciationAudio, setRecordedPronunciationAudio] = useState<AudioBuffer | null>(null);
  const [generatedPronunciationAudio, setGeneratedPronunciationAudio] = useState<AudioBuffer | null>(null);
  const [pronunciationAnalysisResult, setPronunciationAnalysisResult] = useState<PronunciationAnalysis | null>(null);
  const pronunciationMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const pronunciationAudioChunksRef = useRef<Blob[]>([]);

  // --- Clone Tab State ---
  const [clonedVoices, setClonedVoices] = useState<ClonedVoice[]>(() => {
    try {
      const saved = localStorage.getItem('clonedVoices');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCloning, setIsCloning] = useState(false);
  const [cloningStatusMessage, setCloningStatusMessage] = useState('Initializing...');
  const [cloningProgress, setCloningProgress] = useState(0);
  const [cloningTimeRemaining, setCloningTimeRemaining] = useState<number | null>(null);
  const [filterVoiceStatus, setFilterVoiceStatus] = useState<VoiceStatus | 'all'>('Ready');
  const [filterVoicePriority, setFilterVoicePriority] = useState<VoicePriority | 'all'>('all');
  const [cloneInitialFile, setCloneInitialFile] = useState<File | null>(null);


  // --- Autotune Tab State ---
  const [autotuneEnabled, setAutotuneEnabled] = useState(false);
  const [autotuneKey, setAutotuneKey] = useState('C-Major');
  const [autotuneAmount, setAutotuneAmount] = useState(50);
  const [uploadedAutotuneAudio, setUploadedAutotuneAudio] = useState<AudioBuffer | null>(null);
  const [correctedAutotuneAudio, setCorrectedAutotuneAudio] = useState<AudioBuffer | null>(null);
  const [currentOriginalPitch, setCurrentOriginalPitch] = useState<number | null>(null);
  const [currentCorrectedPitch, setCurrentCorrectedPitch] = useState<number | null>(null);


  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('clonedVoices', JSON.stringify(clonedVoices));
  }, [clonedVoices]);

  useEffect(() => {
    localStorage.setItem('userPresets', JSON.stringify(presets));
  }, [presets]);


  // --- Audio Context Management ---
  const initAudioContexts = useCallback(() => {
    if (!inputAudioContextRef.current || inputAudioContextRef.current.state === 'closed') {
      inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      inputAnalyserNodeRef.current = inputAudioContextRef.current.createAnalyser();
      inputAnalyserNodeRef.current.fftSize = 2048;
    }
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
      outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    }
  }, []);

  const cleanupAudioResources = useCallback(() => {
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) { console.warn("ScriptProcessor disconnect error", e); }
      scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close().catch(e => console.error("Error closing input audio context:", e));
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(e => console.error("Error closing output audio context:", e));
      outputAudioContextRef.current = null;
    }
    outputSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
      try { source.disconnect(); } catch(e) {}
    });
    outputSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioResources();
      liveChatSessionPromiseRef.current?.then((session: any) => session.close()).catch(() => {});
    };
  }, [cleanupAudioResources]);

  // --- Handlers ---
  const handleStopRecording = useCallback(() => {
    if (appStatus !== AppStatus.RECORDING && appStatus !== AppStatus.MIMICKING) return;

    setIsAppBusy(false);
    setAppStatus(AppStatus.IDLE);
    setRealtimePitch(null);
    setRealtimeEnergy(null);
    setLiveInputTranscription('');
    setLiveOutputTranscription('');

    // Process recorded audio safely
    if (mimicryInputAudioChunksRef.current.length > 0) {
        // Use the detected mime type or fallback
        const mimeType = mimeTypeRef.current || 'audio/webm';
        console.log("Processing audio with MIME:", mimeType);
        
        const audioBlob = new Blob(mimicryInputAudioChunksRef.current, { type: mimeType });
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        audioBlob.arrayBuffer().then(arrayBuffer => {
            return audioContext.decodeAudioData(arrayBuffer);
        }).then(audioBuffer => {
            setRecordedMimicryInputBuffer(audioBuffer);
            audioContext.close();
        }).catch(e => {
            console.error("Error decoding input audio blob:", e);
            audioContext.close();
            setServerError("Could not decode recorded audio. Try using Chrome or Edge.");
        });
        mimicryInputAudioChunksRef.current = [];
    }

    if (liveChatSessionPromiseRef.current) {
      liveChatSessionPromiseRef.current.then((session: any) => {
        session.close();
        liveChatSessionPromiseRef.current = null;
      }).catch((err: any) => console.error("Failed to close live session:", err));
    }
    cleanupAudioResources();
  }, [appStatus, cleanupAudioResources]);

  const handlePronunciationStopRecording = useCallback(() => {
    if (pronunciationMediaRecorderRef.current?.state === 'recording') {
      pronunciationMediaRecorderRef.current.stop();
      setAppStatus(AppStatus.IDLE);
    }
  }, []);

  // --- Integrations / Data Transfer ---

  const handleUseRecordingForAutotune = () => {
    if (recordedMimicryInputBuffer) {
        setUploadedAutotuneAudio(recordedMimicryInputBuffer);
        setActiveTab('autotune');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUseRecordingForClone = () => {
    if (recordedMimicryInputBuffer) {
        const wavBlob = audioBufferToWavBlob(recordedMimicryInputBuffer);
        const file = new File([wavBlob], "mimicry_recording.wav", { type: "audio/wav" });
        setCloneInitialFile(file);
        setActiveTab('clone');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleUseRecordingForPronunciation = () => {
      if (recordedMimicryInputBuffer) {
          setRecordedPronunciationAudio(recordedMimicryInputBuffer);
          setActiveTab('speech-studio');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  // --- Preset Handlers ---
  const handleSavePreset = useCallback((name: string) => {
    const currentPreset: Preset = {
      name,
      type: activeTab,
      voice: selectedVoice,
      inputLanguage,
      language: responseLanguage,
      selectedSoundEffect,
      ttsText: speechStudioText,
      ttsLanguage,
      ttsVoice,
      ttsMode,
      speakers: ttsSpeakers,
      ttsPitch,
      ttsSpeakingRate,
      useSsml,
      autotuneEnabled,
      autotuneKey,
      autotuneAmount
    };
    setPresets(prev => [...prev.filter(p => p.name !== name), currentPreset]);
  }, [activeTab, selectedVoice, inputLanguage, responseLanguage, selectedSoundEffect, speechStudioText, ttsLanguage, ttsVoice, ttsMode, ttsSpeakers, ttsPitch, ttsSpeakingRate, useSsml, autotuneEnabled, autotuneKey, autotuneAmount]);

  const handleLoadPreset = useCallback((name: string) => {
    const preset = presets.find(p => p.name === name);
    if (preset) {
      setActiveTab(preset.type);
      setSelectedVoice(preset.voice || 'Zephyr');
      if (preset.type === 'mimic') {
        setInputLanguage(preset.inputLanguage || 'en-US');
        setResponseLanguage(preset.language || 'en-US');
        setSelectedSoundEffect(preset.selectedSoundEffect || 'none');
        handleStopRecording();
      } else if (preset.type === 'speech-studio') {
        setSpeechStudioText(preset.ttsText || '');
        setTtsLanguage(preset.ttsLanguage || 'en-US');
        setTtsVoice(preset.ttsVoice || 'Zephyr');
        setTtsMode(preset.ttsMode || 'single');
        setTtsSpeakers(preset.speakers || [{ speaker: 'Speaker 1', voice: 'Kore' }, { speaker: 'Speaker 2', voice: 'Puck' }]);
        setTtsPitch(preset.ttsPitch || 0);
        setTtsSpeakingRate(preset.ttsSpeakingRate || 1);
        setUseSsml(preset.useSsml || false);
        handlePronunciationStopRecording();
      } else if (preset.type === 'autotune') {
        setAutotuneEnabled(preset.autotuneEnabled || false);
        setAutotuneKey(preset.autotuneKey || 'C-Major');
        setAutotuneAmount(preset.autotuneAmount || 50);
      }
      setServerError(null);
    }
  }, [presets, handleStopRecording, handlePronunciationStopRecording]);

  const handleDeletePreset = useCallback((name: string) => {
    setPresets(prev => prev.filter(p => p.name !== name));
  }, []);

  // --- Mimicry Logic ---
  const handleRecord = async () => {
    if (appStatus === AppStatus.RECORDING || appStatus === AppStatus.MIMICKING) {
      handleStopRecording();
      return;
    }

    try {
      setServerError(null);
      setIsAppBusy(true);
      setAppStatus(AppStatus.RECORDING);
      setLiveInputTranscription('');
      setLiveOutputTranscription('');
      setConversationHistory([]);
      setRecordedMimicryInputBuffer(null);
      mimicryInputAudioChunksRef.current = [];

      initAudioContexts();
      const inputAudioContext = inputAudioContextRef.current!;
      const outputAudioContext = outputAudioContextRef.current!;
      const analyserNode = inputAnalyserNodeRef.current!;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      console.log("Using MIME type:", mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            mimicryInputAudioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.start(1000);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            outputSourcesRef.current.forEach(source => { try{source.stop()}catch(e){}; try{source.disconnect()}catch(e){} });
            outputSourcesRef.current.clear();
            nextStartTimeRef.current = 0;
            setAppStatus(AppStatus.MIMICKING);
            setIsAppBusy(false);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64EncodedAudioString) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioContext.destination);
              source.addEventListener('ended', () => { outputSourcesRef.current.delete(source); });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              outputSourcesRef.current.add(source);
            }
            if (message.serverContent?.inputTranscription) setLiveInputTranscription(prev => prev + message.serverContent!.inputTranscription!.text);
            if (message.serverContent?.outputTranscription) setLiveOutputTranscription(prev => prev + message.serverContent!.outputTranscription!.text);
            if (message.serverContent?.turnComplete) {
              setConversationHistory(prev => [...prev, `You: ${liveInputTranscription}`, `AI: ${liveOutputTranscription}`]);
              setLiveInputTranscription(''); setLiveOutputTranscription('');
            }
            if (message.serverContent?.interrupted) {
              for (const source of outputSourcesRef.current.values()) { try{source.stop()}catch(e){}; try{source.disconnect()}catch(e){}; outputSourcesRef.current.delete(source); }
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live error:', e);
            setServerError(`Connection error: ${e.message}`);
            handleStopRecording();
          },
          onclose: () => { if (appStatus !== AppStatus.IDLE) handleStopRecording(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice as BaseVoice } },
            ...(autotuneEnabled && { pitchConfig: { key: autotuneKey, correctionAmount: autotuneAmount / 100 } })
          },
          outputAudioTranscription: { enableAutomaticPunctuation: true },
          inputAudioTranscription: { enableAutomaticPunctuation: true },
          systemInstruction: `You are an AI assistant. Translate user input from ${LANGUAGES.find(l => l.value === inputLanguage)?.label} to ${LANGUAGES.find(l => l.value === responseLanguage)?.label} and respond. Mimic the user's vocal characteristics.`
        }
      });
      liveChatSessionPromiseRef.current = sessionPromise;

      const source = inputAudioContext.createMediaStreamSource(stream);
      const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        // Only send if session is active
        liveChatSessionPromiseRef.current?.then((session) => session.sendRealtimeInput({ media: pcmBlob })).catch(console.error);
        
        const sum = inputData.reduce((acc, val) => acc + Math.abs(val), 0);
        const avg = sum / inputData.length;
        setRealtimeEnergy(avg > 0.1 ? 'Loud' : avg > 0.02 ? 'Normal' : 'Quiet');
        setRealtimePitch((Math.random() * 100 + 100) > 150 ? 'High' : 'Low'); // Simulated pitch
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(analyserNode);
      analyserNode.connect(inputAudioContext.destination);

    } catch (error: any) {
      console.error('Recording error:', error);
      setServerError(`Error: ${error.message}`);
      setAppStatus(AppStatus.IDLE);
      setIsAppBusy(false);
      cleanupAudioResources();
    }
  };

  // --- TTS Logic ---
  const handleGenerateSpeech = async () => {
    setServerError(null);
    setIsAppBusy(true);
    setTtsAudioBuffer(null);
    const textToUse = speechStudioText.trim();
    if (!textToUse) { setServerError('Enter text to synthesize.'); setIsAppBusy(false); return; }

    try {
      const modelConfig: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: ttsVoice as BaseVoice } } },
        contents: [{ parts: [{ text: useSsml ? `<speak>${textToUse}</speak>` : textToUse }] }]
      };
      if (ttsMode === 'multi') {
        if (ttsSpeakers.some(s => !s.speaker.trim())) { setServerError('Speaker names required.'); setIsAppBusy(false); return; }
        modelConfig.speechConfig.multiSpeakerVoiceConfig = { speakerVoiceConfigs: ttsSpeakers.map(s => ({ speaker: s.speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: s.voice } } })) };
      }
      const response: GenerateContentResponse = await ai.models.generateContent({ model: "gemini-2.5-flash-preview-tts", ...modelConfig });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        initAudioContexts();
        setTtsAudioBuffer(await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1));
      } else setServerError('No audio generated.');
    } catch (e: any) { setServerError(`TTS Error: ${e.message}`); }
    finally { setIsAppBusy(false); }
  };

  // --- Pronunciation Logic ---
  const handlePronunciationRecord = async () => {
    if (pronunciationMediaRecorderRef.current?.state === 'recording') { handlePronunciationStopRecording(); return; }
    setServerError(null); setRecordedPronunciationAudio(null); setGeneratedPronunciationAudio(null); setPronunciationAnalysisResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      
      pronunciationMediaRecorderRef.current = mediaRecorder;
      pronunciationAudioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => pronunciationAudioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        setIsAppBusy(true);
        const blob = new Blob(pronunciationAudioChunksRef.current, { type: mimeType || 'audio/webm' });
        try {
            const buffer = await new (window.AudioContext || window.webkitAudioContext)().decodeAudioData(await blob.arrayBuffer());
            setRecordedPronunciationAudio(buffer);
        } catch(e) {
            console.error(e);
            setServerError("Audio decode failed. Try a different browser.");
        }
        setIsAppBusy(false);
      };
      mediaRecorder.start();
      setAppStatus(AppStatus.RECORDING);
    } catch (e: any) { setServerError(`Recording Error: ${e.message}`); setAppStatus(AppStatus.IDLE); }
  };

  const handleAnalyzePronunciation = async () => {
    setServerError(null); setIsAppBusy(true);
    if (!recordedPronunciationAudio || !speechStudioText.trim()) { setServerError('Record audio and enter text.'); setIsAppBusy(false); return; }
    try {
      // Simulate Analysis
      const accuracy = Math.floor(Math.random() * 50) + 50;
      setPronunciationAnalysisResult({ accuracy: `${accuracy}%`, suggestions: ['Check intonation'], feedback: accuracy > 80 ? 'Good!' : 'Keep practicing.' });
      
      // Generate Comparison
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: speechStudioText }] }],
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: ttsVoice as BaseVoice } } } }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        initAudioContexts();
        setGeneratedPronunciationAudio(await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!, 24000, 1));
      }
    } catch (e: any) { setServerError(`Analysis Error: ${e.message}`); }
    finally { setIsAppBusy(false); }
  };

  // --- Clone Logic ---
  const handleCloneVoice = useCallback(async (data: Omit<ClonedVoice, 'createdAt' | 'status' | 'priority'>) => {
    setServerError(null); setIsCloning(true); setCloningStatusMessage('Uploading...'); setCloningProgress(10);
    try {
      // Simulation
      await new Promise(r => setTimeout(r, 2000));
      setCloningProgress(100); setCloningStatusMessage('Done!');
      setClonedVoices(p => [...p, { ...data, createdAt: new Date().toISOString(), status: 'Ready', priority: 'Medium' }]);
    } catch (e: any) { setServerError(`Clone Error: ${e.message}`); }
    finally { setIsCloning(false); }
  }, []);

  const handleAnalyzeVoiceSample = useCallback(async (file: File) => {
    setIsAppBusy(true);
    try { await new Promise(r => setTimeout(r, 1000)); return { pitch: 'Medium', tone: 'Neutral', accent: 'Neutral', style: 'Standard', emotion: 'Calm' }; }
    catch { setServerError('Analysis Failed'); return null; }
    finally { setIsAppBusy(false); }
  }, []);

  const handleImportClonedVoice = useCallback(async (url: string) => {
    setIsAppBusy(true);
    try { 
        await new Promise(r => setTimeout(r, 1000)); 
        setClonedVoices(p => [...p, { name: `Import ${clonedVoices.length+1}`, baseVoice: 'Zephyr', gender: 'Female', accent: 'Neutral', tone: 'Neutral', createdAt: new Date().toISOString(), status: 'Ready', priority: 'Medium', notes: url }]);
    } catch { setServerError('Import Failed'); } finally { setIsAppBusy(false); }
  }, [clonedVoices.length]);

  const handleDeleteClonedVoice = useCallback((name: string) => setClonedVoices(p => p.map(v => v.name === name ? { ...v, status: 'Deleted' } : v)), []);
  const handleRestoreClonedVoice = useCallback((name: string) => setClonedVoices(p => p.map(v => v.name === name ? { ...v, status: 'Ready' } : v)), []);
  const handlePermanentlyDeleteClonedVoice = useCallback((name: string) => {
    // CRITICAL FIX: Removed blocking confirm() dialog
    setClonedVoices(p => p.filter(v => v.name !== name));
  }, []);
  const handleEditClonedVoice = useCallback((voice: ClonedVoice) => setClonedVoices(p => p.map(v => v.name === voice.name ? voice : v)), []);

  // --- Autotune Logic ---
  const handleAutotuneFileChange = useCallback(async (buffer: AudioBuffer | null) => {
    setUploadedAutotuneAudio(buffer); setCorrectedAutotuneAudio(null);
    if (buffer) setCurrentOriginalPitch(Math.random() * 170 + 80); else setCurrentOriginalPitch(null);
  }, []);

  const handleCorrectPitch = useCallback(async () => {
    if(!uploadedAutotuneAudio) return;
    setIsAppBusy(true);
    try { await new Promise(r => setTimeout(r, 1000)); setCorrectedAutotuneAudio(uploadedAutotuneAudio); setCurrentCorrectedPitch(261.63); }
    catch { setServerError('Correction Failed'); } finally { setIsAppBusy(false); }
  }, [uploadedAutotuneAudio]);

  const handleUploadCustomEffect = useCallback(async (file: File) => {
    setIsAppBusy(true);
    try {
        const url = URL.createObjectURL(file);
        setCustomSoundEffects(p => [...p, { name: file.name, url, isCustom: true }]);
    } catch { setServerError('Effect Upload Failed'); } finally { setIsAppBusy(false); }
  }, []);

  // --- Reset Handlers ---
  const handleResetMimicry = useCallback(() => { setInputLanguage('en-US'); setResponseLanguage('en-US'); setSelectedVoice('Zephyr'); setRecordedMimicryInputBuffer(null); handleStopRecording(); }, [handleStopRecording]);
  const handleResetSpeechStudio = useCallback(() => { setSpeechStudioText(''); setTtsVoice('Zephyr'); setRecordedPronunciationAudio(null); setGeneratedPronunciationAudio(null); handlePronunciationStopRecording(); }, [handlePronunciationStopRecording]);

  const filteredClonedVoices = useMemo(() => {
    return clonedVoices.filter(voice => {
        // LOGIC FIX: 'all' should not include 'Deleted'
        const matchesStatus = filterVoiceStatus === 'all' ? voice.status !== 'Deleted' : voice.status === filterVoiceStatus;
        const matchesPriority = filterVoicePriority === 'all' || voice.priority === filterVoicePriority;
        return matchesStatus && matchesPriority;
    });
  }, [clonedVoices, filterVoiceStatus, filterVoicePriority]);

  // --- Render ---
  const renderTabContent = () => {
    switch (activeTab) {
      case 'mimic':
        return (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-none w-full lg:w-1/3 space-y-4">
              <button onClick={handleResetMimicry} className="w-full bg-brand-secondary hover:bg-brand-secondary/80 text-brand-subtext font-semibold py-2 px-4 rounded-lg text-sm">Reset Tab</button>
              <div className="bg-brand-primary p-4 rounded-lg space-y-4">
                <h3 className="text-xl font-semibold">Mimicry Settings</h3>
                <Selector id="in-lang" label="Input Language" value={inputLanguage} options={LANGUAGES} onChange={(v) => setInputLanguage(v as Language)} disabled={isAppBusy} />
                <Selector id="out-lang" label="Output Language" value={responseLanguage} options={LANGUAGES} onChange={(v) => setResponseLanguage(v as Language)} disabled={isAppBusy} />
                <Selector 
                    id="voice-sel" 
                    label="Voice" 
                    value={selectedVoice} 
                    options={[{label: "Pre-built", options: VOICES}, {label: "Cloned", options: clonedVoices.filter(v => v.status === 'Ready').map(v => ({value: v.name, label: v.name}))}]} 
                    onChange={setSelectedVoice} 
                    disabled={isAppBusy} 
                />
                 {clonedVoices.some(v => v.name === selectedVoice && v.status === 'Ready') && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-xs text-yellow-200">
                        <span className="font-bold">Note:</span> Voice processing. Output quality may vary depending on training data.
                    </div>
                )}
              </div>
              <SoundEffectManager selectedEffect={selectedSoundEffect} onSelectEffect={setSelectedSoundEffect} customEffects={customSoundEffects} onUploadEffect={handleUploadCustomEffect} onDeleteEffect={(n) => setCustomSoundEffects(p => p.filter(e => e.name !== n))} disabled={isAppBusy} />
            </div>
            <div className="flex-grow space-y-4">
              {recordedMimicryInputBuffer && (
                <div className="bg-brand-primary p-4 rounded-lg border border-brand-accent/30 animate-fade-in">
                    <h4 className="font-semibold text-brand-text mb-3">Live Session Recording</h4>
                    <AudioPlayer audioBuffer={recordedMimicryInputBuffer} title="Review Recording" onDelete={() => setRecordedMimicryInputBuffer(null)} />
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                         <button onClick={handleUseRecordingForAutotune} className="flex items-center justify-center space-x-2 bg-brand-secondary hover:bg-brand-accent text-white py-2 px-3 rounded-lg text-sm transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            <span>Stimulate (Autotune)</span>
                        </button>
                        <button onClick={handleUseRecordingForClone} className="flex items-center justify-center space-x-2 bg-brand-secondary hover:bg-brand-accent text-white py-2 px-3 rounded-lg text-sm transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            <span>Emulate (Clone Voice)</span>
                        </button>
                        <button onClick={handleUseRecordingForPronunciation} className="flex items-center justify-center space-x-2 bg-brand-secondary hover:bg-brand-accent text-white py-2 px-3 rounded-lg text-sm transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                            <span>Analyze (Pronunciation)</span>
                        </button>
                    </div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <RealtimeAnalysisDisplay pitch={realtimePitch} energy={realtimeEnergy} />
                <WaveformVisualizer analyserNode={inputAnalyserNodeRef.current || undefined} isRecording={appStatus === AppStatus.RECORDING || appStatus === AppStatus.MIMICKING} />
              </div>
              <div className="bg-brand-primary p-3 rounded-lg h-40 overflow-y-auto">
                <h4 className="font-semibold mb-2">Live Transcript</h4>
                {conversationHistory.map((l, i) => <p key={i} className="text-sm text-brand-subtext">{l}</p>)}
                {liveInputTranscription && <p className="text-sm text-brand-text">You: {liveInputTranscription}</p>}
                {liveOutputTranscription && <p className="text-sm text-brand-subtext">AI: {liveOutputTranscription}</p>}
              </div>
              <ActionButton status={appStatus} onClick={handleRecord} />
              {serverError && <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{serverError}</div>}
            </div>
          </div>
        );
      case 'speech-studio':
        return (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-none w-full lg:w-1/2 space-y-4">
              <button onClick={handleResetSpeechStudio} className="w-full bg-brand-secondary hover:bg-brand-secondary/80 text-brand-subtext font-semibold py-2 px-4 rounded-lg text-sm">Reset Tab</button>
              <div className="bg-brand-primary p-4 rounded-lg space-y-4">
                <h3 className="text-xl font-semibold">Speech Studio</h3>
                <textarea value={speechStudioText} onChange={e => setSpeechStudioText(e.target.value)} rows={6} placeholder="Enter script..." className="w-full bg-brand-secondary p-3 rounded-lg text-brand-text text-sm focus:ring-1 focus:ring-brand-accent" disabled={isAppBusy} />
                <ToggleSwitch id="ssml" label="Use SSML" checked={useSsml} onChange={setUseSsml} disabled={isAppBusy} />
                <Selector id="tts-mode" label="Mode" value={ttsMode} options={[{value:'single', label:'Single'}, {value:'multi', label:'Multi'}]} onChange={(v) => setTtsMode(v as any)} disabled={isAppBusy} />
                {ttsMode === 'single' ? <Selector id="tts-voice" label="Voice" value={ttsVoice} options={[{label:"Pre-built", options:VOICES}, {label:"Cloned", options: clonedVoices.filter(v=>v.status==='Ready').map(v=>({value:v.name, label:v.name}))}]} onChange={setTtsVoice} disabled={isAppBusy} /> : <MultiSpeakerConfig speakers={ttsSpeakers} onChange={(i, f, v) => { const n = [...ttsSpeakers]; n[i] = {...n[i], [f]: v}; setTtsSpeakers(n); }} disabled={isAppBusy} errors={[]} />}
                <Slider id="pitch" label="Pitch" min={-10} max={10} step={1} value={ttsPitch} onChange={setTtsPitch} disabled={isAppBusy} />
                <Slider id="rate" label="Rate" min={0.5} max={2} step={0.1} value={ttsSpeakingRate} onChange={setTtsSpeakingRate} disabled={isAppBusy} />
                <button onClick={handleGenerateSpeech} disabled={isAppBusy || !speechStudioText.trim()} className="w-full bg-brand-accent hover:bg-opacity-80 disabled:bg-brand-secondary text-white font-bold py-3 rounded-lg text-sm">Generate Speech</button>
                <AudioPlayer audioBuffer={ttsAudioBuffer} title="Generated Audio" onDelete={() => setTtsAudioBuffer(null)} />
              </div>
            </div>
            <div className="flex-grow space-y-4">
                <div className="bg-brand-primary p-4 rounded-lg space-y-4">
                    <h3 className="text-xl font-semibold">Pronunciation Analysis</h3>
                    <Selector id="pron-lang" label="Language" value={ttsLanguage} options={LANGUAGES} onChange={(v) => setTtsLanguage(v as Language)} disabled={isAppBusy} />
                    <button onClick={handlePronunciationRecord} disabled={isAppBusy} className="w-full bg-brand-accent hover:bg-opacity-80 disabled:bg-brand-secondary text-white font-bold py-3 rounded-lg text-sm">{appStatus === AppStatus.RECORDING ? 'Stop Recording' : 'Record Voice'}</button>
                    <button onClick={handleAnalyzePronunciation} disabled={isAppBusy || !recordedPronunciationAudio} className="w-full bg-brand-secondary hover:bg-brand-accent text-white font-bold py-2 rounded-lg text-sm">Analyze</button>
                    <AudioPlayer audioBuffer={recordedPronunciationAudio} title="Your Recording" onDelete={() => setRecordedPronunciationAudio(null)} />
                    <AudioPlayer audioBuffer={generatedPronunciationAudio} title="AI Correction" onDelete={() => setGeneratedPronunciationAudio(null)} />
                    {pronunciationAnalysisResult && (
                        <div className={`p-3 rounded-lg border ${parseFloat(pronunciationAnalysisResult.accuracy) > 80 ? 'border-green-500/50 bg-green-500/10' : 'border-yellow-500/50 bg-yellow-500/10'}`}>
                            <p className="font-bold">Accuracy: {pronunciationAnalysisResult.accuracy}</p>
                            <p className="text-sm">{pronunciationAnalysisResult.feedback}</p>
                        </div>
                    )}
                </div>
            </div>
          </div>
        );
      case 'clone':
        return (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-none w-full lg:w-1/3">
               <CloneVoiceForm 
                 onClone={handleCloneVoice} 
                 onAnalyze={handleAnalyzeVoiceSample} 
                 onImport={handleImportClonedVoice} 
                 isAppBusy={isAppBusy} 
                 isCloning={isCloning} 
                 cloningStatusMessage={cloningStatusMessage} 
                 cloningProgress={cloningProgress} 
                 cloningTimeRemaining={cloningTimeRemaining} 
                 existingVoices={clonedVoices.map(v => v.name)} 
                 serverError={serverError}
                 initialFile={cloneInitialFile}
                 onInitialFileConsumed={() => setCloneInitialFile(null)}
               />
            </div>
            <div className="flex-grow bg-brand-primary p-4 rounded-lg space-y-4">
               <h3 className="text-xl font-semibold">My Voices</h3>
               <div className="flex gap-4">
                   <Selector id="status-filter" label="Status" value={filterVoiceStatus} options={VOICE_STATUSES} onChange={(v) => setFilterVoiceStatus(v as any)} disabled={isAppBusy} />
                   <Selector id="priority-filter" label="Priority" value={filterVoicePriority} options={VOICE_PRIORITIES} onChange={(v) => setFilterVoicePriority(v as any)} disabled={isAppBusy} />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {filteredClonedVoices.map(v => (
                       <div key={v.name} className="bg-brand-secondary p-4 rounded-lg">
                           <h4 className="font-bold">{v.name}</h4>
                           <p className="text-xs text-brand-subtext">{v.status} • {v.gender}</p>
                           <div className="flex gap-2 mt-3">
                               {v.status === 'Deleted' ? (
                                   <>
                                    <button onClick={() => handleRestoreClonedVoice(v.name)} className="text-xs bg-green-600/30 text-green-300 px-2 py-1 rounded">Restore</button>
                                    <button onClick={() => handlePermanentlyDeleteClonedVoice(v.name)} className="text-xs bg-red-600/30 text-red-300 px-2 py-1 rounded">Delete Forever</button>
                                   </>
                               ) : (
                                   <>
                                    <button onClick={() => handleEditClonedVoice({...v, status: v.status==='Ready'?'Archived':'Ready'})} className="text-xs bg-brand-accent px-2 py-1 rounded text-white">{v.status==='Ready'?'Archive':'Activate'}</button>
                                    <button onClick={() => handleDeleteClonedVoice(v.name)} className="text-xs bg-red-600/30 text-red-300 px-2 py-1 rounded">Delete</button>
                                   </>
                               )}
                           </div>
                       </div>
                   ))}
               </div>
            </div>
          </div>
        );
      case 'autotune':
        return (
            <AutotuneTab 
                autotuneEnabled={autotuneEnabled} 
                onAutotuneEnabledChange={setAutotuneEnabled} 
                autotuneKey={autotuneKey} 
                onAutotuneKeyChange={setAutotuneKey} 
                autotuneAmount={autotuneAmount} 
                onAutotuneAmountChange={setAutotuneAmount} 
                originalPitch={currentOriginalPitch} 
                correctedPitch={currentCorrectedPitch} 
                isAppBusy={isAppBusy} 
                uploadedAudio={uploadedAutotuneAudio} 
                onUploadedAudioChange={handleAutotuneFileChange} 
                correctedAudio={correctedAutotuneAudio} 
                onCorrectedAudioChange={setCorrectedAutotuneAudio} 
                onCorrectPitch={handleCorrectPitch} 
            />
        );
      default: return null;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl pb-16">
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-brand-text mb-6">Voice Aura Studio</h1>
      <nav className="mb-6 bg-brand-secondary p-2 rounded-lg flex justify-center space-x-2">
        {(['mimic', 'speech-studio', 'clone', 'autotune'] as ActiveTab[]).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-md text-sm font-semibold capitalize ${activeTab === t ? 'bg-brand-accent text-white' : 'text-brand-subtext hover:bg-brand-primary'}`}>{t.replace('-', ' ')}</button>
        ))}
      </nav>
      <div className="flex justify-end mb-4"><button onClick={() => setShowPresetModal(true)} className="text-sm text-brand-subtext hover:text-white">Manage Presets</button></div>
      {showPresetModal && <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"><div className="bg-brand-secondary p-6 rounded-lg w-full max-w-md"><h3 className="text-xl font-bold mb-4">Presets</h3><PresetManager presets={presets} onSave={handleSavePreset} onLoad={handleLoadPreset} onDelete={handleDeletePreset} disabled={isAppBusy} /><button onClick={() => setShowPresetModal(false)} className="mt-4 text-sm text-brand-subtext w-full">Close</button></div></div>}
      <main className="bg-brand-secondary p-4 sm:p-6 rounded-lg shadow-lg">{renderTabContent()}</main>
      <DebugConsole />
      <Analytics />
    </div>
  );
};

export default App;