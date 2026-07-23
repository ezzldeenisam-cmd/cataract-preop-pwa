import type { PatientInput, Plan } from './types';

function computeTests(input: PatientInput): string[] {
  const tests: string[] = ['Viral screen', 'Random blood sugar (RBS)', 'CBC'];

  if (input.maturity === 'immature') {
    tests.push('Optical biometry');
  } else {
    tests.push('Ultrasound biometry', 'B-scan');
  }

  if (input.diabetes) {
    tests.push('HbA1c', 'Glycemic control');
  }
  if (input.anticoag) {
    tests.push('Coagulation profile');
  }
  if (input.cardiac) {
    tests.push('Cardiology clearance');
  }

  return tests;
}

function computeHardStops(input: PatientInput): string[] {
  const hardStops: string[] = [];

  if (input.maturity === 'mature') {
    hardStops.push(
      'B-scan mandatory before surgery, to rule out posterior-segment pathology (retinal detachment or mass) behind the dense cataract'
    );
  }
  if (input.htn) {
    hardStops.push('Postpone surgery until blood pressure is controlled');
  }
  if (input.anticoag) {
    hardStops.push('Stop/bridge decision required for the anticoagulant before surgery');
  }

  return hardStops;
}

function computeSoftReminders(input: PatientInput): string[] {
  const reminders: string[] = [
    'Discuss lens type with the patient before deciding',
    'IOL power comes from the biometry device — not computed here',
  ];

  if (input.pseudoexfoliation) {
    reminders.push('Zonular weakness risk (pseudoexfoliation) — prepare a capsular tension ring (CTR)');
  }
  if (input.pupilDilation === 'poor') {
    reminders.push('Small pupil — prepare iris hooks');
  }
  if (input.prostateMedication) {
    reminders.push('IFIS risk (alpha-blocker for prostate disease) — prepare iris hooks / pupil expansion device');
  }
  if (input.macula === 'unknown') {
    reminders.push('Retina/macula status unknown — confirm before finalizing lens choice');
  }

  return reminders;
}

export function computePlan(input: PatientInput): Plan {
  return {
    tests: computeTests(input),
    hardStops: computeHardStops(input),
    softReminders: computeSoftReminders(input),
  };
}
