import { useState, useCallback } from 'react';
import type { PlanInputs, WeekPlan, RaceDistance, ExperienceLevel, LongRunDay } from './types';
import { generatePlan } from './lib/generatePlan';
import { GoalDatePicker } from './components/GoalDatePicker';
import { FormSelect } from './components/FormSelect';
import './App.css';

type PlanView = 'cards' | 'table';

const RACE_DISTANCE_OPTIONS = [
  { value: '5K', label: '5K' },
  { value: '10K', label: '10K' },
  { value: 'Half', label: 'Half' },
  { value: 'Marathon', label: 'Marathon' },
] as const;

const EXPERIENCE_LEVEL_OPTIONS = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
] as const;

const RUNS_PER_WEEK_OPTIONS = [
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
] as const;

const LONG_RUN_DAY_OPTIONS = [
  { value: 'Saturday', label: 'Saturday' },
  { value: 'Sunday', label: 'Sunday' },
] as const;

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
  const [planView, setPlanView] = useState<PlanView>('cards');

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
          <FormSelect
            id="raceDistance"
            value={inputs.raceDistance}
            onValueChange={(v) => handleInputChange('raceDistance', v as RaceDistance)}
            options={[...RACE_DISTANCE_OPTIONS]}
          />
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
          <FormSelect
            id="experienceLevel"
            value={inputs.experienceLevel}
            onValueChange={(v) => handleInputChange('experienceLevel', v as ExperienceLevel)}
            options={[...EXPERIENCE_LEVEL_OPTIONS]}
          />
        </div>

        <div className="form-row">
          <label htmlFor="runsPerWeek">Runs per week</label>
          <FormSelect
            id="runsPerWeek"
            value={String(inputs.runsPerWeek)}
            onValueChange={(v) => handleInputChange('runsPerWeek', Number(v))}
            options={[...RUNS_PER_WEEK_OPTIONS]}
          />
        </div>

        <div className="form-row">
          <label htmlFor="longRunDay">Long run day</label>
          <FormSelect
            id="longRunDay"
            value={inputs.longRunDay}
            onValueChange={(v) => handleInputChange('longRunDay', v as LongRunDay)}
            options={[...LONG_RUN_DAY_OPTIONS]}
          />
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
            <div className="plan-summary-top">
              <h2>Plan summary</h2>
              <div className="view-toggle" role="radiogroup" aria-label="Plan view">
                <button
                  type="button"
                  role="radio"
                  aria-checked={planView === 'cards'}
                  className={`view-toggle-btn${planView === 'cards' ? ' active' : ''}`}
                  onClick={() => setPlanView('cards')}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                    <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Cards
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={planView === 'table'}
                  className={`view-toggle-btn${planView === 'table' ? ' active' : ''}`}
                  onClick={() => setPlanView('table')}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <line x1="1" y1="3" x2="15" y2="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="1" y1="13" x2="15" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  Table
                </button>
              </div>
            </div>
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

          {planView === 'cards' ? (
            <div className="plan-cards">
              {plan.map((week) => (
                <div className="week-card" key={week.weekNumber}>
                  <div className="week-card-header">
                    <div className="week-card-title">
                      <span className="week-card-number">Week {week.weekNumber}</span>
                      <span className={`week-phase week-phase--${week.phase.toLowerCase()}`}>
                        {week.phase}
                      </span>
                    </div>
                    <span className="week-card-total">{week.totalMileageKm} km</span>
                  </div>
                  <div className="week-days-grid">
                    {week.days.map((day) => (
                      <div
                        className={`day-chip day-chip--${day.workoutType.toLowerCase()}`}
                        key={day.weekday}
                      >
                        <span className="day-chip-label">{day.weekday}</span>
                        {day.workoutType === 'Rest' ? (
                          <span className="day-chip-type">Rest</span>
                        ) : (
                          <>
                            <span className="day-chip-type">{day.workoutType}</span>
                            <span className="day-chip-distance">{day.distanceKm} km</span>
                            {day.workoutNote && (
                              <span className="day-chip-note">{day.workoutNote}</span>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
                      <td className="week-cell">
                        {week.weekNumber}
                        <span className={`week-phase week-phase--${week.phase.toLowerCase()}`}>
                          {week.phase}
                        </span>
                      </td>
                      {week.days.map((day) => (
                        <td
                          key={day.weekday}
                          className={
                            day.workoutType === 'Rest' ? 'rest-cell' : 'workout-cell'
                          }
                        >
                          {day.workoutType === 'Rest'
                            ? 'Rest'
                            : (
                              <>
                                {day.workoutType} {day.distanceKm} km
                                {day.workoutType === 'Workout' && day.workoutNote && (
                                  <>
                                    <br />
                                    <span className="workout-note">{day.workoutNote}</span>
                                  </>
                                )}
                              </>
                            )}
                        </td>
                      ))}
                      <td className="total-cell">{week.totalMileageKm} km</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default App;
