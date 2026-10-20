import { Board, findTechnique, listTechniques, type SolutionType } from "../vendor/hodoku-ts/dist/index.js";
import trainingCatalogue from "./data/hodoku-training.json" with { type: "json" };
import { convertHoDoKuHint } from "./hint-engine.ts";
import { candidateList } from "./sudoku.ts";
import type { Hint, Puzzle, TrainingTechniqueId } from "./types.ts";

export type TrainingFamily = "Foundations" | "Intersections & subsets" | "Fish" | "Single-digit patterns" | "Wings" | "Coloring & chains" | "Uniqueness & ALS" | "Forcing";

export interface TrainingTechnique {
  id: TrainingTechniqueId;
  title: string;
  family: TrainingFamily;
  level: number;
  prerequisite: TrainingTechniqueId | null;
  concept: string;
  findPrompt: string;
  deductionPrompt: string;
  hodokuTechnique: SolutionType;
  hodokuDifficulty: string;
  hodokuScore: number;
}

export interface TrainingPosition {
  puzzle: Puzzle | null;
  origin: string;
  sourceUrl: string;
  values: string[];
  givens: boolean[];
  eliminated: number[][];
  candidates: number[][];
  hint: Hint;
}

interface LessonCopy {
  title: string;
  family: TrainingFamily;
  prerequisite: TrainingTechniqueId | null;
  concept: string;
  findPrompt: string;
  deductionPrompt: string;
}

const lessonCopy: Record<TrainingTechniqueId, LessonCopy> = {
  "naked-single": { title: "Naked single", family: "Foundations", prerequisite: null, concept: "A cell has only one candidate left. The cell itself tells you the answer.", findPrompt: "Select the empty cell that has only one possible digit.", deductionPrompt: "Choose the only candidate that can be placed in that cell." },
  "hidden-single": { title: "Hidden single", family: "Foundations", prerequisite: "naked-single", concept: "A digit has only one possible home in a row, column, or box—even when that cell has other candidates.", findPrompt: "Select the cell that is the digit’s only possible home in its unit.", deductionPrompt: "Choose the digit that must be placed there." },
  "locked-candidates": { title: "Locked candidates", family: "Intersections & subsets", prerequisite: "hidden-single", concept: "When every place for a digit in a box lies on one row or column, that digit can be removed from the rest of that line.", findPrompt: "Select the cells HoDoKu uses to lock the candidate to one line.", deductionPrompt: "Choose one candidate that the lock eliminates outside the box." },
  "naked-pair": { title: "Naked pair", family: "Intersections & subsets", prerequisite: "locked-candidates", concept: "Two cells in one unit share the same two candidates. Those digits belong to the pair and can leave every other cell in the unit.", findPrompt: "Select the two cells that form the naked pair.", deductionPrompt: "Choose one candidate that can be eliminated because of the pair." },
  "naked-triple": { title: "Naked triple", family: "Intersections & subsets", prerequisite: "naked-pair", concept: "Three cells in one unit contain only the same three digits between them. Those digits can be removed elsewhere in the unit.", findPrompt: "Select the three cells that form the naked triple.", deductionPrompt: "Choose one candidate that the triple eliminates." },
  "x-wing": { title: "X-Wing", family: "Fish", prerequisite: "naked-triple", concept: "A digit appears in the same two columns in two rows. Whichever corners are true, that digit cannot appear elsewhere in those columns.", findPrompt: "Select the four corners that form the X-Wing.", deductionPrompt: "Choose one candidate that the X-Wing eliminates." },
  "swordfish": { title: "Swordfish", family: "Fish", prerequisite: "x-wing", concept: "Three rows restrict one digit to the same three columns. Those columns are covered, so the digit can leave every other row there.", findPrompt: "Select the pattern cells HoDoKu uses for the Swordfish.", deductionPrompt: "Choose a candidate eliminated from a cover column." },
  "jellyfish": { title: "Jellyfish", family: "Fish", prerequisite: "swordfish", concept: "Four rows restrict one digit to four columns. The larger fish removes that digit from those columns in all other rows.", findPrompt: "Select the pattern cells HoDoKu uses for the Jellyfish.", deductionPrompt: "Choose a candidate eliminated from one of its four cover columns." },
  "skyscraper": { title: "Skyscraper", family: "Single-digit patterns", prerequisite: "x-wing", concept: "Two rows or two columns each contain a strong pair for one digit. One endpoint from each pair forms the shared base; any cell that sees both opposite roofs cannot contain the digit.", findPrompt: "Select the bases and roofs of the Skyscraper.", deductionPrompt: "Choose the candidate that sees both roofs." },
  "two-string-kite": { title: "Two-string kite", family: "Single-digit patterns", prerequisite: "skyscraper", concept: "A row strong link and a column strong link meet through one box. A cell seeing the two outer endpoints loses that digit.", findPrompt: "Select the endpoints of the row-and-column kite.", deductionPrompt: "Choose the candidate that sees both outer endpoints." },
  "empty-rectangle": { title: "Empty Rectangle", family: "Single-digit patterns", prerequisite: "two-string-kite", concept: "Inside one box, every candidate for a digit lies along one row or one column. An outside strong link connects to those arms so that either endpoint eliminates the same target.", findPrompt: "Select the box arms and outside strong-link cells that form the Empty Rectangle.", deductionPrompt: "Choose the candidate eliminated by both possible ends of the outside link." },
  "xy-wing": { title: "XY-Wing", family: "Wings", prerequisite: "naked-pair", concept: "A bivalue pivot sees two bivalue wings. The wings share a third digit, which can be removed from every cell that sees both wings.", findPrompt: "Select the pivot and its two wings.", deductionPrompt: "Choose the shared wing candidate that can be eliminated." },
  "xyz-wing": { title: "XYZ-Wing", family: "Wings", prerequisite: "xy-wing", concept: "A three-candidate pivot sees two wings that each share one pivot digit and a common Z. Cells seeing all three lose Z.", findPrompt: "Select the XYZ pivot and its two wings.", deductionPrompt: "Choose the common Z candidate eliminated by the wing." },
  "w-wing": { title: "W-Wing", family: "Wings", prerequisite: "xy-wing", concept: "Two matching bivalue cells are joined by a strong link on one digit. Any cell seeing both wings loses their other digit.", findPrompt: "Select both wings and the cells of their strong link.", deductionPrompt: "Choose the other wing digit that can be eliminated." },
  "simple-coloring": { title: "Simple coloring", family: "Coloring & chains", prerequisite: "two-string-kite", concept: "Color a conjugate chain alternately. An uncolored candidate that sees both colors must be false.", findPrompt: "Select the conjugate chain identified by HoDoKu.", deductionPrompt: "Choose the uncolored candidate that sees both colors." },
  "x-chain": { title: "X-Chain", family: "Coloring & chains", prerequisite: "simple-coloring", concept: "Alternate strong and weak links for one digit. A candidate seeing both proven endpoints is false.", findPrompt: "Select every node in the single-digit chain.", deductionPrompt: "Choose the candidate that sees both chain endpoints." },
  "xy-chain": { title: "XY-Chain", family: "Coloring & chains", prerequisite: "xy-wing", concept: "A chain of bivalue cells passes a truth from digit to digit. A candidate seeing both matching endpoints can be removed.", findPrompt: "Select the ordered bivalue chain.", deductionPrompt: "Choose the candidate eliminated by both endpoints." },
  "aic": { title: "Alternating inference chain", family: "Coloring & chains", prerequisite: "xy-chain", concept: "An AIC alternates strong and weak logical links across cells and digits. Its endpoint relationship proves a placement or elimination.", findPrompt: "Select every node in the alternating inference chain.", deductionPrompt: "Choose the candidate contradicted by both endpoints." },
  "unique-rectangle": { title: "Unique rectangle", family: "Uniqueness & ALS", prerequisite: "naked-pair", concept: "Four cells in two rows, two columns, and two boxes cannot all contain the same pair without creating two solutions. Extra candidates break the deadly pattern.", findPrompt: "Select the four corners of the potential deadly rectangle.", deductionPrompt: "Choose the deadly-pair candidate removed from the corner with extras." },
  "als-xz": { title: "ALS-XZ", family: "Uniqueness & ALS", prerequisite: "aic", concept: "Two almost-locked sets share a restricted candidate X and another candidate Z. Z can be removed from cells that see every Z in both sets.", findPrompt: "Select both almost-locked sets.", deductionPrompt: "Choose the shared Z candidate eliminated outside the sets." },
  "forcing-chain": { title: "Forcing chain", family: "Forcing", prerequisite: "aic", concept: "Follow every candidate branch from a pivot. When all branches reach the same consequence, that consequence is logically forced.", findPrompt: "Select the implication chain supplied by HoDoKu.", deductionPrompt: "Choose the conclusion proved by the chain." },
};

const engineTechniques = new Map(listTechniques().map((item) => [item.technique, item]));
const catalogueTechnique = (technique: SolutionType): SolutionType => {
  if (technique === "SIMPLE_COLORS_TRAP" || technique === "SIMPLE_COLORS_WRAP") return "SIMPLE_COLORS";
  if (technique === "AIC" || technique === "CONTINUOUS_NICE_LOOP" || technique === "DISCONTINUOUS_NICE_LOOP") return "NICE_LOOP";
  if (technique === "FORCING_CHAIN_CONTRADICTION" || technique === "FORCING_CHAIN_VERITY") return "FORCING_CHAIN";
  return technique;
};

export const TRAINING_TECHNIQUES: TrainingTechnique[] = trainingCatalogue.lessons.map((lesson, index) => {
  const id = lesson.id as TrainingTechniqueId;
  const copy = lessonCopy[id];
  const engine = engineTechniques.get(catalogueTechnique(lesson.technique as SolutionType));
  if (!copy || !engine) throw new Error(`Invalid HoDoKu training lesson ${lesson.id}/${lesson.technique}`);
  return { ...copy, id, level: index + 1, hodokuTechnique: lesson.technique as SolutionType, hodokuDifficulty: engine.difficulty, hodokuScore: engine.baseScore };
});

export const TRAINING_ROADMAP = [
  { id: "singles", title: "Singles", detail: "Naked and hidden singles", families: ["Foundations"] },
  { id: "subsets", title: "Intersections & subsets", detail: "Locked candidates, pairs, triples", families: ["Intersections & subsets"] },
  { id: "fish", title: "Fish & single-digit patterns", detail: "X-Wing, Swordfish, Jellyfish, Skyscraper, two-string kite, Empty Rectangle", families: ["Fish", "Single-digit patterns"] },
  { id: "wings", title: "Wings", detail: "XY-Wing, XYZ-Wing, W-Wing", families: ["Wings"] },
  { id: "chains", title: "Coloring & chains", detail: "Simple coloring, X-chains, XY-chains, AIC", families: ["Coloring & chains"] },
  { id: "expert", title: "Expert structures", detail: "Unique rectangles, ALS-XZ, forcing chains", families: ["Uniqueness & ALS", "Forcing"] },
] as const;

const positionCache = new Map<TrainingTechniqueId, TrainingPosition>();

export function trainingTechnique(id: TrainingTechniqueId) { return TRAINING_TECHNIQUES.find((technique) => technique.id === id)!; }

const normalizeTechniqueName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const trainingByHintName = new Map<string, TrainingTechniqueId>(TRAINING_TECHNIQUES.map((technique) => [normalizeTechniqueName(technique.title), technique.id]));
trainingByHintName.set("simple colors", "simple-coloring");
trainingByHintName.set("alternating inference chain", "aic");
trainingByHintName.set("forcing chain contradiction", "forcing-chain");
trainingByHintName.set("forcing chain verity", "forcing-chain");

export function trainingTechniqueForHint(technique: string): TrainingTechnique | null {
  const id = trainingByHintName.get(normalizeTechniqueName(technique));
  return id ? trainingTechnique(id) : null;
}

export function findTrainingPosition(id: TrainingTechniqueId, _catalogue: Puzzle[]): TrainingPosition | null {
  const cached = positionCache.get(id);
  if (cached) return cached;
  const source = trainingCatalogue.lessons.find((lesson) => lesson.id === id);
  if (!source) return null;
  const board = Board.fromString(source.record);
  const values = Array.from(board.values, (value) => value ? String(value) : "");
  const candidates = Array.from({ length: 81 }, (_, cell) => values[cell] ? [] : [...board.getCandidates(cell)]);
  const eliminated = Array.from({ length: 81 }, (_, cell) => values[cell] ? [] : candidateList(values, cell).filter((digit) => !candidates[cell].includes(digit)));
  const step = findTechnique(board, source.technique as SolutionType);
  if (!step) return null;
  const hint = convertHoDoKuHint(step, values, candidates);
  if (!hint) return null;
  const position: TrainingPosition = {
    puzzle: null,
    origin: `HoDoKu ${source.library} · ${source.technique} · source line ${source.sourceLine}`,
    sourceUrl: `${trainingCatalogue.sourceUrl}/blob/${trainingCatalogue.sourceCommit}/${source.library}.txt#L${source.sourceLine}`,
    values,
    givens: Array.from(board.fixed, Boolean),
    eliminated,
    candidates,
    hint,
  };
  positionCache.set(id, position);
  return position;
}

export function patternCells(position: TrainingPosition): number[] {
  return position.hint.kind === "place" ? [...new Set(position.hint.targets.map((target) => target.cell))] : [...new Set(position.hint.evidence)];
}

export function patternMatches(selected: Iterable<number>, position: TrainingPosition) {
  const actual = [...new Set(selected)].sort((a, b) => a - b);
  const expected = patternCells(position).sort((a, b) => a - b);
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

export function deductionMatches(cellIndex: number, digit: number, position: TrainingPosition) {
  return position.hint.targets.some((target) => target.cell === cellIndex && target.digit === digit);
}

export function validateTrainingPosition(position: TrainingPosition) {
  const evidence = patternCells(position);
  return evidence.length > 0
    && evidence.every((index) => position.candidates[index].length > 0 || Boolean(position.values[index]))
    && position.hint.targets.length > 0
    && position.hint.targets.every((target) => position.candidates[target.cell].includes(target.digit));
}
