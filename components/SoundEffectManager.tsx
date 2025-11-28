

import React from 'react';
import { SoundEffect } from '../types';
import { SOUND_EFFECTS } from '../constants';
import Selector from './Selector';
import FileUpload from './FileUpload';

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);

interface SoundEffectManagerProps {
    selectedEffect: string;
    onSelectEffect: (effectName: string) => void;
    customEffects: SoundEffect[];
    onUploadEffect: (file: File) => void;
    onDeleteEffect: (effectName: string) => void;
    disabled: boolean;
}

const SoundEffectManager: React.FC<SoundEffectManagerProps> = ({
    selectedEffect,
    onSelectEffect,
    customEffects,
    onUploadEffect,
    onDeleteEffect,
    disabled
}) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUploadEffect(file);
        }
        // Clear the input value to allow uploading the same file again
        event.target.value = '';
    };

    const effectOptions = [
        { label: "Pre-built Effects", options: SOUND_EFFECTS.map(ef => ({ value: ef.value, label: ef.label })) },
        { label: "Custom Effects", options: customEffects.map(ef => ({ value: ef.name, label: ef.name })) }
    ];

    return (
        <div className="bg-brand-primary p-4 rounded-lg space-y-4">
            <h4 className="font-semibold text-lg sm:text-xl border-b border-brand-secondary pb-2">Sound Effects</h4>
            <p className="text-sm text-brand-subtext">Apply a convolution reverb effect to your voice. Upload an audio file (WAV/MP3) to use as a custom impulse response.</p>
            <Selector
                id="sound-effect-selector"
                label="Active Effect"
                value={selectedEffect}
                options={effectOptions}
                onChange={onSelectEffect}
                disabled={disabled}
            />
            <FileUpload
                id="sound-effect-upload"
                label="Upload Custom Effect"
                onChange={handleFileChange}
                disabled={disabled}
                accept="audio/wav,audio/mpeg"
                error={null}
            />

            {customEffects.length > 0 && (
                <div>
                    <h5 className="text-sm font-medium text-brand-subtext mb-2">My Custom Effects</h5>
                    <ul className="space-y-2">
                        {customEffects.map(effect => (
                            <li key={effect.name} className="flex items-center justify-between bg-brand-secondary p-2 rounded-md">
                                <span className="text-sm">{effect.name}</span>
                                <button
                                    onClick={() => onDeleteEffect(effect.name)}
                                    disabled={disabled}
                                    className="p-1 text-red-400 hover:text-red-300 disabled:opacity-50"
                                    title={`Delete ${effect.name}`}
                                >
                                    <TrashIcon />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SoundEffectManager;