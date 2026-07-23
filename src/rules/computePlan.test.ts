import { describe, expect, it } from 'vitest';
import { computeAstigmatism, computePlan } from './computePlan';
import type { PatientInput } from './types';

function baseInput(overrides: Partial<PatientInput> = {}): PatientInput {
  return {
    eye: 'R',
    maturity: 'immature',
    macula: 'healthy',
    occupation: 'general',
    diabetes: false,
    anticoag: false,
    htn: false,
    cardiac: false,
    pseudoexfoliation: false,
    prostateMedication: false,
    pupilDilation: 'good',
    ...overrides,
  };
}

describe('computeAstigmatism', () => {
  it('is the absolute difference between K1 and K2', () => {
    expect(computeAstigmatism({ k1: 44, k2: 42.5 })).toBeCloseTo(1.5);
    expect(computeAstigmatism({ k1: 42.5, k2: 44 })).toBeCloseTo(1.5);
  });

  it('is 0 when K1 or K2 is missing', () => {
    expect(computeAstigmatism({})).toBe(0);
    expect(computeAstigmatism({ k1: 44 })).toBe(0);
    expect(computeAstigmatism({ k2: 44 })).toBe(0);
  });
});

describe('computePlan', () => {
  it('immature cataract requires optical biometry, no hard stops', () => {
    const plan = computePlan(baseInput({ maturity: 'immature' }));
    expect(plan.tests).toContain('Optical biometry');
    expect(plan.hardStops).toHaveLength(0);
  });

  it('mature cataract, diabetic — requires ultrasound biometry, B-scan, HbA1c, and a hard stop', () => {
    const plan = computePlan(baseInput({ maturity: 'mature', diabetes: true }));
    expect(plan.tests).toContain('Ultrasound biometry');
    expect(plan.tests).toContain('B-scan');
    expect(plan.tests).toContain('HbA1c');
    expect(plan.hardStops.some((s) => s.includes('B-scan'))).toBe(true);
  });

  it('uncontrolled HTN + on anticoagulant, immature', () => {
    const plan = computePlan(baseInput({ htn: true, anticoag: true, maturity: 'immature' }));
    expect(plan.hardStops).toHaveLength(2);
    expect(plan.tests).toContain('Coagulation profile');
  });

  it('never includes a computed IOL power value in the plan', () => {
    const plan = computePlan(baseInput());
    expect(Object.keys(plan).some((key) => /power/i.test(key))).toBe(false);
  });

  it('never ranks or suggests a lens type — the doctor chooses directly', () => {
    const plan = computePlan(baseInput());
    expect(plan).not.toHaveProperty('lenses');
  });

  it('always includes viral screen, RBS, and CBC', () => {
    const plan = computePlan(baseInput());
    expect(plan.tests).toContain('Viral screen');
    expect(plan.tests).toContain('Random blood sugar (RBS)');
    expect(plan.tests).toContain('CBC');
  });

  it('cardiac disease adds cardiology clearance test', () => {
    const plan = computePlan(baseInput({ cardiac: true }));
    expect(plan.tests).toContain('Cardiology clearance');
  });

  it('always includes the two baseline soft reminders', () => {
    const plan = computePlan(baseInput());
    expect(plan.softReminders).toHaveLength(2);
  });

  it('pseudoexfoliation adds a CTR reminder', () => {
    const plan = computePlan(baseInput({ pseudoexfoliation: true }));
    expect(plan.softReminders.some((r) => r.includes('CTR'))).toBe(true);
  });

  it('poor pupil dilation adds an iris hooks reminder', () => {
    const plan = computePlan(baseInput({ pupilDilation: 'poor' }));
    expect(plan.softReminders.some((r) => r.includes('iris hooks'))).toBe(true);
  });

  it('unknown macula status adds a confirm-before-finalizing reminder', () => {
    const plan = computePlan(baseInput({ macula: 'unknown' }));
    expect(plan.softReminders.some((r) => r.includes('unknown'))).toBe(true);
  });

  it('good pupil dilation, known healthy macula, and no pseudoexfoliation keep only the baseline reminders', () => {
    const plan = computePlan(baseInput({ pseudoexfoliation: false, pupilDilation: 'good', macula: 'healthy' }));
    expect(plan.softReminders).toHaveLength(2);
  });

  it('prostate medication adds an IFIS risk reminder', () => {
    const plan = computePlan(baseInput({ prostateMedication: true }));
    expect(plan.softReminders.some((r) => r.includes('IFIS'))).toBe(true);
  });
});
