import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  Board,
  SOLVER_STEPS_SORTED,
  StepFinder,
} from "../vendor/hodoku-ts/dist/index.js";

const SOURCE_COMMIT = "405a68437af277ad31a37106b489079295ad1fca";
const sourceDir = resolve(process.argv[2] || "../Hodoku2");

const requested = [
  ["naked-single", "0003", "NAKED_SINGLE"],
  ["hidden-single", "0002", "HIDDEN_SINGLE"],
  ["locked-candidates", "0100", "LOCKED_CANDIDATES_1"],
  ["naked-pair", "0200", "NAKED_PAIR"],
  ["naked-triple", "0201", "NAKED_TRIPLE"],
  ["x-wing", "0300", "X_WING"],
  ["swordfish", "0301", "SWORDFISH"],
  ["jellyfish", "0302", "JELLYFISH"],
  ["skyscraper", "0400", "SKYSCRAPER"],
  ["two-string-kite", "0401", "TWO_STRING_KITE"],
  ["empty-rectangle", "0402", "EMPTY_RECTANGLE"],
  ["xy-wing", "0800", "XY_WING"],
  ["xyz-wing", "0801", "XYZ_WING"],
  ["w-wing", "0803", "W_WING"],
  ["simple-coloring", "0500", "SIMPLE_COLORS_TRAP"],
  ["x-chain", "0701", "X_CHAIN"],
  ["xy-chain", "0702", "XY_CHAIN"],
  ["aic", "0708-1", "AIC"],
  ["unique-rectangle", "0600-1", "UNIQUENESS_1"],
  ["als-xz", "0901-1", "ALS_XZ"],
];

const regLines = readFileSync(resolve(sourceDir, "reglib-1.3.txt"), "utf8").split(/\r?\n/);

function exactStep(record, technique) {
  const board = Board.fromString(record);
  return new StepFinder(board).getStep(technique);
}

function valueSignature(record) {
  return Array.from(Board.fromString(record).values).join("");
}

function serialize(board, code) {
  let values = "";
  const deleted = [];
  for (let cell = 0; cell < 81; cell++) {
    const value = board.getValue(cell);
    values += value ? `${board.isFixed(cell) ? "" : "+"}${value}` : ".";
    if (value) continue;
    const row = Math.floor(cell / 9) + 1;
    const col = cell % 9 + 1;
    for (let digit = 1; digit <= 9; digit++) {
      if (board.isValidValue(cell, digit) && !board.isCandidate(cell, digit)) deleted.push(`${digit}${row}${col}`);
    }
  }
  return `:${code}::${values}:${deleted.join(" ")}:::`;
}

const lessons = requested.map(([id, code, technique]) => {
  const matches = regLines
    .map((record, index) => ({ record, line: index + 1 }))
    .filter(({ record }) => record.startsWith(`:${code}:`) && exactStep(record, technique));
  const example = matches[0];
  const practice = matches.find(({ record }) => valueSignature(record) !== valueSignature(example?.record || record));
  if (!example || !practice) throw new Error(`Need two visually distinct passing HoDoKu regression records for ${id} (${code}/${technique})`);
  return {
    id, technique,
    example: { library: "reglib-1.3", sourceLine: example.line, record: example.record },
    practice: { library: "reglib-1.3", sourceLine: practice.line, record: practice.record },
  };
});

const exemplarText = readFileSync(resolve(sourceDir, "exemplars-1.0.txt")).toString("utf16le").replace(/^\uFEFF/, "");
const exemplarLines = exemplarText.split(/\r?\n/);
const forcingPositions = [];
for (let sourceLine = 0; sourceLine < exemplarLines.length && forcingPositions.length < 2; sourceLine++) {
  const puzzle = exemplarLines[sourceLine].split("#")[0].trim();
  if (!/^[.1-9]{81}$/.test(puzzle) || !exemplarLines[sourceLine].includes("fcv(")) continue;
  const board = Board.fromString(puzzle);
  const finder = new StepFinder(board);
  for (let guard = 0; guard < 500 && !board.isSolved(); guard++) {
    let found = null;
    let config = null;
    for (const candidate of SOLVER_STEPS_SORTED) {
      if (!candidate.enabled) continue;
      found = finder.getStep(candidate.type);
      if (found) { config = candidate; break; }
    }
    if (!found || !config || found.type === "GIVE_UP" || found.type === "BRUTE_FORCE") break;
    if (found.type === "FORCING_CHAIN_CONTRADICTION" || found.type === "FORCING_CHAIN_VERITY") {
      forcingPositions.push({
        technique: found.type,
        library: "exemplars-1.0",
        sourceLine: sourceLine + 1,
        record: serialize(board, found.type === "FORCING_CHAIN_VERITY" ? "1302" : "1301"),
      });
      break;
    }
    finder.doStep(found);
  }
}
if (forcingPositions.length < 2) throw new Error("Need two HoDoKu forcing-chain exemplars reached by the enabled solver path");
lessons.push({
  id: "forcing-chain",
  technique: forcingPositions[0].technique,
  example: forcingPositions[0],
  practice: forcingPositions[1],
});

process.stdout.write(`${JSON.stringify({
  schemaVersion: 2,
  source: "HoDoKu2 official regression and exemplar libraries",
  sourceUrl: "https://github.com/wyzelli/Hodoku2",
  sourceCommit: SOURCE_COMMIT,
  licence: "GPL-3.0",
  lessons,
}, null, 2)}\n`);
