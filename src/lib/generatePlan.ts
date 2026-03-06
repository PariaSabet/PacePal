import type { PlanInputs, WeekPlan, DayPlan, WorkoutType, RaceDistance, ExperienceLevel } from '../types';
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
const MAX_GROWTH_PCT = 0.12; // cap on growth rate to avoid excessive jumps

/** Target peak weekly km by race distance and experience – ensures plan progresses toward goal */
const TARGET_PEAK_KM: Record<RaceDistance, Record<ExperienceLevel, number>> = {
  '5K': { Beginner: 35, Intermediate: 45, Advanced: 55 },
  '10K': { Beginner: 45, Intermediate: 55, Advanced: 70 },
  Half: { Beginner: 55, Intermediate: 70, Advanced: 85 },
  Marathon: { Beginner: 65, Intermediate: 80, Advanced: 100 },
};

function roundToHalf(km: number): number {
  return Math.round(km * 2) / 2;
}

/**
 * Returns a structured workout description for Workout days, varying by week,
 * race distance, and experience level. Cutback weeks use strides.
 */
function getWorkoutNote(
  weekNumber: number,
  raceDistance: RaceDistance,
  experienceLevel: ExperienceLevel,
  isCutback: boolean
): string {
  if (isCutback) {
    const strides = experienceLevel === 'Advanced' ? 8 : 6;
    return `Strides: ${strides} × 20 sec fast`;
  }

  // Cycle index: weeks 1–3 build, week 4 is cutback (handled above)
  const cycleIndex = ((weekNumber - 1) % CUTBACK_EVERY_N_WEEKS);
  const phase = cycleIndex; // 0, 1, 2 for build weeks

  // Workout descriptions by phase, scaled by race distance and experience
  const workouts5K = [
    '6 × 1 min brisk, 2 min easy',
    '8 × 1 min brisk',
    '10 min steady in middle',
  ];
  const workouts10K = [
    '5 × 2 min brisk, 2 min easy',
    '6 × 2 min brisk',
    '15 min steady in middle',
  ];
  const workoutsHalf = [
    '4 × 3 min tempo, 2 min easy',
    '3 × 5 min tempo',
    '20 min steady in middle',
  ];
  const workoutsMarathon = [
    '3 × 5 min tempo, 3 min easy',
    '2 × 8 min tempo',
    '25 min steady in middle',
  ];

  const byRace: Record<RaceDistance, string[]> = {
    '5K': workouts5K,
    '10K': workouts10K,
    Half: workoutsHalf,
    Marathon: workoutsMarathon,
  };

  let note = byRace[raceDistance][phase];

  // Scale reps by experience: Beginner fewer, Advanced more
  if (experienceLevel === 'Beginner' && phase < 2) {
    const scaled: Record<RaceDistance, string[]> = {
      '5K': ['5 × 1 min brisk, 2 min easy', '6 × 1 min brisk', '10 min steady in middle'],
      '10K': ['4 × 2 min brisk, 2 min easy', '5 × 2 min brisk', '15 min steady in middle'],
      Half: ['3 × 3 min tempo, 2 min easy', '2 × 5 min tempo', '20 min steady in middle'],
      Marathon: ['2 × 5 min tempo, 3 min easy', '2 × 6 min tempo', '25 min steady in middle'],
    };
    note = scaled[raceDistance][phase];
  } else if (experienceLevel === 'Advanced' && phase < 2) {
    const scaled: Record<RaceDistance, string[]> = {
      '5K': ['8 × 1 min brisk, 90 sec easy', '10 × 1 min brisk', '12 min steady in middle'],
      '10K': ['6 × 2 min brisk, 90 sec easy', '8 × 2 min brisk', '18 min steady in middle'],
      Half: ['5 × 3 min tempo, 90 sec easy', '4 × 5 min tempo', '25 min steady in middle'],
      Marathon: ['4 × 5 min tempo, 2 min easy', '3 × 8 min tempo', '30 min steady in middle'],
    };
    note = scaled[raceDistance][phase];
  }

  return note;
}

function weeksBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  const days = ms / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(days / 7));
}

/**
 * Returns the growth rate needed to reach target peak in available build weeks.
 * Ensures the plan progresses toward the goal even with cutbacks and taper.
 */
function getEffectiveGrowthRate(
  startKm: number,
  targetPeakKm: number,
  numWeeks: number,
  feasibleMax: number
): number {
  const taperWeeks = numWeeks >= 6 ? 2 : 1;
  const cutbackWeeks = Math.floor(numWeeks / CUTBACK_EVERY_N_WEEKS);
  const buildWeeks = Math.max(1, numWeeks - taperWeeks - cutbackWeeks);
  const target = Math.min(targetPeakKm, feasibleMax);
  if (target <= startKm) return MILEAGE_INCREASE_PCT;
  const required = Math.pow(target / startKm, 1 / buildWeeks) - 1;
  return Math.min(Math.max(required, MILEAGE_INCREASE_PCT), MAX_GROWTH_PCT);
}

/** Long/Workout % by runsPerWeek – more easy days get more total % for easy runs */
const SPLIT_BY_RUNS: Record<number, { long: number; workout: number }> = {
  3: { long: 0.4, workout: 0.25 },
  4: { long: 0.35, workout: 0.25 },
  5: { long: 0.3, workout: 0.2 },
  6: { long: 0.25, workout: 0.2 },
};

/**
 * Distribute weekly mileage across run days according to template.
 * Long/Workout % vary by runsPerWeek so Easy days don't get spread too thin.
 * Long runs use race-specific caps (e.g. 5K → up to 10km); Easy/Workout stay moderate.
 */
function distributeMileage(
  template: WorkoutType[],
  totalKm: number,
  maxLongKm: number,
  maxWorkoutKm: number,
  maxEasyKm: number,
  runsPerWeek: number
): { type: WorkoutType; km: number }[] {
  const easyCount = template.filter((t) => t === 'Easy').length;
  const split = SPLIT_BY_RUNS[runsPerWeek] ?? SPLIT_BY_RUNS[4];

  const longKm = Math.min(totalKm * split.long, maxLongKm);
  const workoutKm = Math.min(totalKm * split.workout, maxWorkoutKm);
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

  const targetPeak = TARGET_PEAK_KM[inputs.raceDistance][inputs.experienceLevel];
  const growthRate = getEffectiveGrowthRate(
    weeklyKm,
    targetPeak,
    numWeeks,
    feasibleMax
  );

  for (let w = 0; w < numWeeks; w++) {
    // Apply the "missed" increase when emerging from cutback – week after cutback
    // is higher than the week before cutback (baseline doesn't stagnate)
    const prevWasCutback = w > 0 && w % CUTBACK_EVERY_N_WEEKS === 0;
    if (prevWasCutback) {
      weeklyKm = Math.min(weeklyKm * (1 + growthRate), feasibleMax);
    }

    const isCutback = (w + 1) % CUTBACK_EVERY_N_WEEKS === 0;
    const taperMultiplier =
      numWeeks >= 6 && w === numWeeks - 2 ? 0.8 :
      w === numWeeks - 1 ? 0.6 :
      1;
    let weekTotal = weeklyKm * (isCutback ? CUTBACK_MULTIPLIER : 1) * taperMultiplier;
    if (weekTotal > feasibleMax) {
      weekTotal = feasibleMax;
    }
    const distributed = distributeMileage(
      template,
      weekTotal,
      maxLongKm,
      maxRunKm,
      maxRunKm,
      inputs.runsPerWeek
    );

    const days: DayPlan[] = distributed.map((d, i) => {
      const base: DayPlan = {
        weekday: WEEKDAY_SHORT[i],
        workoutType: d.type,
        ...(d.type !== 'Rest' && { distanceKm: d.km }),
      };
      if (d.type === 'Workout') {
        base.workoutNote = getWorkoutNote(
          w + 1,
          inputs.raceDistance,
          inputs.experienceLevel,
          isCutback
        );
      }
      return base;
    });

    const actualTotal = distributed.reduce((sum, d) => sum + d.km, 0);

    plans.push({
      weekNumber: w + 1,
      days,
      totalMileageKm: roundToHalf(actualTotal),
    });

    // Apply increase for build weeks; skip when we already applied post-cutback bounce
    if (!isCutback && !prevWasCutback) {
      weeklyKm = Math.min(weeklyKm * (1 + growthRate), feasibleMax);
    }
  }

  return plans;
}
