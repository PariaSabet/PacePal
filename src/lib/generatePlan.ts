import type { PlanInputs, WeekPlan, DayPlan, WorkoutType } from '../types';
import { getWeekTemplate, STARTING_MILEAGE_KM, WEEKDAY_SHORT, MAX_RUN_KM_BY_RACE } from '../types';

const MAX_LONG_RUN_KM_BY_RACE = {
  '5K': 10,
  '10K': 16,
  Half: 22,
  Marathon: 32,
} as const;

const MILEAGE_INCREASE_PCT = 0.07;
const CUTBACK_MULTIPLIER = 0.8;
const CUTBACK_EVERY_N_WEEKS = 4;

function roundToHalf(km: number): number {
  return Math.round(km * 2) / 2;
}

function weeksBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(days / 7));
}

/**
 * Distribute weekly mileage across run days according to template.
 * Long = 35%, Workout = 25%, remaining to Easy days.
 * Long runs use race-specific caps (e.g. 5K → up to 10km); Easy/Workout stay moderate.
 */
function distributeMileage(
  template: WorkoutType[],
  totalKm: number,
  maxLongKm: number,
  maxWorkoutKm: number,
  maxEasyKm: number
): { type: WorkoutType; km: number }[] {
  const easyCount = template.filter((t) => t === 'Easy').length;

  const longKm = Math.min(totalKm * 0.35, maxLongKm);
  const workoutKm = Math.min(totalKm * 0.25, maxWorkoutKm);
  const remainingKm = totalKm - longKm - workoutKm;
  const easyKmEach = easyCount > 0 ? Math.min(remainingKm / easyCount, maxEasyKm) : 0;

  return template.map((type) => {
    if (type === 'Rest') return { type: 'Rest' as const, km: 0 };
    if (type === 'Long') return { type: 'Long', km: roundToHalf(longKm) };
    if (type === 'Workout') return { type: 'Workout', km: roundToHalf(workoutKm) };
    return { type: 'Easy', km: roundToHalf(easyKmEach) };
  });
}

/**
 * Generates a full training plan from the user's inputs.
 */
export function generatePlan(inputs: PlanInputs): WeekPlan[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const goalDate = new Date(inputs.goalDate);
  goalDate.setHours(0, 0, 0, 0);

  const numWeeks = weeksBetween(today, goalDate);
  const template = getWeekTemplate(inputs.runsPerWeek, inputs.longRunDay);
  let weeklyKm = STARTING_MILEAGE_KM[inputs.experienceLevel];

  const plans: WeekPlan[] = [];

  const maxLongKm = MAX_LONG_RUN_KM_BY_RACE[inputs.raceDistance];
  const maxRunKm = MAX_RUN_KM_BY_RACE[inputs.raceDistance];
  const easyCount = template.filter((t) => t === 'Easy').length;
  const feasibleMax =
    maxLongKm + maxRunKm + easyCount * maxRunKm;

  for (let w = 0; w < numWeeks; w++) {
    const isCutback = (w + 1) % CUTBACK_EVERY_N_WEEKS === 0;
    const taperMultiplier =
      numWeeks >= 6 && w === numWeeks - 2 ? 0.8 :
      w === numWeeks - 1 ? 0.6 :
      1;
    let weekTotal = weeklyKm * (isCutback ? CUTBACK_MULTIPLIER : 1) * taperMultiplier;
    if (weekTotal > feasibleMax) {
      weekTotal = feasibleMax;
    }
    const distributed = distributeMileage(template, weekTotal, maxLongKm, maxRunKm, maxRunKm);

    const days: DayPlan[] = distributed.map((d, i) => ({
      weekday: WEEKDAY_SHORT[i],
      workoutType: d.type,
      ...(d.type !== 'Rest' && { distanceKm: d.km }),
    }));

    const actualTotal = distributed.reduce((sum, d) => sum + d.km, 0);

    plans.push({
      weekNumber: w + 1,
      days,
      totalMileageKm: roundToHalf(actualTotal),
    });

    if (!isCutback) {
      weeklyKm = Math.min(weeklyKm * (1 + MILEAGE_INCREASE_PCT), feasibleMax);
    }
  }

  return plans;
}
