
import React, { useState, useEffect } from 'react';
import { Preset } from '../types';
import TextInput from './TextInput';

const SaveIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>;
const LoadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

interface PresetManagerProps {
  presets: Preset[];
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
  disabled: boolean;
}

const PresetManager: React.FC<PresetManagerProps> = ({ presets, onSave, onLoad, onDelete, disabled }) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    const trimmedName = newPresetName.trim();
    if (!trimmedName) {
        setNameError(undefined);
        return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 30) {
        setNameError('Name must be 2-30 characters.');
    } else if (!/^[a-zA-Z0-9 _-]+$/.test(trimmedName)) {
        setNameError('Invalid characters in name.');
    } else if (presets.some(p => p.name.toLowerCase() === trimmedName.toLowerCase())) {
        setNameError('A preset with this name already exists.');
    } else {
        setNameError(undefined);
    }
  }, [newPresetName, presets]);


  const handleSaveClick = () => {
    onSave(newPresetName.trim());
    setNewPresetName('');
  };

  const handleLoadClick = () => {
    if (selectedPreset) {
      onLoad(selectedPreset);
    }
  };

  const handleDeleteClick = () => {
    if (selectedPreset) {
      onDelete(selectedPreset);
      setSelectedPreset(''); // Reset selection after deletion
    }
  };

  return (
    <div>
      <h3 className="text-lg sm:text-xl font-semibold mb-4 text-brand-text">Preset Manager</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Save Section */}
        <div className="flex flex-col gap-3 border border-brand-accent/20 bg-brand-accent/5 p-3 rounded-lg">
            <h4 className="text-sm font-semibold text-brand-accent uppercase tracking-wider">Save New</h4>
            <div className="flex flex-col gap-2">
                 <TextInput
                    id="preset-name"
                    label="Name"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="My Custom Preset"
                    disabled={disabled}
                    error={nameError}
                    maxLength={30}
                />
                <button
                    onClick={handleSaveClick}
                    disabled={disabled || !newPresetName.trim() || !!nameError}
                    className="w-full flex items-center justify-center space-x-2 bg-brand-accent hover:bg-opacity-90 disabled:bg-brand-secondary disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                    title="Save Preset"
                >
                    <SaveIcon />
                    <span>Save Preset</span>
                </button>
            </div>
        </div>

        {/* Load/Delete Section */}
        <div className="flex flex-col gap-3 border border-brand-secondary bg-brand-secondary/30 p-3 rounded-lg">
             <h4 className="text-sm font-semibold text-brand-subtext uppercase tracking-wider">Manage Existing</h4>
             <div className="flex flex-col gap-2">
                <div className="flex flex-col space-y-1 w-full">
                    <label htmlFor="preset-selector" className="text-xs sm:text-sm font-medium text-brand-subtext">Select Preset</label>
                    <select
                        id="preset-selector"
                        value={selectedPreset}
                        onChange={(e) => setSelectedPreset(e.target.value)}
                        disabled={disabled || presets.length === 0}
                        className="w-full bg-brand-secondary border-brand-secondary text-brand-text text-sm sm:text-base rounded-lg p-2.5 focus:ring-brand-accent focus:border-brand-accent transition-colors disabled:opacity-50"
                    >
                        <option value="">{presets.length > 0 ? 'Select a preset...' : 'No presets saved'}</option>
                        {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleLoadClick}
                        disabled={disabled || !selectedPreset}
                        className="flex-grow flex items-center justify-center space-x-2 bg-brand-secondary hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-colors"
                        title="Load Preset"
                    >
                        <LoadIcon />
                        <span>Load</span>
                    </button>
                     <button
                        onClick={handleDeleteClick}
                        disabled={disabled || !selectedPreset}
                        className="flex items-center justify-center bg-red-900/40 hover:bg-red-600 border border-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold p-2.5 rounded-lg text-sm transition-colors"
                        title="Delete Preset"
                    >
                        <TrashIcon />
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PresetManager;