import { currentChallengePuzzleIds } from "./challenges.ts";
import type { Difficulty, Game, Puzzle } from "./types.ts";

export function regularPuzzlePool(catalogue: Puzzle[], games: Game[], candidates: Puzzle[] = catalogue, now = new Date()): Puzzle[] {
  const reserved = currentChallengePuzzleIds(catalogue, now);
  const eligible = candidates.filter((puzzle) => !reserved.has(puzzle.id));
  const played = new Set(games.map((game) => game.puzzle.id));
  const unplayed = eligible.filter((puzzle) => !played.has(puzzle.id));
  return unplayed.length ? unplayed : eligible;
}

export function selectRegularPuzzle(catalogue: Puzzle[], games: Game[], band: Difficulty, now = new Date()): Puzzle {
  const candidates = catalogue.filter((puzzle) => puzzle.difficulty === band);
  const pool = regularPuzzlePool(catalogue, games, candidates, now);
  if (!pool.length) throw new Error(`No non-challenge ${band} puzzles are available`);
  const dateSeed = [...now.toISOString().slice(0, 10)].reduce((total, char) => total + char.charCodeAt(0), 0);
  return pool[(dateSeed + games.length) % pool.length];
}
