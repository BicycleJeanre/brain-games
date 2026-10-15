import type { ChallengeCadence, Difficulty, PuzzleProgress, PuzzleSummary } from "./types.ts";

export const CHALLENGE_DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Diabolical"];

export function challengePeriodKey(cadence: ChallengeCadence, now = new Date()) {
  if (cadence === "daily") return now.toISOString().slice(0, 10);
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const year = date.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86_400_000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function stableHash(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

function selectionIndex(pool: PuzzleSummary[], difficulty: Difficulty, cadence: ChallengeCadence, now: Date) {
  return stableHash(`${pool[0]?.catalogueVersion ?? "unknown"}:${cadence}:${challengePeriodKey(cadence, now)}:${difficulty}`) % pool.length;
}

function daysInIsoWeek(now: Date) {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() || 7) - 1));
  return Array.from({ length: 7 }, (_, offset) => new Date(monday.getTime() + offset * 86_400_000));
}

export function challengePuzzle(catalogue: PuzzleSummary[], difficulty: Difficulty, cadence: ChallengeCadence, now = new Date()) {
  const pool = catalogue.filter((puzzle) => puzzle.difficulty === difficulty).sort((left, right) => left.id.localeCompare(right.id));
  if (!pool.length) throw new Error(`No ${difficulty} puzzle is available for this challenge.`);
  let index = selectionIndex(pool, difficulty, cadence, now);
  if (cadence === "weekly" && pool.length > 1) {
    const daily = new Set(daysInIsoWeek(now).map((date) => selectionIndex(pool, difficulty, "daily", date)));
    for (let offset = 0; offset < pool.length && daily.has(index); offset += 1) index = (index + 1) % pool.length;
  }
  return pool[index]!;
}

export function challengeSessionId(cadence: ChallengeCadence, difficulty: Difficulty, now = new Date()) {
  return `challenge:${cadence}:${challengePeriodKey(cadence, now)}:${difficulty.toLowerCase()}`;
}

export function challengeSet(catalogue: PuzzleSummary[], cadence: ChallengeCadence, now = new Date()) {
  return CHALLENGE_DIFFICULTIES.map((difficulty) => ({
    difficulty,
    puzzle: challengePuzzle(catalogue, difficulty, cadence, now),
    periodKey: challengePeriodKey(cadence, now),
    sessionId: challengeSessionId(cadence, difficulty, now),
  }));
}

function periodOrdinal(cadence: ChallengeCadence, key: string) {
  if (cadence === "daily") {
    const value = Date.parse(`${key}T00:00:00Z`);
    return Number.isFinite(value) ? Math.floor(value / 86_400_000) : null;
  }
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const week = Number(match[2]);
  if (week < 1 || week > 53) return null;
  const fourth = new Date(Date.UTC(year, 0, 4));
  fourth.setUTCDate(fourth.getUTCDate() - ((fourth.getUTCDay() || 7) - 1));
  return Math.floor(fourth.getTime() / 604_800_000) + week - 1;
}

export function challengeStats(progress: PuzzleProgress[], cadence: ChallengeCadence, now = new Date()) {
  const completed = progress.filter((item) => item.completedAt && item.challenge?.cadence === cadence);
  const currentKey = challengePeriodKey(cadence, now);
  const currentPeriodCompleted = new Set(completed.filter((item) => item.challenge?.periodKey === currentKey).map((item) => item.challenge?.difficulty)).size;
  const averageSeconds = completed.length ? Math.round(completed.reduce((total, item) => total + item.elapsedSeconds, 0) / completed.length) : null;
  const ordinals = new Set(completed.map((item) => periodOrdinal(cadence, item.challenge!.periodKey)).filter((value): value is number => value !== null));
  const current = periodOrdinal(cadence, currentKey)!;
  let cursor = ordinals.has(current) ? current : current - 1;
  let streak = 0;
  while (ordinals.has(cursor)) { streak += 1; cursor -= 1; }
  return { completed: completed.length, currentPeriodCompleted, streak, averageSeconds };
}
