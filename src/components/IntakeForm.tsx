import { useState } from 'react';
import { compressImageToDataUrl } from '../image';
import { computeAstigmatism } from '../rules/computePlan';
import type { Eye, Maturity, MaculaStatus, Occupation, PatientInput, PupilDilation } from '../rules/types';
import { ScanButton, type ScanStatus } from './ScanButton';
import { SegmentedControl } from './SegmentedControl';

interface IntakeFormProps {
  input: PatientInput;
  onChange: (patch: Partial<PatientInput>) => void;
  onGenerate: () => void;
  onClear: () => void;
  onSave: () => void;
}

const EYE_OPTIONS: { value: Eye; label: string }[] = [
  { value: 'R', label: 'Right' },
  { value: 'L', label: 'Left' },
  { value: 'B', label: 'Both' },
];

const MATURITY_OPTIONS: { value: Maturity; label: string }[] = [
  { value: 'immature', label: 'Immature' },
  { value: 'mature', label: 'Mature' },
];

const MACULA_OPTIONS: { value: MaculaStatus; label: string }[] = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'diseased', label: 'Diseased' },
  { value: 'unknown', label: 'Unknown' },
];

const OCCUPATION_OPTIONS: { value: Occupation; label: string }[] = [
  { value: 'night_driver', label: 'Night driver' },
  { value: 'near_reading', label: 'Near reading' },
  { value: 'general', label: 'General' },
];

const PUPIL_DILATION_OPTIONS: { value: PupilDilation; label: string }[] = [
  { value: 'good', label: 'Good' },
  { value: 'poor', label: 'Poor' },
];

export function IntakeForm({ input, onChange, onGenerate, onClear, onSave }: IntakeFormProps) {
  const [biometryPhotoStatus, setBiometryPhotoStatus] = useState<ScanStatus>('idle');
  const [biometryPhotoError, setBiometryPhotoError] = useState<string>();
  const [refractionPhotoStatus, setRefractionPhotoStatus] = useState<ScanStatus>('idle');
  const [refractionPhotoError, setRefractionPhotoError] = useState<string>();

  async function handleAttachBiometryPhoto(file: File) {
    setBiometryPhotoStatus('scanning');
    try {
      const imageDataUrl = await compressImageToDataUrl(file);
      onChange({ biometryImage: imageDataUrl });
      setBiometryPhotoStatus('done');
    } catch (err) {
      setBiometryPhotoError(err instanceof Error ? err.message : undefined);
      setBiometryPhotoStatus('error');
    }
  }

  async function handleAttachRefractionPhoto(file: File) {
    setRefractionPhotoStatus('scanning');
    try {
      const imageDataUrl = await compressImageToDataUrl(file);
      onChange({ refractionImage: imageDataUrl });
      setRefractionPhotoStatus('done');
    } catch (err) {
      setRefractionPhotoError(err instanceof Error ? err.message : undefined);
      setRefractionPhotoStatus('error');
    }
  }

  function numberField(key: keyof PatientInput, label: string) {
    const value = input[key];
    return (
      <label className="mini-field">
        <span>{label}</span>
        <input
          type="number"
          step="0.01"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange({ [key]: e.target.value === '' ? undefined : Number(e.target.value) })}
        />
      </label>
    );
  }

  return (
    <section className="card">
      <div className="field">
        <label htmlFor="patient-name">Patient Name or ID</label>
        <input
          id="patient-name"
          type="text"
          value={input.name ?? ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Optional"
        />
      </div>

      <div className="field">
        <label>Eye</label>
        <SegmentedControl value={input.eye} options={EYE_OPTIONS} onChange={(eye) => onChange({ eye })} />
      </div>

      <div className="field">
        <label htmlFor="visual-acuity">Visual Acuity</label>
        <input
          id="visual-acuity"
          type="text"
          value={input.visualAcuity ?? ''}
          onChange={(e) => onChange({ visualAcuity: e.target.value })}
          placeholder="e.g. 6/9, 20/40, CF"
        />
      </div>

      <div className="field">
        <label>Cataract Maturity</label>
        <SegmentedControl
          value={input.maturity}
          options={MATURITY_OPTIONS}
          onChange={(maturity) => onChange({ maturity })}
        />
      </div>

      <div className="field">
        <label>Retina / Macula Status</label>
        <SegmentedControl
          value={input.macula}
          options={MACULA_OPTIONS}
          onChange={(macula) => onChange({ macula })}
        />
      </div>

      <div className="field">
        <label>Biometry (from device photo)</label>
        <div className="mini-fields">
          {numberField('axialLength', 'AL (mm)')}
          {numberField('acDepth', 'ACD (mm)')}
          {numberField('k1', 'K1 (D)')}
          {numberField('k2', 'K2 (D)')}
        </div>
        <p className="derived-value">
          Astigmatism (K1 − K2): {computeAstigmatism(input).toFixed(2)} D
        </p>
        <ScanButton
          label="Add Biometry Photo"
          busyLabel="Attaching…"
          status={biometryPhotoStatus}
          errorMessage={biometryPhotoError}
          onFile={handleAttachBiometryPhoto}
        />
        {input.biometryImage && (
          <div className="photo-preview">
            <img src={input.biometryImage} alt="Biometry sheet" />
            <button type="button" className="btn-link" onClick={() => onChange({ biometryImage: undefined })}>
              Remove photo
            </button>
          </div>
        )}
      </div>

      <div className="field">
        <label>Refraction (from device photo)</label>
        <ScanButton
          label="Add Refraction Photo"
          busyLabel="Attaching…"
          status={refractionPhotoStatus}
          errorMessage={refractionPhotoError}
          onFile={handleAttachRefractionPhoto}
        />
        {input.refractionImage && (
          <div className="photo-preview">
            <img src={input.refractionImage} alt="Refraction sheet" />
            <button type="button" className="btn-link" onClick={() => onChange({ refractionImage: undefined })}>
              Remove photo
            </button>
          </div>
        )}
      </div>

      <div className="field">
        <label>Pupil Dilation</label>
        <SegmentedControl
          value={input.pupilDilation}
          options={PUPIL_DILATION_OPTIONS}
          onChange={(pupilDilation) => onChange({ pupilDilation })}
        />
      </div>

      <div className="field">
        <label>Patient Occupation</label>
        <SegmentedControl
          value={input.occupation}
          options={OCCUPATION_OPTIONS}
          onChange={(occupation) => onChange({ occupation })}
        />
      </div>

      <div className="field">
        <label>Chronic Conditions</label>
        <div className="checkbox-group">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={input.diabetes}
              onChange={(e) => onChange({ diabetes: e.target.checked })}
            />
            Diabetes
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={input.anticoag}
              onChange={(e) => onChange({ anticoag: e.target.checked })}
            />
            Anticoagulant / antiplatelet
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={input.htn} onChange={(e) => onChange({ htn: e.target.checked })} />
            Uncontrolled hypertension
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={input.cardiac}
              onChange={(e) => onChange({ cardiac: e.target.checked })}
            />
            Cardiac disease
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={input.pseudoexfoliation}
              onChange={(e) => onChange({ pseudoexfoliation: e.target.checked })}
            />
            Pseudoexfoliation (PXF)
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={input.prostateMedication}
              onChange={(e) => onChange({ prostateMedication: e.target.checked })}
            />
            Prostate disease drug (alpha-blocker, e.g. Tamsulosin/Flomax)
          </label>
        </div>
      </div>

      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={onGenerate}>
          Generate Plan
        </button>
        <button type="button" className="btn btn-secondary" onClick={onSave}>
          Save Patient to Record
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClear}>
          Clear
        </button>
      </div>
    </section>
  );
}
