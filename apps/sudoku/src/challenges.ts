import type { ChallengeCadence, Difficulty, Game, Puzzle } from "./types.ts";

export type { ChallengeCadence } from "./types.ts";

export const CHALLENGE_BANDS: Difficulty[] = ["Easy", "Medium", "Hard", "Diabolical"];

export function challengePeriodKey(cadence: ChallengeCadence, now = new Date()): string {
  if (cadence === "daily") return now.toISOString().slice(0, 10);

  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - weekday);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

function stableHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function challengeIndex(pool: Puzzle[], band: Difficulty, cadence: ChallengeCadence, now: Date): number {
  const version = pool[0]?.catalogueVersion || "unknown";
  return stableHash(`${version}:${cadence}:${challengePeriodKey(cadence, now)}:${band}`) % pool.length;
}

function datesInIsoWeek(now: Date): Date[] {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() || 7) - 1));
  return Array.from({ length: 7 }, (_, offset) => new Date(monday.getTime() + offset * 86_400_000));
}

export function challengePuzzle(catalogue: Puzzle[], band: Difficulty, cadence: ChallengeCadence, now = new Date()): Puzzle {
  const pool = catalogue.filter((puzzle) => puzzle.difficulty === band).sort((left, right) => left.id.localeCompare(right.id));
  if (!pool.length) throw new Error(`No ${band} puzzles are available for the challenge`);

  let index = challengeIndex(pool, band, cadence, now);
  if (cadence === "weekly" && pool.length > 1) {
    const dailyIndices = new Set(datesInIsoWeek(now).map((date) => challengeIndex(pool, band, "daily", date)));
    for (let offset = 0; offset < pool.length && dailyIndices.has(index); offset += 1) index = (index + 1) % pool.length;
  }
  return pool[index];
}

export function challengeSet(catalogue: Puzzle[], cadence: ChallengeCadence, now = new Date()): Puzzle[] {
  return CHALLENGE_BANDS.map((band) => challengePuzzle(catalogue, band, cadence, now));
}

function challengePeriodDate(cadence: ChallengeCadence, periodKey: string): Date | null {
  if (cadence === "daily") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(periodKey)) return null;
    const date = new Date(`${periodKey}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && challengePeriodKey(cadence, date) === periodKey ? date : null;
  }

  const match = /^(\d{4})-W(\d{2})$/.exec(periodKey);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const januaryFourth = new Date(Date.UTC(year, 0, 4, 12));
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - ((januaryFourth.getUTCDay() || 7) - 1) + (week - 1) * 7);
  return challengePeriodKey(cadence, monday) === periodKey ? monday : null;
}

export function challengeSetForPeriod(catalogue: Puzzle[], cadence: ChallengeCadence, periodKey: string): Puzzle[] {
  const date = challengePeriodDate(cadence, periodKey);
  return date ? challengeSet(catalogue, cadence, date) : [];
}

export function nextChallengePuzzle(catalogue: Puzzle[], game: Game): Puzzle | null {
  if (!game.challenge) return null;
  const set = challengeSetForPeriod(catalogue, game.challenge.cadence, game.challenge.periodKey);
  const current = set.findIndex((puzzle) => puzzle.id === game.puzzle.id);
  return current >= 0 ? set[current + 1] || null : null;
}

export function currentChallengePuzzleIds(catalogue: Puzzle[], now = new Date()): Set<string> {
  return new Set((["daily", "weekly"] as ChallengeCadence[])
    .flatMap((cadence) => challengeSet(catalogue, cadence, now))
    .map((puzzle) => puzzle.id));
}

export interface ChallengeStats {
  completed: number;
  currentPeriodCompleted: number;
  streak: number;
  averageSeconds: number | null;
}

function periodOrdinal(cadence: ChallengeCadence, key: string): number | null {
  if (cadence === "daily") {
    const value = Date.parse(`${key}T00:00:00Z`);
    return Number.isFinite(value) ? Math.floor(value / 86_400_000) : null;
  }
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const weekOneMonday = new Date(januaryFourth);
  weekOneMonday.setUTCDate(januaryFourth.getUTCDate() - ((januaryFourth.getUTCDay() || 7) - 1));
  return Math.floor(weekOneMonday.getTime() / 604_800_000) + week - 1;
}

export function challengeStats(games: Game[], cadence: ChallengeCadence, now = new Date()): ChallengeStats {
  const completed = games.filter((game) => game.completedAt && game.challenge?.cadence === cadence);
  const currentKey = challengePeriodKey(cadence, now);
  const currentPeriodCompleted = new Set(completed
    .filter((game) => game.challenge?.periodKey === currentKey)
    .map((game) => game.puzzle.difficulty)).size;
  const averageSeconds = completed.length ? Math.round(completed.reduce((total, game) => total + game.elapsed, 0) / completed.length) : null;
  const completedPeriods = new Set(completed.map((game) => periodOrdinal(cadence, game.challenge!.periodKey)).filter((value): value is number => value !== null));
  const currentOrdinal = periodOrdinal(cadence, currentKey)!;
  let cursor = completedPeriods.has(currentOrdinal) ? currentOrdinal : currentOrdinal - 1;
  let streak = 0;
  while (completedPeriods.has(cursor)) { streak += 1; cursor -= 1; }
  return { completed: completed.length, currentPeriodCompleted, streak, averageSeconds };
}
