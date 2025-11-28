
import React, { useState, useEffect } from 'react';
import { BaseVoice, VoiceAnalysis, Gender, Accent, Tone, ClonedVoice } from '../types';
import { VOICES, GENDERS, ACCENTS, TONES } from '../constants';
import Selector from './Selector';
import TextInput from './TextInput';
import FileUpload from './FileUpload';
import ProgressVisualizer from './ProgressVisualizer';
import AudioPlayer from './AudioPlayer';

interface CloneVoiceFormProps {
  onClone: (voiceData: Omit<ClonedVoice, 'createdAt' | 'status' | 'priority'>) => void;
  onAnalyze: (file: File) => Promise<Partial<VoiceAnalysis> | null>;
  onImport: (url: string) => void;
  isAppBusy: boolean;
  isCloning: boolean;
  cloningStatusMessage: string;
  cloningProgress: number;
  cloningTimeRemaining: number | null;
  existingVoices: string[];
  serverError: string | null;
  initialFile: File | null; // New prop for inter-tab integration
  onInitialFileConsumed: () => void; // New prop to clear the file state in parent
}

interface FormErrors {
    name?: string;
    file?: string;
    importUrl?: string;
}

const AnalyzeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
);


const CloneVoiceForm: React.FC<CloneVoiceFormProps> = ({ 
    onClone, onAnalyze, onImport, isAppBusy, isCloning, cloningStatusMessage, cloningProgress, cloningTimeRemaining, existingVoices, serverError, initialFile, onInitialFileConsumed
}) => {
  const [name, setName] = useState('');
  const [baseVoice, setBaseVoice] = useState<BaseVoice>('Kore');
  const [gender, setGender] = useState<Gender>('Unspecified');
  const [accent, setAccent] = useState<Accent>('Neutral');
  const [tone, setTone] = useState<Tone>('Neutral');
  const [notes, setNotes] = useState('');
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [analysisPreview, setAnalysisPreview] = useState<Partial<VoiceAnalysis> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [previewBuffer, setPreviewBuffer] = useState<AudioBuffer | null>(null);

  // Effect to handle the initial file passed from another tab
  useEffect(() => {
    if (initialFile) {
        setAudioFile(initialFile);
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (e.target?.result instanceof ArrayBuffer) {
                try {
                    const buffer = await audioContext.decodeAudioData(e.target.result);
                    setPreviewBuffer(buffer);
                } catch (decodeError) {
                    console.error("Failed to decode initial audio file:", decodeError);
                    setErrors(prev => ({...prev, file: 'Could not decode initial audio file.'}));
                } finally {
                    audioContext.close();
                }
            }
        };
        reader.readAsArrayBuffer(initialFile);
        onInitialFileConsumed(); // Signal that the file has been processed
    }
  }, [initialFile, onInitialFileConsumed]);


  const validateName = (value: string): string | undefined => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return 'Please enter a name for the voice.';
    }
    if (trimmedValue.length < 2 || trimmedValue.length > 30) {
        return 'Name must be 2-30 characters.';
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedValue)) {
        return 'Name can only contain letters, numbers, spaces, underscores, and hyphens.';
    }
    if (existingVoices.some(v => v.toLowerCase() === trimmedValue.toLowerCase())) {
        return 'A voice with this name already exists.';
    }
    return undefined;
  }

  const resetLocalForm = () => {
    setName('');
    setBaseVoice('Kore');
    setGender('Unspecified');
    setAccent('Neutral');
    setTone('Neutral');
    setNotes('');
    setAudioFile(null);
    setAnalysisPreview(null);
    setErrors({});
    setPreviewBuffer(null);
    const fileInput = document.getElementById('audio-upload-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setAudioFile(null);
    setAnalysisPreview(null);
    setPreviewBuffer(null);

    if (!file) {
      setErrors(prev => ({...prev, file: undefined}));
      return;
    }

    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      if (audio.duration < 5 || audio.duration > 30) {
        setErrors(prev => ({...prev, file: 'Duration must be between 5 and 30 seconds.'}));
      } else {
        setErrors(prev => ({...prev, file: undefined}));
        setAudioFile(file);
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const reader = new FileReader();
        reader.onload = async (e) => {
            if (e.target?.result instanceof ArrayBuffer) {
                try {
                    const buffer = await audioContext.decodeAudioData(e.target.result);
                    setPreviewBuffer(buffer);
                } catch (decodeError) {
                    console.error("Failed to decode audio for preview:", decodeError);
                    setErrors(prev => ({...prev, file: 'Could not decode audio file for preview.'}));
                } finally {
                    audioContext.close();
                }
            }
        };
        reader.readAsArrayBuffer(file);
      }
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      setErrors(prev => ({...prev, file: 'Could not read audio file properties.'}));
    }
  };

  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const newName = event.target.value;
      setName(newName);
      setErrors(prev => ({ ...prev, name: validateName(newName) }));
  }

  const handleAnalyzeClick = async () => {
    if (!audioFile) return;

    setIsAnalyzing(true);
    setErrors(prev => ({ ...prev, file: undefined }));
    const result = await onAnalyze(audioFile);
    if (result) {
        setAnalysisPreview(result);
        
        if (result.pitch) {
            const pitch = result.pitch.toLowerCase();
            if (pitch.includes('high')) {
                setGender('Female');
                setBaseVoice('Kore');
            } else if (pitch.includes('low')) {
                setGender('Male');
                setBaseVoice('Puck');
            } else {
                setGender('Unspecified');
                setBaseVoice('Kore');
            }
        }

        if (result.accent) {
            const matchedAccent = ACCENTS.find(a => a.label.toLowerCase() === result.accent?.toLowerCase());
            if (matchedAccent) setAccent(matchedAccent.value); else setAccent('Neutral');
        }

        if (result.tone) {
            const matchedTone = TONES.find(t => t.label.toLowerCase() === result.tone?.toLowerCase());
            if (matchedTone) setTone(matchedTone.value); else setTone('Neutral');
        }
    }
    setIsAnalyzing(false);
  };


  const handleCloneClick = () => {
    const nameError = validateName(name);
    let fileError = errors.file;

    if (!audioFile && !fileError) {
        fileError = 'Please select an audio file.';
    }
    
    if (nameError || fileError) {
        setErrors({ ...errors, name: nameError, file: fileError });
        return;
    }

    if (name.trim() && audioFile) {
        onClone({ name: name.trim(), baseVoice, gender, accent, tone, notes });
        resetLocalForm();
    }
  };

  
  const handleImportClick = () => {
    setErrors(prev => ({...prev, importUrl: undefined}));
    if (!importUrl) {
        setErrors(prev => ({...prev, importUrl: 'Please enter a URL.'}));
        return;
    }
    try {
        new URL(importUrl);
    } catch {
        setErrors(prev => ({...prev, importUrl: 'Invalid URL format.'}));
        return;
    }
    onImport(importUrl);
    setImportUrl(''); 
  };
  
  const isFormValid = !validateName(name) && audioFile && !errors.file;

  return (
    <div className="bg-brand-primary p-4 rounded-lg">
      <h3 className="text-lg sm:text-xl font-semibold mb-3">Create New Cloned Voice</h3>
      <div className="space-y-3">
        <FileUpload 
            id="audio-upload-input"
            label="Audio Sample (5-30s)"
            onChange={handleFileChange}
            disabled={isAppBusy}
            accept="audio/*"
            error={errors.file}
        />
        <AudioPlayer audioBuffer={previewBuffer} title="Sample Preview" onDelete={() => {
            setAudioFile(null);
            setPreviewBuffer(null);
            const fileInput = document.getElementById('audio-upload-input') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        }} />
        <TextInput 
            id="clone-voice-name"
            label="New Voice Name"
            value={name}
            onChange={handleNameChange}
            placeholder="e.g., My Custom Voice"
            disabled={isAppBusy}
            error={errors.name}
            maxLength={30}
        />
        <details className="bg-brand-secondary/50 rounded-lg p-2">
            <summary className="cursor-pointer text-sm font-semibold text-brand-subtext">Advanced Settings</summary>
            <div className="pt-3 space-y-3">
                <Selector
                  id="base-voice-selector"
                  label="Base Voice"
                  value={baseVoice}
                  options={VOICES}
                  onChange={(val) => setBaseVoice(val as BaseVoice)}
                  disabled={isAppBusy}
                />
                <Selector
                  id="gender-selector"
                  label="Gender"
                  value={gender}
                  options={GENDERS}
                  onChange={(val) => setGender(val as Gender)}
                  disabled={isAppBusy}
                />
                <Selector
                  id="accent-selector"
                  label="Accent Tuning"
                  value={accent}
                  options={ACCENTS}
                  onChange={(val) => setAccent(val as Accent)}
                  disabled={isAppBusy}
                />
                <Selector
                  id="tone-selector"
                  label="Tone"
                  value={tone}
                  options={TONES}
                  onChange={(val) => setTone(val as Tone)}
                  disabled={isAppBusy}
                />
                 <div>
                    <label htmlFor="clone-notes" className="text-xs sm:text-sm font-medium text-brand-subtext mb-1 block">Notes (Optional)</label>
                    <textarea id="clone-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="e.g., Recorded with professional mic." className="w-full bg-brand-secondary text-brand-text text-sm sm:text-base p-2 rounded-lg focus:ring-brand-accent focus:border-brand-accent"></textarea>
                </div>
            </div>
        </details>
        
        {isCloning && (
            <ProgressVisualizer
                isActive={isCloning}
                label="Cloning in Progress"
                description={cloningStatusMessage}
                progress={cloningProgress}
                timeRemaining={cloningTimeRemaining}
            />
        )}
        
        {serverError && !isCloning && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center animate-fade-in">
                <h4 className="font-bold text-red-300 text-sm sm:text-base">Cloning Failed</h4>
                <p className="text-xs sm:text-sm text-red-400 mt-1">{serverError}</p>
            </div>
        )}

        {audioFile && (
             <div className="mt-2 flex flex-col sm:flex-row items-stretch gap-2">
                <button
                    onClick={handleAnalyzeClick}
                    disabled={isAppBusy || isAnalyzing}
                    className="w-full text-xs sm:text-sm bg-brand-secondary text-white px-3 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
                    title="Analyze uploaded audio to auto-fill advanced settings"
                >
                    {isAnalyzing ? <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <><AnalyzeIcon /><span>Auto-Detect & Fill Settings</span></>}
                </button>
            </div>
        )}
        
        {analysisPreview && (
            <div className="mt-3 p-3 bg-brand-primary rounded-lg text-sm animate-fade-in">
                <h4 className="font-semibold text-brand-text text-sm sm:text-base mb-2">Analysis Preview:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-brand-subtext text-xs sm:text-sm">
                    <p><strong>Detected Pitch:</strong> {analysisPreview.pitch || 'N/A'}</p>
                    <p><strong>Detected Tone:</strong> {analysisPreview.tone || 'N/A'}</p>
                    <p><strong>Detected Accent:</strong> {analysisPreview.accent || 'N/A'}</p>
                    <p><strong>Vocal Style:</strong> {analysisPreview.style || 'N/A'}</p>
                </div>
            </div>
        )}

        <button
          onClick={handleCloneClick}
          disabled={!isFormValid || isAppBusy || isCloning}
          className="w-full bg-brand-accent hover:bg-opacity-80 disabled:bg-brand-secondary disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg text-sm sm:text-base transition-colors mt-4"
        >
          {isCloning ? 'Cloning...' : 'Clone Voice'}
        </button>
      </div>
      <div className="mt-6 pt-4 border-t border-brand-secondary">
         <h3 className="text-lg sm:text-xl font-semibold mb-3">Import Shared Voice</h3>
         <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
            <div className="flex-grow">
                <TextInput
                    id="import-url"
                    label="Import from URL"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    placeholder="Paste share link here"
                    disabled={isAppBusy}
                    error={errors.importUrl}
                />
            </div>
            <button
                onClick={handleImportClick}
                disabled={isAppBusy || !importUrl}
                className="flex items-center justify-center bg-brand-secondary hover:bg-brand-accent disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
            >
                Import
            </button>
         </div>
      </div>
    </div>
  );
};

export default CloneVoiceForm;