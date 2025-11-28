
export type Language = 'en-US' | 'hi-IN' | 'mr-IN' | 'hi-Latn' | 'ur-Latn' | 'mr-Latn';

// Voice can now be a pre-built voice or a custom cloned voice name
export type Voice = string; 
export type BaseVoice = 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
export type Tone = 'Warm' | 'Formal' | 'Energetic' | 'Neutral';
export type Accent = 'American' | 'British' | 'Indian' | 'Neutral';
export type Gender = 'Male' | 'Female' | 'Unspecified';

export type VoiceStatus = 'Ready' | 'Archived' | 'Deleted';
export type VoicePriority = 'High' | 'Medium' | 'Low';

export interface ClonedVoice {
  name: string;
  baseVoice: BaseVoice;
  gender: Gender;
  createdAt: string;
  accent: Accent;
  tone: Tone;
  status: VoiceStatus;
  priority: VoicePriority;
  notes?: string;
  // Editable characteristics
  pitch?: number;
}

export interface VoiceAnalysis {
  emotion: string;
  style: string;
  // For pre-clone analysis
  pitch?: string;
  tone?: string;
  accent?: string;
}

export interface SoundEffect {
  name: string;
  url: string; // Will be a data URL for custom effects
  isCustom: boolean;
}

export interface PronunciationAnalysis {
    accuracy: string;
    suggestions: string[];
    feedback?: string; // Overall feedback
}

export enum AppStatus {
  IDLE,
  RECORDING,
  ANALYZING,
  MIMICKING,
  FINISHED,
}

export type ActiveTab = 'mimic' | 'speech-studio' | 'clone' | 'autotune'; // Updated: removed 'tts' and 'pronunciation', added 'speech-studio'

export interface Preset {
  name: string;
  type: ActiveTab;
  // Mimicry / TTS shared voice selection
  voice?: Voice; 
  // Mimicry-specific optional fields
  inputLanguage?: Language;
  language?: Language; // Output language for mimicry
  selectedSoundEffect?: string;
  // Speech Studio (TTS & Pronunciation combined) optional fields
  ttsText?: string;
  ttsLanguage?: Language; // Output language for TTS & analysis language for pronunciation
  ttsVoice?: Voice; // Voice for TTS
  ttsMode?: 'single' | 'multi';
  speakers?: SpeakerConfig[];
  ttsPitch?: number;
  ttsSpeakingRate?: number;
  useSsml?: boolean;
  // Autotune-specific optional fields (for real-time autotune in Mimicry tab)
  autotuneEnabled?: boolean;
  autotuneKey?: string;
  autotuneAmount?: number;
}

export interface SpeakerConfig {
  speaker: string;
  voice: BaseVoice;
}

// Add global type for cross-browser audio context compatibility
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

export const MAX_PRONUNCIATION_TEXT_FOR_ANALYSIS = 500; // New constant for specific pronunciation text length limit