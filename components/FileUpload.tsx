
import React from 'react';

interface FileUploadProps {
  id: string;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
  accept: string;
  error: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ id, label, onChange, disabled, accept, error }) => {
  return (
    <div>
      <label htmlFor={id} className="text-xs sm:text-sm font-medium text-brand-subtext mb-1 block">
        {label}
      </label>
      <input
        id={id}
        type="file"
        accept={accept}
        onChange={onChange}
        className="w-full text-xs sm:text-sm text-brand-subtext file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-brand-accent file:text-white hover:file:bg-opacity-80 disabled:opacity-50"
        disabled={disabled}
      />
      {error && <p className="text-red-400 text-xs sm:text-sm mt-1">{error}</p>}
    </div>
  );
};

export default FileUpload;