import { applyHint as applyLogicalHint, candidateList, isSolved, peers } from "./sudoku.ts";
import type { AnnotationColour, BoardSnapshot, EntryMode, Game, Hint, Puzzle } from "./types.ts";

const clone2d = (items: number[][]) => items.map((item) => [...item]);
const cloneColours = (items: AnnotationColour[][]) => items.map((item) => [...item]);
export const MAX_MISTAKES = 3;

export function snapshot(game: Game): BoardSnapshot {
  return {
    values: [...game.values],
    corner: clone2d(game.corner),
    centre: clone2d(game.centre),
    colours: cloneColours(game.colours),
    lines: game.lines.map((line) => ({ ...line })),
    eliminated: clone2d(game.eliminated),
  };
}

function restore(game: Game, state: BoardSnapshot) {
  game.values = [...state.values];
  game.corner = clone2d(state.corner);
  game.centre = clone2d(state.centre);
  game.colours = cloneColours(state.colours);
  game.lines = (state.lines || []).map((line) => ({ ...line }));
  game.eliminated = clone2d(state.eliminated);
}

function invalidateHintState(game: Game) {
  game.hintStage = "none";
  game.hintId = null;
  game.hintPath = undefined;
}

export function createGame(puzzle: Puzzle, now = Date.now()): Game {
  return {
    id: `${puzzle.id}-${now}`,
    puzzle,
    values: puzzle.givens.split("").map((value) => (value === "0" ? "" : value)),
    corner: Array.from({ length: 81 }, () => []),
    centre: Array.from({ length: 81 }, () => []),
    colours: Array.from({ length: 81 }, () => []),
    lines: [],
    eliminated: Array.from({ length: 81 }, () => []),
    selected: [puzzle.givens.indexOf("0")],
    anchor: puzzle.givens.indexOf("0"),
    mode: "normal",
    history: [],
    future: [],
    elapsed: 0,
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    failedAt: null,
    mistakes: 0,
    paused: false,
    hintStage: "none",
    hintId: null,
    hintHistory: [],
  };
}

function startChange(game: Game) {
  game.history.push(snapshot(game));
  if (game.history.length > 80) game.history.shift();
  game.future = [];
  invalidateHintState(game);
  game.updatedAt = Date.now();
}

export function selectCell(game: Game, cell: number, extend = false) {
  if (extend) {
    game.selected = game.selected.includes(cell)
      ? game.selected.filter((item) => item !== cell)
      : [...game.selected, cell];
    if (!game.selected.length) game.selected = [cell];
  } else game.selected = [cell];
  game.anchor = cell;
}

export function setMode(game: Game, mode: EntryMode) {
  game.mode = mode;
}

export function digitIsComplete(values: string[], digit: number) {
  return values.filter((value) => value === String(digit)).length >= 9;
}

export function fillAllCandidates(game: Game) {
  const candidates = game.values.map((value, cell) => value || game.puzzle.givens[cell] !== "0" ? null : candidateList(game.values, cell, game.eliminated));
  const changed = candidates.some((digits, cell) => game.puzzle.givens[cell] === "0" && (
    game.corner[cell].length > 0 || game.centre[cell].join("") !== (digits || []).join("")
  ));
  if (!changed) return false;
  startChange(game);
  for (let cell = 0; cell < 81; cell++) {
    if (game.puzzle.givens[cell] !== "0") continue;
    game.corner[cell] = [];
    game.centre[cell] = candidates[cell] || [];
  }
  return true;
}

/**
 * Recovery action for a candidate state that no longer admits a logical step.
 * Unlike ordinary candidate calculation, this deliberately forgets prior
 * candidate removals and rebuilds every note from the placed digits. The
 * previous notes and eliminations remain available through Undo.
 */
export function resetAllCandidates(game: Game) {
  const candidates = game.values.map((value, cell) => value || game.puzzle.givens[cell] !== "0" ? [] : candidateList(game.values, cell));
  const changed = game.eliminated.some((digits) => digits.length > 0) || game.corner.some((digits) => digits.length > 0) || game.centre.some((digits, cell) => digits.join("") !== candidates[cell].join(""));
  if (!changed) return false;
  startChange(game);
  for (let cell = 0; cell < 81; cell++) {
    game.eliminated[cell] = [];
    if (game.values[cell] || game.puzzle.givens[cell] !== "0") continue;
    game.corner[cell] = [];
    game.centre[cell] = candidates[cell];
  }
  return true;
}

export function enterDigit(game: Game, digit: number, cleanCandidates = true, multipleNoteMode: "corner" | "centre" = "corner", mistakeLimit = true) {
  const editable = game.selected.filter((cell) => game.puzzle.givens[cell] === "0");
  if (!editable.length) return;
  const mode = game.mode === "normal" && editable.length > 1 ? multipleNoteMode : game.mode;
  const targets = mode === "corner" || mode === "centre"
    ? editable.filter((cell) => !game.values[cell])
    : editable;
  if (!targets.length) return;
  const removeNote = mode === "corner" || mode === "centre"
    ? targets.every((cell) => (mode === "corner" ? game.corner[cell] : game.centre[cell]).includes(digit))
    : false;
  startChange(game);
  for (const cell of targets) {
    if (mode === "normal") {
      const changedValue = game.values[cell] !== String(digit);
      game.values[cell] = String(digit);
      game.corner[cell] = [];
      game.centre[cell] = [];
      game.eliminated[cell] = [];
      if (cleanCandidates) {
        for (const peer of peers[cell]) {
          game.corner[peer] = game.corner[peer].filter((value) => value !== digit);
          game.centre[peer] = game.centre[peer].filter((value) => value !== digit);
        }
      }
      if (mistakeLimit && changedValue && digit !== Number(game.puzzle.solution[cell])) recordMistake(game);
    } else if (mode === "corner" || mode === "centre") {
      const marks = mode === "corner" ? game.corner[cell] : game.centre[cell];
      const index = marks.indexOf(digit);
      if (removeNote && index >= 0) marks.splice(index, 1);
      else if (!removeNote && index < 0) {
        marks.push(digit);
        if (mode === "centre") game.eliminated[cell] = game.eliminated[cell].filter((value) => value !== digit);
      }
      marks.sort();
    }
  }
  completeIfSolved(game);
}

export function promoteSoleCentre(game: Game, cell: number, cleanCandidates = true, mistakeLimit = true) {
  if (cell < 0 || cell > 80 || game.puzzle.givens[cell] !== "0" || game.values[cell] || game.centre[cell].length !== 1) return false;
  const digit = game.centre[cell][0];
  if (!digit) return false;
  selectCell(game, cell);
  startChange(game);
  game.values[cell] = String(digit);
  game.corner[cell] = [];
  game.centre[cell] = [];
  game.eliminated[cell] = [];
  if (cleanCandidates) {
    for (const peer of peers[cell]) {
      game.corner[peer] = game.corner[peer].filter((value) => value !== digit);
      game.centre[peer] = game.centre[peer].filter((value) => value !== digit);
    }
  }
  if (mistakeLimit && digit !== Number(game.puzzle.solution[cell])) recordMistake(game);
  completeIfSolved(game);
  return true;
}

export function applyColour(game: Game, colour: AnnotationColour) {
  const remove = game.selected.length > 0 && game.selected.every((cell) => game.colours[cell].includes(colour));
  startChange(game);
  for (const cell of game.selected) {
    if (remove) game.colours[cell] = game.colours[cell].filter((item) => item !== colour);
    else if (!game.colours[cell].includes(colour)) game.colours[cell].push(colour);
  }
}

export function clearColours(game: Game) {
  if (!game.selected.some((cell) => game.colours[cell].length)) return false;
  startChange(game);
  for (const cell of game.selected) game.colours[cell] = [];
  return true;
}

export function clearColour(game: Game, colour: AnnotationColour) {
  if (!game.colours.some((items) => items.includes(colour))) return false;
  startChange(game);
  for (let cell = 0; cell < game.colours.length; cell++) game.colours[cell] = game.colours[cell].filter((item) => item !== colour);
  return true;
}

export function clearAllColours(game: Game) {
  if (!game.colours.some((items) => items.length)) return false;
  startChange(game);
  game.colours = Array.from({ length: 81 }, () => []);
  return true;
}

export function toggleLine(game: Game, first: number, second: number, colour: AnnotationColour) {
  if (first === second || first < 0 || first > 80 || second < 0 || second > 80) return false;
  const from = Math.min(first, second);
  const to = Math.max(first, second);
  const existing = game.lines.findIndex((line) => line.from === from && line.to === to);
  startChange(game);
  if (existing >= 0 && game.lines[existing].colour === colour) game.lines.splice(existing, 1);
  else if (existing >= 0) game.lines[existing] = { from, to, colour };
  else game.lines.push({ from, to, colour });
  return true;
}

export function clearLines(game: Game) {
  if (!game.lines.length) return false;
  startChange(game);
  game.lines = [];
  return true;
}

export function clearLinesByColour(game: Game, colour: AnnotationColour) {
  if (!game.lines.some((line) => line.colour === colour)) return false;
  startChange(game);
  game.lines = game.lines.filter((line) => line.colour !== colour);
  return true;
}

export function clearSelected(game: Game) {
  const editable = game.selected.filter((cell) => game.puzzle.givens[cell] === "0");
  if (!editable.length) return;
  startChange(game);
  for (const cell of editable) {
    if (game.mode === "normal") game.values[cell] = "";
    else if (game.mode === "corner") game.corner[cell] = [];
    else if (game.mode === "centre") game.centre[cell] = [];
    else if (game.mode === "colour") game.colours[cell] = [];
  }
  game.completedAt = null;
}

export function undo(game: Game): boolean {
  const previous = game.history.pop();
  if (!previous) return false;
  game.future.push(snapshot(game));
  restore(game, previous);
  invalidateHintState(game);
  game.completedAt = null;
  game.updatedAt = Date.now();
  return true;
}

export function redo(game: Game): boolean {
  const next = game.future.pop();
  if (!next) return false;
  game.history.push(snapshot(game));
  restore(game, next);
  invalidateHintState(game);
  completeIfSolved(game);
  game.updatedAt = Date.now();
  return true;
}

export function applyHint(game: Game, hint: Hint, cleanCandidates = true) {
  startChange(game);
  applyLogicalHint(game.values, game.eliminated, hint);
  for (const { cell, digit } of hint.targets) {
    if (hint.kind === "eliminate") {
      game.corner[cell] = game.corner[cell].filter((value) => value !== digit);
      game.centre[cell] = game.centre[cell].filter((value) => value !== digit);
      continue;
    }
    game.corner[cell] = [];
    game.centre[cell] = [];
    if (cleanCandidates) {
      for (const peer of peers[cell]) {
        game.corner[peer] = game.corner[peer].filter((value) => value !== digit);
        game.centre[peer] = game.centre[peer].filter((value) => value !== digit);
      }
    }
  }
  completeIfSolved(game);
}

export function revealCell(game: Game) {
  const cell = game.selected.find((index) => game.puzzle.givens[index] === "0" && game.values[index] !== game.puzzle.solution[index]);
  if (cell === undefined) return false;
  startChange(game);
  game.values[cell] = game.puzzle.solution[cell];
  game.corner[cell] = [];
  game.centre[cell] = [];
  completeIfSolved(game);
  return true;
}

export function completeIfSolved(game: Game) {
  if (!game.failedAt && isSolved(game.values, game.puzzle.solution) && !game.completedAt) {
    game.completedAt = Date.now();
    game.paused = true;
  }
}

function recordMistake(game: Game) {
  game.mistakes += 1;
  if (game.mistakes > MAX_MISTAKES && !game.failedAt) {
    game.failedAt = Date.now();
    game.completedAt = null;
    game.paused = true;
  }
}

export function moveSelection(game: Game, deltaRow: number, deltaColumn: number, extend = false) {
  const current = game.anchor;
  const row = (Math.floor(current / 9) + deltaRow + 9) % 9;
  const column = ((current % 9) + deltaColumn + 9) % 9;
  selectCell(game, row * 9 + column, extend);
}
