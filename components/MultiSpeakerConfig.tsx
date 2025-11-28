
import React from 'react';
import { SpeakerConfig, BaseVoice } from '../types';
import { VOICES } from '../constants';
import Selector from './Selector';
import TextInput from './TextInput';

interface MultiSpeakerConfigProps {
  speakers: SpeakerConfig[];
  onChange: (index: number, field: 'speaker' | 'voice', value: string) => void;
  disabled: boolean;
  errors: (string | undefined)[];
}

const MultiSpeakerConfig: React.FC<MultiSpeakerConfigProps> = ({ speakers, onChange, disabled, errors }) => {
  return (
    <div className="space-y-4 bg-brand-primary p-3 rounded-lg">
      <p className="text-xs sm:text-sm text-brand-subtext">Define the two speakers for the conversation.</p>
      {speakers.map((speaker, index) => (
        <div key={index} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2 border border-brand-secondary rounded-md">
          <TextInput
            id={`speaker-name-${index}`}
            label={`Speaker ${index + 1} Name`}
            value={speaker.speaker}
            onChange={(e) => onChange(index, 'speaker', e.target.value)}
            placeholder={`e.g., Joe`}
            disabled={disabled}
            maxLength={20}
            error={errors[index]}
          />
          <Selector
            id={`speaker-voice-${index}`}
            label={`Speaker ${index + 1} Voice`}
            value={speaker.voice}
            options={VOICES}
            onChange={(val) => onChange(index, 'voice', val as BaseVoice)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
};

export default MultiSpeakerConfig;