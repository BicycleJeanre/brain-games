export interface CellDigit {
  cell: number;
  digit: number;
}

export interface Grid {
  values: Uint8Array;
  cands: Uint16Array;
  given: Uint8Array;
}

export interface Step {
  tech: string;
  placements: CellDigit[];
  eliminations: CellDigit[];
  primary?: CellDigit[];
  secondary?: CellDigit[];
  fins?: CellDigit[];
  labels?: { primary?: string; secondary?: string; fins?: string };
  units?: Array<{ unit: number; role: "primary" | "secondary" }>;
  links?: Array<{
    from: CellDigit[];
    to: CellDigit[];
    strong: boolean;
    text?: string;
  }>;
  description: string;
}

export interface Frame {
  text: string;
  links: number;
  drawn?: number[];
  sets?: number[];
  show: Set<string>;
}

export interface TechDoc {
  what: string;
  why: string;
  spot: string;
  aka: string[];
}

export const TECHS: Record<string, { name: string }>;
export const TECH_DOCS: Record<string, TechDoc>;
export function bit(digit: number): number;
export function emptyGrid(): Grid;
export function setValue(grid: Grid, cell: number, digit: number): void;
export function findNextStep(grid: Grid): Step | null;
export function findStep(technique: string, grid: Grid): Step | null;
export function applyStep(grid: Grid, step: Step): void;
export function describe(step: Step): string;
export function walkFrames(step: Step): Frame[];
