import { validatePuzzle } from "./puzzles.ts";
import type { Puzzle, PuzzleSummary } from "./types.ts";

export const CATALOGUE_VERSION = "2026.10.2";

interface CatalogueEnvelope {
  version: string;
  puzzles: PuzzleSummary[];
}

export let puzzles: PuzzleSummary[] = [];
export let wordSearches: PuzzleSummary[] = [];
export let crosswords: PuzzleSummary[] = [];

const catalogueUrl = (path: string) => new URL(`catalogue/${path}`, document.baseURI);

export async function loadCatalogue() {
  const response = await fetch(catalogueUrl("index.json"));
  if (!response.ok) throw new Error(`Catalogue request failed (${response.status}).`);
  const envelope = await response.json() as Partial<CatalogueEnvelope>;
  if (envelope.version !== CATALOGUE_VERSION || !Array.isArray(envelope.puzzles)) throw new Error("The catalogue index is not compatible with this WTrack release.");
  puzzles = envelope.puzzles;
  wordSearches = puzzles.filter((puzzle) => puzzle.kind === "word-search");
  crosswords = puzzles.filter((puzzle) => puzzle.kind === "crossword");
  return puzzles;
}

export function puzzleById(id: string) {
  return puzzles.find((puzzle) => puzzle.id === id);
}

export async function downloadPuzzle(id: string) {
  const response = await fetch(catalogueUrl(`puzzles/${encodeURIComponent(id)}.json`), { cache: "no-store" });
  if (!response.ok) throw new Error(`Puzzle request failed (${response.status}).`);
  const puzzle = await response.json() as Puzzle;
  if (puzzle.id !== id) throw new Error("The downloaded puzzle does not match this catalogue.");
  validatePuzzle(puzzle);
  return puzzle;
}
