
import { Language, BaseVoice, Tone, Accent, Gender, VoiceStatus, VoicePriority } from './types';

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'en-US', label: 'English' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'mr-IN', label: 'Marathi' },
  { value: 'hi-Latn', label: 'Hindi (Romanized)' },
  { value: 'ur-Latn', label: 'Urdu (Romanized)' },
  { value: 'mr-Latn', label: 'Marathi (Romanized)' }
];

export const VOICES: { value: BaseVoice; label: string }[] = [
  { value: 'Kore', label: 'Kore (Female)' },
  { value: 'Puck', label: 'Puck (Male)' },
  { value: 'Charon', label: 'Charon (Male)' },
  { value: 'Fenrir', label: 'Fenrir (Male)' },
  { value: 'Zephyr', label: 'Zephyr (Female)' }
];

export const TONES: { value: Tone; label: string }[] = [
  { value: 'Neutral', label: 'Neutral' },
  { value: 'Warm', label: 'Warm' },
  { value: 'Formal', label: 'Formal' },
  { value: 'Energetic', label: 'Energetic' }
];

export const ACCENTS: { value: Accent; label: string }[] = [
  { value: 'Neutral', label: 'Neutral' },
  { value: 'American', label: 'American' },
  { value: 'British', label: 'British' },
  { value: 'Indian', label: 'Indian' }
];

export const GENDERS: { value: Gender; label: string }[] = [
    { value: 'Unspecified', label: 'Unspecified' },
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' }
];

export const SOUND_EFFECTS: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'reverb', label: 'Cathedral Reverb' }
];

export const MUSICAL_KEYS: { value: string; label: string }[] = [
    { value: 'C-Major', label: 'C Major / A Minor' },
    { value: 'G-Major', label: 'G Major / E Minor' },
    { value: 'D-Major', label: 'D Major / B Minor' },
    { value: 'A-Major', label: 'A Major / F# Minor' },
    { value: 'E-Major', label: 'E Major / C# Minor' },
    { value: 'B-Major', label: 'B Major / G# Minor' },
    { value: 'F#-Major', label: 'F# Major / D# Minor' },
    { value: 'C#-Major', label: 'C# Major / A# Minor' },
    { value: 'F-Major', label: 'F Major / D Minor' },
    { value: 'Bb-Major', label: 'Bb Major / G Minor' },
    { value: 'Eb-Major', label: 'Eb Major / C Minor' },
    { value: 'Ab-Major', label: 'Ab Major / F Minor' },
    { value: 'Db-Major', label: 'Db Major / Bb Minor' },
    { value: 'Gb-Major', label: 'Gb Major / Eb Minor' },
    { value: 'Cb-Major', label: 'Cb Major / Ab Minor' }
];


export const VOICE_STATUSES: { value: VoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Active' },
  { value: 'Ready', label: 'Ready' },
  { value: 'Archived', label: 'Archived' },
  { value: 'Deleted', label: 'Recycle Bin' }
];

export const VOICE_PRIORITIES: { value: VoicePriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' }
];

export const VOICE_STATUS_OPTIONS: { value: VoiceStatus; label: string }[] = [
    { value: 'Ready', label: 'Ready' },
    { value: 'Archived', label: 'Archived' }
];

export const VOICE_PRIORITY_OPTIONS: { value: VoicePriority; label: string }[] = [
    { value: 'High', label: 'High' },
    { value: 'Medium', label: 'Medium' },
    { value: 'Low', label: 'Low' }
];