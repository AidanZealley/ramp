export interface WeekTotals {
  totalDurationSeconds: number
  totalStressScore: number
  workoutCount: number
  /** TSS per day, indexed by dayIndex (0 = Monday). Length 7. */
  perDayStressScore: Array<number>
}
