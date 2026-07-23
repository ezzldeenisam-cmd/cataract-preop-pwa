import { CHOSEN_LENS_OPTIONS, type ChosenLens, type Plan } from '../rules/types';

interface PlanViewProps {
  plan: Plan;
  chosenLens?: ChosenLens;
  onChosenLensChange: (value: ChosenLens | undefined) => void;
}

export function PlanView({ plan, chosenLens, onChosenLensChange }: PlanViewProps) {
  const isReady = plan.hardStops.length === 0;

  return (
    <section className="card plan">
      <div className={`ready-badge ${isReady ? 'ready-yes' : 'ready-no'}`}>
        {isReady ? 'Ready for Surgery' : 'Not Ready for Surgery'}
      </div>

      {plan.hardStops.length > 0 && (
        <div className="section hard-stops">
          <h2>Hard Stops</h2>
          <ul>
            {plan.hardStops.map((stop, i) => (
              <li key={i}>{stop}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="section tests">
        <h2>Required Tests</h2>
        <ul className="checklist">
          {plan.tests.map((test, i) => (
            <li key={i}>
              <label className="checkbox">
                <input type="checkbox" />
                {test}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="section chosen-lens">
        <h2>Lens Chosen</h2>
        <select
          value={chosenLens ?? ''}
          onChange={(e) => onChosenLensChange(e.target.value ? (e.target.value as ChosenLens) : undefined)}
        >
          <option value="">Not yet decided</option>
          {CHOSEN_LENS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="section reminders">
        <h2>Reminders</h2>
        <ul>
          {plan.softReminders.map((reminder, i) => (
            <li key={i}>{reminder}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
