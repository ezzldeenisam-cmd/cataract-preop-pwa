export type Eye = 'R' | 'L' | 'B';
export type Maturity = 'immature' | 'mature';
export type MaculaStatus = 'healthy' | 'diseased' | 'unknown';
export type Occupation = 'night_driver' | 'near_reading' | 'general';
export type PupilDilation = 'good' | 'poor';

export const CHOSEN_LENS_OPTIONS = [
  'Monofocal',
  'Monofocal toric',
  'EDOF',
  'EDOF toric',
  'Trifocal / Multifocal',
  'Trifocal / Multifocal toric',
] as const;
export type ChosenLens = (typeof CHOSEN_LENS_OPTIONS)[number];

export interface PatientInput {
  name?: string;
  eye: Eye;
  maturity: Maturity;
  macula: MaculaStatus;
  occupation: Occupation;
  visualAcuity?: string;
  diabetes: boolean;
  anticoag: boolean;
  htn: boolean;
  cardiac: boolean;
  pseudoexfoliation: boolean;
  prostateMedication: boolean;
  pupilDilation: PupilDilation;
  chosenLens?: ChosenLens;
  biometryImage?: string;
  refractionImage?: string;
}

export interface PatientRecord extends PatientInput {
  id: string;
  savedAt: number;
}

export interface Plan {
  tests: string[];
  hardStops: string[];
  softReminders: string[];
}
