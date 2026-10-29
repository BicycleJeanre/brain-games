import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { applyColour, applyHint as applyGameHint, clearAllColours, clearColour, clearColours, clearLines, clearLinesByColour, createGame, digitIsComplete, enterDigit, fillAllCandidates, MAX_MISTAKES, promoteSoleCentre, redo, selectCell, setMode, toggleLine, undo } from "../src/game.ts";
import { contextualHintExplanation } from "../src/hint-explanation.ts";
import { buildHintPath, findHint, hintRespectsGivens, nextHintFromPath } from "../src/hint-engine.ts";
import { applyHint as applyLogicalHint, candidateList, isHintApplicable, normalizePuzzle, solvePuzzle, validatePuzzle } from "../src/sudoku.ts";
import type { Hint, Puzzle } from "../src/types.ts";

const classic = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const solution = "534678912672195348198342567859761423426853791713924856961537284287419635345286179";
const fixture: Puzzle = { id: "test", givens: classic, solution, source: "Imported", sourceUrl: "", provenance: "test", licence: "test", seRating: null, ratingEngine: "Not rated", ratingVersion: "Not rated", difficulty: "Unrated", catalogueVersion: "test", fullHints: false };

test("normalizes common strings and rejects malformed puzzles", () => {
  assert.equal(normalizePuzzle(classic.replaceAll("0", ".")), classic);
  assert.equal(normalizePuzzle("12"), null);
  assert.equal(normalizePuzzle("x".repeat(81)), null);
});

test("validates uniqueness and solves without trusting stored answers", () => {
  assert.deepEqual(solvePuzzle(classic, 2), [solution]);
  assert.equal(validatePuzzle(classic).valid, true);
  assert.match(validatePuzzle("0".repeat(81)).message, /more than one solution/i);
  assert.equal(validatePuzzle("11" + "0".repeat(79)).valid, false);
});

test("candidate calculation and logical hint identify a forced value", () => {
  const values = solution.split("");
  values[0] = "";
  assert.deepEqual(candidateList(values, 0), [5]);
  const hint = findHint(values);
  assert.equal(hint?.technique, "Full house");
  assert.match(hint?.id || "", /^hodoku-/);
  assert.deepEqual(hint?.targets, [{ cell: 0, digit: 5 }]);
});

test("the default mistake limit allows three wrong digits and fails on the fourth", () => {
  const game = createGame(fixture, 100);
  selectCell(game, 2);
  for (const digit of [1, 2, 3]) enterDigit(game, digit);
  assert.equal(game.mistakes, MAX_MISTAKES);
  assert.equal(game.failedAt, null);
  enterDigit(game, 5);
  assert.equal(game.mistakes, MAX_MISTAKES + 1);
  assert.ok(game.failedAt);
  assert.equal(game.paused, true);
  assert.equal(game.completedAt, null);
  undo(game);
  assert.equal(game.mistakes, MAX_MISTAKES + 1, "undo does not erase a recorded mistake");
  assert.ok(game.failedAt, "a failed attempt remains failed after board history changes");
});

test("notes never count as mistakes and the limit can be disabled", () => {
  const notes = createGame(fixture, 200);
  selectCell(notes, 2);
  setMode(notes, "centre");
  for (const digit of [1, 2, 3, 5]) enterDigit(notes, digit);
  assert.equal(notes.mistakes, 0);
  assert.equal(notes.failedAt, null);

  const unlimited = createGame(fixture, 300);
  selectCell(unlimited, 2);
  for (const digit of [1, 2, 3, 5, 6]) enterDigit(unlimited, digit, true, "corner", false);
  assert.equal(unlimited.mistakes, 0);
  assert.equal(unlimited.failedAt, null);
});

test("contextual Empty Rectangle explanation names the actual box, arms, link and target", () => {
  const hint: Hint = {
    id: "empty-rectangle-test",
    technique: "Empty Rectangle",
    summary: "test",
    explanation: "test",
    kind: "eliminate",
    evidence: [4, 31, 0, 1, 9],
    targets: [{ cell: 27, digit: 7 }],
  };
  const explanation = contextualHintExplanation(hint);
  assert.equal(explanation.title, "Why is this an Empty Rectangle?");
  assert.match(explanation.steps[0], /Box 1/);
  assert.match(explanation.steps[0], /Row 1/);
  assert.match(explanation.steps[0], /Column 1/);
  assert.match(explanation.steps[1], /R1C5 and R4C5/);
  assert.match(explanation.steps[1], /strong link for 7 in Column 5/);
  assert.match(explanation.conclusion, /Remove 7 from R4C1/);
});

test("contextual Skyscraper explanation traces both strong links, the shared base and every elimination", () => {
  const hint: Hint = {
    id: "skyscraper-test",
    technique: "Skyscraper",
    summary: "test",
    explanation: "test",
    kind: "eliminate",
    evidence: [41, 53, 23, 26],
    targets: [{ cell: 42, digit: 6 }, { cell: 43, digit: 6 }, { cell: 48, digit: 6 }, { cell: 49, digit: 6 }],
  };
  const explanation = contextualHintExplanation(hint);
  assert.equal(explanation.title, "Why does this Skyscraper eliminate these candidates?");
  assert.match(explanation.steps[0], /Column 6.*R3C6 or R5C6/);
  assert.match(explanation.steps[0], /Column 9.*R3C9 or R6C9/);
  assert.match(explanation.steps[1], /R3C6 and R3C9.*Row 3/);
  assert.match(explanation.steps[2], /at least one roof is 6/);
  assert.match(explanation.steps[3], /R5C7 sees R5C6 through Row 5 and R6C9 through Box 6/);
  assert.match(explanation.steps[3], /R6C4 sees R5C6 through Box 5 and R6C9 through Row 6/);
  assert.match(explanation.conclusion, /Remove 6 from R5C7, R5C8, R6C4 and R6C5/);
});

test("contextual Avoidable Rectangle Type 1 explanation traces the shown corners and elimination", () => {
  const values = Array.from({ length: 81 }, () => "");
  values[4] = "4";
  values[5] = "2";
  values[49] = "2";
  const candidates = Array.from({ length: 81 }, () => [] as number[]);
  candidates[50] = [4, 8];
  const hint: Hint = {
    id: "avoidable-rectangle-test",
    technique: "Avoidable Rectangle Type 1",
    summary: "test",
    explanation: "test",
    kind: "eliminate",
    evidence: [4, 5, 49],
    targets: [{ cell: 50, digit: 4 }],
  };
  const explanation = contextualHintExplanation(hint, { values, givens: "0".repeat(81), candidates });
  assert.equal(explanation.title, "Why is this an Avoidable Rectangle Type 1?");
  assert.match(explanation.steps[0], /R1C5=4, R1C6=2, R6C5=2/);
  assert.match(explanation.steps[0], /Rows 1 and 6/);
  assert.match(explanation.steps[1], /R6C6 were 4/);
  assert.match(explanation.steps[1], /4–2 \/ 2–4/);
  assert.match(explanation.steps[2], /player entries rather than original givens/);
  assert.match(explanation.steps[2], /second solution/);
  assert.match(explanation.conclusion, /only displayed candidate left is 8/);
  assert.match(explanation.conclusion, /R6C6 becomes 8/);
});

test("contextual Hidden Rectangle explanation traces both strong links and the uniqueness contradiction", () => {
  const candidates = Array.from({ length: 81 }, () => [] as number[]);
  candidates[6] = [6, 9];
  candidates[8] = [1, 6, 9];
  candidates[51] = [1, 2, 3, 5, 6, 9];
  candidates[53] = [1, 2, 5, 6, 9];
  const explanation = contextualHintExplanation({
    id: "hidden-rectangle",
    technique: "Hidden Rectangle",
    summary: "Hidden Rectangle elimination",
    explanation: "",
    kind: "eliminate",
    evidence: [6, 8, 51],
    targets: [{ cell: 53, digit: 6 }],
  }, { candidates });

  assert.equal(explanation.title, "Why is this a Hidden Rectangle?");
  assert.match(explanation.steps.join(" "), /R1C7, R1C9, R6C7 and R6C9/);
  assert.match(explanation.steps.join(" "), /Row 6.*R6C7.*R6C9/);
  assert.match(explanation.steps.join(" "), /Column 9.*R1C9.*R6C9/);
  assert.match(explanation.steps.join(" "), /Assume R6C9 were 6/);
  assert.match(explanation.steps.join(" "), /swapped 6↔9/);
  assert.match(explanation.conclusion, /Remove 6 from R6C9/);
});

test("XY-Wing explanation defines the rule and labels the pivot and both wings", () => {
  const candidates = Array.from({ length: 81 }, () => [] as number[]);
  candidates[27] = [1, 6];
  candidates[30] = [1, 9];
  candidates[37] = [6, 9];
  const explanation = contextualHintExplanation({
    id: "xy-wing",
    technique: "XY-Wing",
    summary: "",
    explanation: "",
    kind: "eliminate",
    evidence: [27, 30, 37],
    targets: [{ cell: 28, digit: 9 }],
  }, { candidates });

  assert.equal(explanation.title, "How this XY-Wing works");
  assert.match(explanation.definition || "", /one two-candidate pivot and two two-candidate wings/i);
  assert.deepEqual(explanation.roles?.map(({ cell, label, badge }) => ({ cell, label, badge })), [
    { cell: 27, label: "Pivot", badge: "P" },
    { cell: 30, label: "Wing A", badge: "W1" },
    { cell: 37, label: "Wing B", badge: "W2" },
  ]);
  assert.match(explanation.steps.join(" "), /R4C1 is the pivot/);
  assert.match(explanation.steps.join(" "), /at least one wing is 9/);
  assert.match(explanation.conclusion, /Remove 9 from R4C2/);
});

test("XYZ-Wing explanation labels its three-candidate pivot and proves the shared Z", () => {
  const candidates = Array.from({ length: 81 }, () => [] as number[]);
  candidates[21] = [4, 6, 7];
  candidates[12] = [6, 7];
  candidates[24] = [4, 6];
  const explanation = contextualHintExplanation({
    id: "xyz-wing",
    technique: "XYZ-Wing",
    summary: "",
    explanation: "",
    kind: "eliminate",
    evidence: [21, 12, 24],
    targets: [{ cell: 22, digit: 6 }],
  }, { candidates });

  assert.equal(explanation.title, "How this XYZ-Wing works");
  assert.match(explanation.definition || "", /three-candidate pivot/i);
  assert.deepEqual(explanation.roles?.map(({ cell, label }) => ({ cell, label })), [
    { cell: 21, label: "Pivot" },
    { cell: 12, label: "Wing A" },
    { cell: 24, label: "Wing B" },
  ]);
  assert.match(explanation.steps.join(" "), /shared Z digit is 6/);
  assert.match(explanation.steps.join(" "), /sees all three possible places for 6/);
});

test("W-Wing explanation states that there is no pivot and names both wings and link ends", () => {
  const candidates = Array.from({ length: 81 }, () => [] as number[]);
  candidates[0] = [5, 7];
  candidates[23] = [5, 7];
  candidates[10] = [1, 7];
  candidates[14] = [5, 7];
  candidates[18] = [1, 5, 7];
  const explanation = contextualHintExplanation({
    id: "w-wing",
    technique: "W-Wing",
    summary: "",
    explanation: "",
    kind: "eliminate",
    evidence: [0, 23, 10, 14],
    targets: [{ cell: 18, digit: 5 }],
  }, { candidates });

  assert.equal(explanation.title, "How this W-Wing works");
  assert.match(explanation.definition || "", /has no pivot/i);
  assert.match(explanation.definition || "", /strong link on 7/i);
  assert.deepEqual(explanation.roles?.map(({ cell, label, badge }) => ({ cell, label, badge })), [
    { cell: 0, label: "Wing A", badge: "W1" },
    { cell: 23, label: "Wing B", badge: "W2" },
    { cell: 10, label: "Link end A", badge: "L1" },
    { cell: 14, label: "Link end B", badge: "L2" },
  ]);
  assert.match(explanation.steps[0], /R1C1 and R3C6 are the wings/);
  assert.match(explanation.steps[1], /R2C2 and R2C6.*strong link for 7 in Row 2/);
  assert.match(explanation.steps[2], /Wing A is 5.*Wing B is forced to 5/);
  assert.match(explanation.steps[3], /R3C1 sees Wing A through Column 1 and Wing B through Row 3/);
  assert.match(explanation.conclusion, /Remove 5 from R3C1/);
});

test("BUG +1 explains the exceptional cell and parity before separating the deduction", () => {
  const candidates = Array.from({ length: 81 }, () => [] as number[]);
  candidates[44] = [2, 4, 5];
  candidates[36] = [2, 5];
  candidates[40] = [4, 5];
  candidates[8] = [3, 5];
  candidates[71] = [1, 5];
  candidates[34] = [5, 7];
  candidates[52] = [5, 8];
  const explanation = contextualHintExplanation({
    id: "bug-plus-one",
    technique: "Bivalue Universal Grave + 1",
    summary: "",
    explanation: "",
    kind: "eliminate",
    evidence: [],
    targets: [{ cell: 44, digit: 2 }, { cell: 44, digit: 4 }],
  }, { candidates });

  assert.equal(explanation.title, "How this BUG +1 works");
  assert.match(explanation.definition || "", /Bivalue means a cell has two candidates/);
  assert.deepEqual(explanation.roles?.map(({ cell, label, badge }) => ({ cell, label, badge })), [
    { cell: 44, label: "The +1 cell", badge: "+1" },
  ]);
  assert.match(explanation.steps.join(" "), /R5C9 is the exception/);
  assert.match(explanation.steps.join(" "), /candidate 5 is the “\+1”/);
  assert.doesNotMatch(explanation.steps.join(" "), /Remove 2 and 4/);
  assert.match(explanation.conclusion, /Remove 2 and 4 from R5C9/);
  assert.match(explanation.conclusion, /5 is the only candidate left/);
});

test("original clues cannot be used as editable corners of an Avoidable Rectangle", () => {
  const position = "857642931090073000300809000023700610978361452000020003189437526245006387736285100";
  const givens = "850000031000070000000809000003000600970301052000020000100407006205000307000080000";
  const solution = "857642931492173865361859274523794618978361452614528793189437526245916387736285149";
  const candidateRows = [
    ["", "", "", "", "", "", "", "", ""],
    ["46", "", "12", "15", "", "", "28", "46", "58"],
    ["", "16", "124", "", "15", "", "27", "467", "45"],
    ["45", "", "", "", "59", "48", "", "", "89"],
    ["", "", "", "", "", "", "", "", ""],
    ["456", "16", "14", "59", "", "48", "78", "79", ""],
    ["", "", "", "", "35", "", "", "", ""],
    ["", "", "", "19", "19", "", "", "", ""],
    ["", "", "", "", "", "", "", "49", "49"],
  ];
  const values = [...position].map((value) => value === "0" ? "" : value);
  const visibleCandidates = candidateRows.flat().map((digits) => [...digits].map(Number));

  const wronglyMutable = findHint(values, [], { visibleCandidates, solution });
  assert.equal(wronglyMutable?.technique, "Avoidable Rectangle Type 1", "the regression fixture reproduces the former false hint when clue metadata is omitted");
  assert.equal(hintRespectsGivens(wronglyMutable!, givens), false);

  const corrected = findHint(values, [], { visibleCandidates, solution, givens });
  assert.ok(corrected, "the engine continues to a valid logical move");
  assert.notEqual(corrected.technique, "Avoidable Rectangle Type 1");
  assert.equal(hintRespectsGivens(corrected, givens), true);
});

test("an applied hint is no longer applicable and cannot be offered again", async () => {
  const puzzles = JSON.parse(await readFile(new URL("../src/data/puzzles.json", import.meta.url), "utf8")) as Puzzle[];
  const puzzle = puzzles.find((item) => item.id === "seb-0000847b216e");
  assert.ok(puzzle);
  const values = puzzle.givens.split("").map((value) => value === "0" ? "" : value);
  const eliminated = Array.from({ length: 81 }, () => [] as number[]);
  let hint = findHint(values, eliminated, { solution: puzzle.solution });
  while (hint?.kind !== "eliminate") {
    assert.ok(hint, "fixture must reach a candidate-elimination hint");
    applyLogicalHint(values, eliminated, hint);
    hint = findHint(values, eliminated, { solution: puzzle.solution });
  }

  const path = buildHintPath(values, eliminated, { solution: puzzle.solution });
  assert.equal(isHintApplicable(values, eliminated, hint), true);
  applyLogicalHint(values, eliminated, hint);
  assert.equal(isHintApplicable(values, eliminated, hint), false);
  assert.equal(nextHintFromPath(path, values, eliminated, { solution: puzzle.solution }), null, "a path belongs only to the state that generated it");
  assert.notEqual(findHint(values, eliminated, { solution: puzzle.solution })?.id, hint.id);
});

test("a cached XY-Wing cannot survive a visible candidate change", () => {
  const position = "850000031000070000000809000023700610970301052000020003100407006205006307000080100";
  const values = [...position].map((value) => value === "0" ? "" : value);
  const candidateRows = [
    ["", "", "79", "26", "46", "24", "79", "", ""],
    ["346", "1469", "12469", "15", "", "35", "2489", "24689", "489"],
    ["3467", "1346", "12467", "", "13", "", "2457", "2467", "45"],
    ["45", "", "", "", "59", "458", "", "", "489"],
    ["", "", "468", "", "46", "", "48", "", ""],
    ["456", "1468", "1468", "569", "", "458", "4789", "4789", ""],
    ["", "389", "89", "", "35", "", "2589", "289", ""],
    ["", "48", "", "19", "19", "", "", "48", ""],
    ["3467", "3469", "4679", "25", "", "235", "", "49", "459"],
  ];
  const visibleCandidates = candidateRows.flat().map((digits) => [...digits].map(Number));
  const eliminated = Array.from({ length: 81 }, () => [] as number[]);
  eliminated[17] = [5];
  eliminated[22] = [5];
  const path = buildHintPath(values, eliminated, { visibleCandidates });
  const original = nextHintFromPath(path, values, eliminated, { visibleCandidates });
  assert.equal(original?.technique, "XY-Wing");
  assert.deepEqual(original?.targets, [{ cell: 75, digit: 5 }]);

  const changedCandidates = visibleCandidates.map((digits) => [...digits]);
  changedCandidates[22] = [1, 3, 5];
  assert.equal(nextHintFromPath(path, values, eliminated, { visibleCandidates: changedCandidates }), null);
  const fresh = findHint(values, eliminated, { visibleCandidates: changedCandidates });
  assert.notEqual(fresh?.id, original?.id, "the visibly invalid XY-Wing is recalculated instead of reused");
});

test("the reported live candidate grid cannot produce invisible hint targets", () => {
  const livePosition = "745280030010056007609070008004092000907010004000740000500020803400860010070035090";
  const liveSolution = "745281936813956427629374158384692571967513284251748369596127843432869715178435692";
  const candidateRows = [
    ["", "", "", "", "", "19", "169", "", "169"],
    ["238", "", "238", "349", "", "", "249", "24", ""],
    ["", "23", "", "134", "", "14", "125", "245", ""],
    ["13", "3568", "", "56", "", "", "13567", "5678", "156"],
    ["", "23568", "", "56", "", "38", "2356", "2568", ""],
    ["123", "23568", "1236", "", "", "38", "123569", "2568", "12569"],
    ["", "69", "16", "149", "", "1479", "", "467", ""],
    ["", "239", "23", "", "", "79", "257", "", "25"],
    ["128", "", "1268", "14", "", "", "246", "", "26"],
  ];
  const values = [...livePosition].map((value) => value === "0" ? "" : value);
  const visibleCandidates = candidateRows.flat().map((digits) => [...digits].map(Number));

  const hint = findHint(values, [], { visibleCandidates, solution: liveSolution });
  assert.ok(hint, "the advanced engine continues with another supported logical step");
  if (hint.kind === "eliminate") {
    assert.ok(hint.targets.every(({ cell, digit }) => visibleCandidates[cell].includes(digit)), "every elimination is visible on the live board");
  }
  assert.notDeepEqual(hint.targets, [{ cell: 27, digit: 8 }, { cell: 45, digit: 8 }, { cell: 47, digit: 8 }], "the already-applied elimination is skipped");
});

test("applying a hint keeps solver eliminations and visible notes in sync", () => {
  const game = createGame(fixture, 1);
  game.corner[2] = [4, 7];
  game.centre[2] = [1, 4, 9];
  applyGameHint(game, {
    id: "test-elimination",
    technique: "Test",
    summary: "Test",
    explanation: "Test",
    kind: "eliminate",
    evidence: [],
    targets: [{ cell: 2, digit: 4 }],
  });
  assert.deepEqual(game.eliminated[2], [4]);
  assert.deepEqual(game.corner[2], [7]);
  assert.deepEqual(game.centre[2], [1, 9]);
});

test("adding a centre candidate restores it to solver state and invalidates cached hints", () => {
  const game = createGame(fixture, 1);
  game.centre[2] = [1, 2];
  game.eliminated[2] = [4];
  game.hintPath = { engine: "test", generatedAt: 1, stateKey: "old", complete: false, hints: [] };
  selectCell(game, 2);
  setMode(game, "centre");
  enterDigit(game, 4);
  assert.deepEqual(game.centre[2], [1, 2, 4]);
  assert.deepEqual(game.eliminated[2], []);
  assert.equal(game.hintPath, undefined);
});

test("separate notation modes, multi-cell entry, candidate cleanup, undo and redo are stable", () => {
  const game = createGame(fixture, 1);
  selectCell(game, 2);
  setMode(game, "corner");
  enterDigit(game, 4);
  assert.deepEqual(game.corner[2], [4]);
  setMode(game, "centre");
  enterDigit(game, 1);
  assert.deepEqual(game.centre[2], [1]);
  selectCell(game, 3, true);
  setMode(game, "normal");
  enterDigit(game, 5);
  assert.deepEqual(game.corner[2], [4, 5]);
  assert.deepEqual(game.corner[3], [5]);
  assert.equal(undo(game), true);
  assert.deepEqual(game.corner[2], [4]);
  assert.equal(redo(game), true);
  assert.deepEqual(game.corner[2], [4, 5]);
});

test("full values reject notes while multi-cell note toggles affect only empty cells", () => {
  const game = createGame(fixture, 1);
  selectCell(game, 2);
  setMode(game, "corner");
  enterDigit(game, 4);
  setMode(game, "normal");
  enterDigit(game, 5);
  assert.equal(game.values[2], "5");
  assert.deepEqual(game.corner[2], []);

  setMode(game, "corner");
  const historyLength = game.history.length;
  enterDigit(game, 6);
  assert.deepEqual(game.corner[2], [], "a full value blocks note entry");
  assert.equal(game.history.length, historyLength, "blocked note entry does not create undo history");
  selectCell(game, 3, true);
  enterDigit(game, 4);
  assert.deepEqual(game.corner[2], []);
  assert.deepEqual(game.corner[3], [4], "a mixed selection adds the note only to empty cells");
  enterDigit(game, 4);
  assert.deepEqual(game.corner[2], []);
  assert.deepEqual(game.corner[3], [], "a repeated note removes it from every eligible cell");
});

test("simple multi-cell entry uses centre notes", () => {
  const game = createGame(fixture, 1);
  selectCell(game, 2);
  selectCell(game, 3, true);
  enterDigit(game, 4, true, "centre");
  assert.deepEqual(game.corner[2], []);
  assert.deepEqual(game.corner[3], []);
  assert.deepEqual(game.centre[2], [4]);
  assert.deepEqual(game.centre[3], [4]);
});

test("a digit is complete once all nine instances are placed", () => {
  const values = Array(81).fill("");
  values.splice(0, 8, ...Array(8).fill("5"));
  assert.equal(digitIsComplete(values, 5), false);
  values[8] = "5";
  assert.equal(digitIsComplete(values, 5), true);
  values[0] = "";
  assert.equal(digitIsComplete(values, 5), false);
});

test("all candidates replace corner notes with centre notes and are undone together", () => {
  const game = createGame(fixture, 1);
  game.corner[2] = [4];
  assert.equal(fillAllCandidates(game), true);
  assert.deepEqual(game.corner[2], []);
  assert.deepEqual(game.centre[2], candidateList(game.values, 2));
  assert.deepEqual(game.centre[3], candidateList(game.values, 3));
  assert.equal(game.history.length, 1);
  assert.equal(undo(game), true);
  assert.deepEqual(game.corner[2], [4]);
  assert.deepEqual(game.centre[2], []);
});

test("entering a value clears both corner and centre notes", () => {
  const game = createGame(fixture, 1);
  selectCell(game, 2);
  game.corner[2] = [4];
  game.centre[2] = [1, 2, 4];
  enterDigit(game, 5);
  assert.equal(game.values[2], "5");
  assert.deepEqual(game.corner[2], []);
  assert.deepEqual(game.centre[2], []);
});

test("a sole centre note can be promoted to a full digit", () => {
  const game = createGame(fixture, 1);
  game.corner[2] = [4, 7];
  game.centre[2] = [5];
  game.centre[3] = [5, 6];
  assert.equal(promoteSoleCentre(game, 2), true);
  assert.equal(game.values[2], "5");
  assert.deepEqual(game.corner[2], []);
  assert.deepEqual(game.centre[2], []);
  assert.deepEqual(game.centre[3], [6], "candidate cleanup applies to peers");
  assert.equal(undo(game), true);
  assert.equal(game.values[2], "");
  assert.deepEqual(game.centre[2], [5]);
  game.centre[2] = [4, 5];
  assert.equal(promoteSoleCentre(game, 2), false, "multiple centre notes are not promoted");
});

test("cells retain multiple colours and coloured lines participate in undo and redo", () => {
  const game = createGame(fixture, 1);
  selectCell(game, 2);
  applyColour(game, "cyan");
  applyColour(game, "amber");
  applyColour(game, "indigo");
  assert.deepEqual(game.colours[2], ["cyan", "amber", "indigo"]);
  applyColour(game, "cyan");
  assert.deepEqual(game.colours[2], ["amber", "indigo"], "a repeated colour removes only itself");
  selectCell(game, 3, true);
  applyColour(game, "rose");
  assert.deepEqual(game.colours[2], ["amber", "indigo", "rose"]);
  assert.deepEqual(game.colours[3], ["rose"]);
  assert.equal(clearColour(game, "amber"), true);
  assert.deepEqual(game.colours[2], ["indigo", "rose"]);
  assert.deepEqual(game.colours[3], ["rose"], "clearing one colour preserves every other colour");
  assert.equal(undo(game), true);
  assert.deepEqual(game.colours[2], ["amber", "indigo", "rose"]);
  assert.equal(clearColours(game), true);
  assert.deepEqual(game.colours[2], []);
  assert.deepEqual(game.colours[3], []);
  assert.equal(undo(game), true);
  assert.equal(clearAllColours(game), true);
  assert.equal(game.colours.some((colours) => colours.length > 0), false);

  assert.equal(toggleLine(game, 2, 12, "violet"), true);
  assert.equal(toggleLine(game, 3, 13, "cyan"), true);
  assert.equal(clearLinesByColour(game, "violet"), true);
  assert.deepEqual(game.lines, [{ from: 3, to: 13, colour: "cyan" }], "clearing one line colour preserves other lines");
  assert.equal(undo(game), true);
  assert.equal(clearLines(game), true);
  assert.deepEqual(game.lines, []);
  assert.equal(undo(game), true);
  assert.deepEqual(game.lines, [{ from: 2, to: 12, colour: "violet" }, { from: 3, to: 13, colour: "cyan" }]);
  assert.equal(toggleLine(game, 3, 13, "cyan"), true);
  assert.deepEqual(game.lines, [{ from: 2, to: 12, colour: "violet" }]);
  assert.equal(toggleLine(game, 12, 2, "orange"), true);
  assert.deepEqual(game.lines, [{ from: 2, to: 12, colour: "orange" }], "redrawing with another colour recolours the connection");
  assert.equal(undo(game), true);
  assert.deepEqual(game.lines, [{ from: 2, to: 12, colour: "violet" }]);
  assert.equal(redo(game), true);
  assert.deepEqual(game.lines, [{ from: 2, to: 12, colour: "orange" }]);
  assert.equal(toggleLine(game, 2, 12, "orange"), true);
  assert.deepEqual(game.lines, [], "redrawing the same coloured connection removes it");
});

test("catalogue has 20 valid, rated, provenance-complete puzzles in every band", async () => {
  const puzzles = JSON.parse(await readFile(new URL("../src/data/puzzles.json", import.meta.url), "utf8")) as Puzzle[];
  const hintTechniques = new Set<string>();
  assert.equal(puzzles.length, 80);
  assert.equal(new Set(puzzles.map((puzzle) => puzzle.id)).size, 80);
  for (const band of ["Easy", "Medium", "Hard", "Diabolical"]) assert.equal(puzzles.filter((puzzle) => puzzle.difficulty === band).length, 20);
  for (const puzzle of puzzles) {
    assert.equal(puzzle.solution.length, 81);
    assert.equal(typeof puzzle.seRating, "number");
    assert.equal(puzzle.ratingEngine, "SukakuExplainer");
    assert.match(puzzle.ratingVersion, /bank snapshot d8c8eba/);
    assert.match(puzzle.licence, /Public domain/);
    assert.ok(puzzle.sourceUrl.includes("d8c8ebaee0c08c412cfba96af1923dfa61c83317"));
    for (let index = 0; index < 81; index++) if (puzzle.givens[index] !== "0") assert.equal(puzzle.givens[index], puzzle.solution[index]);
  }
  for (const puzzle of [puzzles.find((item) => item.difficulty === "Easy")!, puzzles.find((item) => item.difficulty === "Hard")!]) {
    const values = puzzle.givens.split("").map((value) => value === "0" ? "" : value);
    const eliminated = Array.from({ length: 81 }, () => [] as number[]);
    const initialPath = buildHintPath(values, eliminated, { solution: puzzle.solution });
    assert.ok(initialPath.complete, `${puzzle.id} must have a complete local hint path`);
    assert.ok(initialPath.hints.length > 0);
    for (let step = 0; step < initialPath.hints.length; step++) {
      const hint = findHint(values, eliminated, { solution: puzzle.solution });
      assert.ok(hint, `${puzzle.id} must retain a current hint at step ${step + 1}`);
      assert.match(hint.id, /^hodoku-/, `${puzzle.id} must use the HoDoKu engine`);
      hintTechniques.add(hint.technique);
      applyLogicalHint(values, eliminated, hint);
    }
    assert.equal(values.join(""), puzzle.solution, `${puzzle.id} hint path reaches its stored solution`);
  }
  assert.ok(hintTechniques.size >= 2, "the external engine supplies more than one logical technique");
});
