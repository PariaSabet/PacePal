// Race and experience types
export type RaceDistance = '5K' | '10K' | 'Half' | 'Marathon';
export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type WorkoutType = 'Easy' | 'Workout' | 'Long' | 'Rest';
export type LongRunDay = 'Saturday' | 'Sunday';

// Plan input from the form
export interface PlanInputs {
  raceDistance: RaceDistance;
  goalDate: string; // ISO date string from input[type=date]
  experienceLevel: ExperienceLevel;
  runsPerWeek: number; // 3–6
  longRunDay: LongRunDay;
}

// Single day in the plan
export interface DayPlan {
  weekday: string; // Mon, Tue, ...
  workoutType: WorkoutType;
  distanceKm?: number; // omitted for Rest
  workoutNote?: string; // structured description for Workout days
}

// One week of the plan (7 days Mon–Sun)
export interface WeekPlan {
  weekNumber: number;
  days: DayPlan[];
  totalMileageKm: number;
}

// Max distance per run by race distance (km) – no single run exceeds the race distance
export const MAX_RUN_KM_BY_RACE: Record<RaceDistance, number> = {
  '5K': 5,
  '10K': 10,
  Half: 21.1,
  Marathon: 42.2,
};

// Default starting weekly mileage per experience (km)
export const STARTING_MILEAGE_KM: Record<ExperienceLevel, number> = {
  Beginner: 25,
  Intermediate: 40,
  Advanced: 55,
};

// Weekday labels for display
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Index for Saturday and Sunday (0 = Monday) */
const SAT = 5;
const SUN = 6;

/**
 * Returns a 7-day template (Mon=0 .. Sun=6) of WorkoutType for the given
 * runs per week and long run day. One Long, one Workout, rest Easy.
 */
export function getWeekTemplate(runsPerWeek: number, longRunDay: LongRunDay): WorkoutType[] {
  const template: WorkoutType[] = ['Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest', 'Rest'];
  const longIndex = longRunDay === 'Saturday' ? SAT : SUN;

  template[longIndex] = 'Long';

  // Workout on Wednesday (mid-week)
  const workoutIndex = 2;
  template[workoutIndex] = 'Workout';

  // Remaining run days are Easy: runsPerWeek - 2 (Long + Workout)
  const easyCount = runsPerWeek - 2;
  let placed = 0;
  for (let i = 0; i < 7 && placed < easyCount; i++) {
    if (template[i] === 'Rest') {
      template[i] = 'Easy';
      placed++;
    }
  }

  return template;
}
