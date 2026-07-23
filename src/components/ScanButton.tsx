import { useRef } from 'react';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

interface ScanButtonProps {
  label: string;
  busyLabel: string;
  status: ScanStatus;
  errorMessage?: string;
  onFile: (file: File) => void;
}

export function ScanButton({ label, busyLabel, status, errorMessage, onFile }: ScanButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="scan-row">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="scan-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        className="btn btn-scan"
        disabled={status === 'scanning'}
        onClick={() => inputRef.current?.click()}
      >
        {status === 'scanning' ? busyLabel : label}
      </button>
      {status === 'done' && <span className="scan-status scan-status-done">Filled from photo</span>}
      {status === 'error' && (
        <span className="scan-status scan-status-error">{errorMessage || 'Could not read photo — enter manually'}</span>
      )}
    </div>
  );
}
