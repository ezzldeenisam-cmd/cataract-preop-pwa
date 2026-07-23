import { useEffect, useMemo, useState } from 'react';
import { IntakeForm } from './components/IntakeForm';
import { PlanView } from './components/PlanView';
import { RecordList } from './components/RecordList';
import { computePlan } from './rules/computePlan';
import type { PatientInput, PatientRecord } from './rules/types';
import { loadRecords, saveRecord } from './storage';
import './App.css';

const DEFAULT_INPUT: PatientInput = {
  name: '',
  eye: 'R',
  maturity: 'immature',
  macula: 'healthy',
  occupation: 'general',
  visualAcuity: '',
  diabetes: false,
  anticoag: false,
  htn: false,
  cardiac: false,
  pseudoexfoliation: false,
  prostateMedication: false,
  pupilDilation: 'good',
};

function App() {
  const [input, setInput] = useState<PatientInput>(DEFAULT_INPUT);
  const [records, setRecords] = useState<PatientRecord[]>([]);

  const plan = useMemo(() => computePlan(input), [input]);

  useEffect(() => {
    setRecords(loadRecords());
  }, []);

  function handleChange(patch: Partial<PatientInput>) {
    setInput((prev) => ({ ...prev, ...patch }));
  }

  function handleClear() {
    setInput(DEFAULT_INPUT);
  }

  function handleSave() {
    const record = saveRecord(input);
    setRecords((prev) => [record, ...prev]);
  }

  function handleSelectRecord(record: PatientRecord) {
    setInput(record);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Cataract Surgery Patient Prep</h1>
      </header>

      <main className="app-main">
        <IntakeForm input={input} onChange={handleChange} onClear={handleClear} onSave={handleSave} />

        <PlanView
          plan={plan}
          chosenLens={input.chosenLens}
          onChosenLensChange={(chosenLens) => handleChange({ chosenLens })}
        />

        <RecordList records={records} onSelect={handleSelectRecord} />
      </main>
    </div>
  );
}

export default App;
