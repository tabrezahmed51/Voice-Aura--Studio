
import React, { useState } from 'react';
import { MUSICAL_KEYS } from '../constants';
import PitchVisualizer from './PitchVisualizer';
import Selector from './Selector';
import Slider from './Slider';
import ToggleSwitch from './ToggleSwitch';
import FileUpload from './FileUpload';
import AudioPlayer from './AudioPlayer';
import TextInput from './TextInput'; // Using TextInput for notes/lyrics now

interface AutotuneTabProps {
  autotuneEnabled: boolean;
  onAutotuneEnabledChange: (enabled: boolean) => void;
  autotuneKey: string;
  onAutotuneKeyChange: (key: string) => void;
  autotuneAmount: number;
  onAutotuneAmountChange: (amount: number) => void;
  originalPitch: number | null;
  correctedPitch: number | null;
  isAppBusy: boolean;
  uploadedAudio: AudioBuffer | null;
  onUploadedAudioChange: (buffer: AudioBuffer | null) => void;
  correctedAudio: AudioBuffer | null;
  onCorrectedAudioChange: (buffer: AudioBuffer | null) => void;
  onCorrectPitch: () => void;
}

const AutotuneTab: React.FC<AutotuneTabProps> = ({
  autotuneEnabled,
  onAutotuneEnabledChange,
  autotuneKey,
  onAutotuneKeyChange,
  autotuneAmount,
  onAutotuneAmountChange,
  originalPitch,
  correctedPitch,
  isAppBusy,
  uploadedAudio,
  onUploadedAudioChange,
  correctedAudio,
  onCorrectedAudioChange,
  onCorrectPitch,
}) => {
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [notes, setNotes] = useState('');

  // Handle file upload for file-based autotune
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const reader = new FileReader();
      reader.onload = async (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          try {
            const buffer = await audioContext.decodeAudioData(e.target.result);
            onUploadedAudioChange(buffer);
            onCorrectedAudioChange(null); // Clear previous correction on new upload
          } catch (decodeError) {
            console.error("Failed to decode audio file:", decodeError);
            // Optionally, show error to user
          } finally {
            audioContext.close(); // Close audio context after decoding
          }
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
        onUploadedAudioChange(null); // Clear buffer if no file selected
    }
  };

  // Internal handler for the "Correct Pitch" button
  const handleInternalCorrectPitch = async () => {
      if (!uploadedAudio) return;
      setIsProcessingFile(true); // Indicate file processing is active
      try {
          await onCorrectPitch(); // Call the parent's logic
      } finally {
          setIsProcessingFile(false);
      }
  };
  
  // Clear uploaded audio and reset states
  const handleClearUploaded = () => {
    onUploadedAudioChange(null);
    onCorrectedAudioChange(null);
    const fileInput = document.getElementById('autotune-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = ''; // Clear file input visual
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl font-bold">Autotune & Pitch Correction</h2>
        <p className="text-sm sm:text-base text-brand-subtext mt-1">
          Upload an audio file to simulate pitch correction or enable real-time autotuning on the Mimicry tab.
        </p>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
            <div className="bg-brand-primary p-4 rounded-lg space-y-4">
                <h4 className="font-semibold text-lg sm:text-xl">File-Based Correction</h4>
                <p className="text-xs sm:text-sm text-brand-subtext">Upload a file to apply pitch correction. This is a simulation.</p>
                <FileUpload
                    id="autotune-upload"
                    label="Upload Audio File (MP3, WAV, etc.)"
                    onChange={handleFileChange}
                    disabled={isAppBusy || isProcessingFile}
                    accept="audio/*"
                    error={null}
                />
                 <AudioPlayer audioBuffer={uploadedAudio} title="Uploaded Audio" onDelete={handleClearUploaded} />
                 <AudioPlayer audioBuffer={correctedAudio} title="Corrected Audio" onDelete={() => onCorrectedAudioChange(null)} />
                 <button onClick={handleInternalCorrectPitch} disabled={!uploadedAudio || isAppBusy || isProcessingFile} className="w-full bg-brand-accent hover:bg-opacity-80 disabled:bg-brand-secondary text-white font-bold py-2 px-4 rounded-lg text-sm sm:text-base transition-colors flex items-center justify-center">
                    {isProcessingFile ? (
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : 'Correct Pitch (Simulated)'}
                </button>
            </div>
             <div className="bg-brand-primary p-4 rounded-lg space-y-4">
                <h4 className="font-semibold text-lg sm:text-xl">Lyrics / Notes</h4>
                <TextInput
                    id="autotune-notes"
                    label="Add lyrics or notes for the uploaded audio..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder=""
                    isTextArea={true}
                    rows={12}
                    disabled={isAppBusy || isProcessingFile}
                />
             </div>
       </div>

      <div className="bg-brand-secondary p-4 rounded-lg space-y-4">
        <h4 className="font-semibold text-lg sm:text-xl text-center">Real-time Correction (Mimicry Tab)</h4>
        <PitchVisualizer
          isActive={autotuneEnabled && !isAppBusy}
          originalPitch={originalPitch}
          correctedPitch={correctedPitch}
        />
        <div className="mt-2 text-xs sm:text-sm text-brand-subtext flex flex-col sm:flex-row justify-center space-y-1 sm:space-y-0 sm:space-x-4">
            <span><span className="inline-block w-3 h-3 rounded-full bg-brand-subtext mr-1"></span>Original Pitch</span>
            <span><span className="inline-block w-3 h-3 rounded-full bg-brand-accent mr-1"></span>Corrected Pitch</span>
        </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-start pt-4">
            <ToggleSwitch
              id="autotune-enabled"
              label="Enable Real-time Autotune"
              checked={autotuneEnabled}
              onChange={onAutotuneEnabledChange}
              disabled={isAppBusy}
            />
            <Selector
              id="autotune-key"
              label="Musical Key"
              value={autotuneKey}
              options={MUSICAL_KEYS}
              onChange={(val: string) => onAutotuneKeyChange(val)}
              disabled={isAppBusy || !autotuneEnabled}
            />
            <Slider
              id="autotune-amount"
              label="Correction Amount"
              min={0}
              max={100}
              step={1}
              value={autotuneAmount}
              onChange={onAutotuneAmountChange}
              disabled={isAppBusy || !autotuneEnabled}
              displayValue={`${autotuneAmount}%`}
            />
        </div>
      </div>
    </div>
  );
};

export default AutotuneTab;