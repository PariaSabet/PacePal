import { useState, useCallback } from 'react';
import type { PlanInputs, WeekPlan, RaceDistance, ExperienceLevel, LongRunDay } from './types';
import { generatePlan } from './lib/generatePlan';
import { GoalDatePicker } from './components/GoalDatePicker';
import './App.css';

const RACE_DISTANCES: RaceDistance[] = ['5K', '10K', 'Half', 'Marathon'];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const RUNS_PER_WEEK_OPTIONS = [3, 4, 5, 6] as const;
const LONG_RUN_DAYS: LongRunDay[] = ['Saturday', 'Sunday'];

const DEFAULT_INPUTS: PlanInputs = {
  raceDistance: '5K',
  goalDate: '',
  experienceLevel: 'Beginner',
  runsPerWeek: 4,
  longRunDay: 'Sunday',
};

const LOADING_DELAY_MS = 300;

function isGoalDateValid(dateStr: string): boolean {
  if (!dateStr) return false;
  const goal = new Date(dateStr);
  goal.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return goal > today;
}

function App() {
  const [inputs, setInputs] = useState<PlanInputs>(DEFAULT_INPUTS);
  const [plan, setPlan] = useState<WeekPlan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const handleInputChange = useCallback(
    (field: keyof PlanInputs, value: string | number) => {
      setInputs((prev) => ({ ...prev, [field]: value }));
      if (field === 'goalDate') {
        setDateError(null);
      }
    },
    []
  );

  const runGenerate = useCallback(() => {
    if (!isGoalDateValid(inputs.goalDate)) {
      setDateError('Goal date must be in the future.');
      return;
    }
    setDateError(null);
    setLoading(true);
    setTimeout(() => {
      const result = generatePlan(inputs);
      setPlan(result);
      setLoading(false);
    }, LOADING_DELAY_MS);
  }, [inputs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runGenerate();
  };

  const peakMileage = plan?.length
    ? Math.max(...plan.map((w) => w.totalMileageKm))
    : null;

  return (
    <div className="app">
      <header className="header">
        <h1>PacePal</h1>
        <p className="tagline">Running training plan generator</p>
        <div className="header-accent" aria-hidden />
      </header>

      <form onSubmit={handleSubmit} className="form">
        <div className="form-row">
          <label htmlFor="raceDistance">Race distance</label>
          <select
            id="raceDistance"
            value={inputs.raceDistance}
            onChange={(e) => handleInputChange('raceDistance', e.target.value as RaceDistance)}
          >
            {RACE_DISTANCES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="goalDate">Goal date</label>
          <GoalDatePicker
            id="goalDate"
            value={inputs.goalDate}
            onChange={(value) => handleInputChange('goalDate', value)}
            ariaInvalid={!!dateError}
            ariaDescribedBy={dateError ? 'goalDateError' : undefined}
          />
          {dateError && (
            <span id="goalDateError" className="form-error" role="alert">
              {dateError}
            </span>
          )}
        </div>

        <div className="form-row">
          <label htmlFor="experienceLevel">Experience level</label>
          <select
            id="experienceLevel"
            value={inputs.experienceLevel}
            onChange={(e) =>
              handleInputChange('experienceLevel', e.target.value as ExperienceLevel)
            }
          >
            {EXPERIENCE_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="runsPerWeek">Runs per week</label>
          <select
            id="runsPerWeek"
            value={inputs.runsPerWeek}
            onChange={(e) => handleInputChange('runsPerWeek', Number(e.target.value))}
          >
            {RUNS_PER_WEEK_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label htmlFor="longRunDay">Long run day</label>
          <select
            id="longRunDay"
            value={inputs.longRunDay}
            onChange={(e) => handleInputChange('longRunDay', e.target.value as LongRunDay)}
          >
            {LONG_RUN_DAYS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Generating…' : 'Generate plan'}
          </button>
        </div>
      </form>

      {loading && (
        <div className="loading" role="status" aria-live="polite">
          <div className="loading-spinner" aria-hidden />
          <span>Generating your plan…</span>
        </div>
      )}

      {!loading && plan === null && (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden>🏃</div>
          <p>Fill the form above to generate your personalized training plan.</p>
        </div>
      )}

      {!loading && plan && plan.length > 0 && (
        <section className="plan-section" aria-label="Training plan">
          <div className="plan-summary">
            <h2>Plan summary</h2>
            <ul>
              <li>Total weeks: {plan.length}</li>
              <li>Runs per week: {inputs.runsPerWeek}</li>
              <li>Starting weekly mileage: {plan[0].totalMileageKm} km</li>
              <li>Peak weekly mileage: {peakMileage} km</li>
            </ul>
            <button type="button" className="regenerate" onClick={runGenerate}>
              Regenerate
            </button>
          </div>

          <div className="plan-table-wrap">
            <table className="plan-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Mon</th>
                  <th>Tue</th>
                  <th>Wed</th>
                  <th>Thu</th>
                  <th>Fri</th>
                  <th>Sat</th>
                  <th>Sun</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((week) => (
                  <tr key={week.weekNumber}>
                    <td className="week-cell">{week.weekNumber}</td>
                    {week.days.map((day) => (
                      <td
                        key={day.weekday}
                        className={
                          day.workoutType === 'Rest' ? 'rest-cell' : 'workout-cell'
                        }
                      >
                        {day.workoutType === 'Rest'
                          ? 'Rest'
                          : `${day.workoutType} ${day.distanceKm} km`}
                      </td>
                    ))}
                    <td className="total-cell">{week.totalMileageKm} km</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
