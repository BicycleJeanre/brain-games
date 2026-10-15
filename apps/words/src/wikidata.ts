import { generateCrossword, generateWordSearch } from "./external.ts";
import { validatePuzzle } from "./puzzles.ts";
import type { CrosswordPuzzle, Difficulty, Puzzle, PuzzleKind, PuzzleSource, WordSearchPuzzle } from "./types.ts";

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const GENERATOR_VERSION = "1.0.0";

export interface WikidataTerm {
  id: string;
  label: string;
  description: string;
  url: string;
  answer: string;
  rank: number;
}

interface WikidataSearchItem {
  id?: unknown;
  label?: unknown;
  description?: unknown;
  concepturi?: unknown;
}

interface WikidataSearchEnvelope {
  search?: unknown;
}

interface WikipediaLinksEnvelope {
  query?: { pages?: unknown };
}

interface WikidataEntitiesEnvelope {
  entities?: unknown;
}

interface GenerationProfile {
  requestedTerms: number;
  gridSize: number;
  maxAnswerLength: number;
  disabledDirections: string[];
  backwardsProbability: number;
}

const profiles: Record<Exclude<Difficulty, "Unrated">, GenerationProfile> = {
  Easy: { requestedTerms: 8, gridSize: 12, maxAnswerLength: 10, disabledDirections: ["N", "W", "NW", "SW"], backwardsProbability: 0 },
  Medium: { requestedTerms: 10, gridSize: 14, maxAnswerLength: 12, disabledDirections: ["NW", "SW"], backwardsProbability: .25 },
  Hard: { requestedTerms: 12, gridSize: 16, maxAnswerLength: 15, disabledDirections: [], backwardsProbability: .45 },
  Diabolical: { requestedTerms: 16, gridSize: 18, maxAnswerLength: 18, disabledDirections: [], backwardsProbability: .65 },
};

const cleanAnswer = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
const titleCase = (value: string) => value.trim().replace(/\s+/g, " ").replace(/(^|\s)\S/g, (character) => character.toUpperCase());

function hash(value: string) {
  let result = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16_777_619);
  }
  return result >>> 0;
}

function seededOrder<T>(values: T[], seed: string) {
  return [...values].sort((left, right) => hash(`${seed}:${JSON.stringify(left)}`) - hash(`${seed}:${JSON.stringify(right)}`));
}

export function parseWikidataTerms(value: unknown): WikidataTerm[] {
  const search = (value && typeof value === "object" ? (value as WikidataSearchEnvelope).search : undefined);
  if (!Array.isArray(search)) return [];
  const seen = new Set<string>();
  return search.flatMap((raw, rank) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as WikidataSearchItem;
    const id = typeof item.id === "string" && /^Q\d+$/.test(item.id) ? item.id : "";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    const answer = cleanAnswer(label);
    if (!id || !description || answer.length < 3 || answer.length > 24 || seen.has(answer)) return [];
    seen.add(answer);
    return [{ id, label, description, answer, rank, url: typeof item.concepturi === "string" ? item.concepturi : `https://www.wikidata.org/wiki/${id}` }];
  });
}

function parseWikipediaItemIds(value: unknown) {
  const pages = value && typeof value === "object" ? (value as WikipediaLinksEnvelope).query?.pages : undefined;
  if (!Array.isArray(pages)) return [];
  return [...new Set(pages.flatMap((page) => {
    if (!page || typeof page !== "object") return [];
    const raw = page as { title?: unknown; pageprops?: { wikibase_item?: unknown } };
    const id = raw.pageprops?.wikibase_item;
    const title = typeof raw.title === "string" ? raw.title : "";
    const answer = cleanAnswer(title.replace(/\s*\([^)]*\)\s*$/, ""));
    return typeof id === "string" && /^Q\d+$/.test(id) && answer.length >= 3 && answer.length <= 24 ? [id] : [];
  }))];
}

function parseWikidataEntities(value: unknown, orderedIds: string[]): WikidataTerm[] {
  const entities = value && typeof value === "object" ? (value as WikidataEntitiesEnvelope).entities : undefined;
  if (!entities || typeof entities !== "object") return [];
  const seen = new Set<string>();
  return orderedIds.flatMap((id, rank) => {
    const entity = (entities as Record<string, unknown>)[id];
    if (!entity || typeof entity !== "object") return [];
    const raw = entity as { labels?: { en?: { value?: unknown } }; descriptions?: { en?: { value?: unknown } } };
    const label = typeof raw.labels?.en?.value === "string" ? raw.labels.en.value.trim() : "";
    const description = typeof raw.descriptions?.en?.value === "string" ? raw.descriptions.en.value.trim() : "";
    const answer = cleanAnswer(label);
    if (!description || answer.length < 3 || answer.length > 24 || seen.has(answer)) return [];
    seen.add(answer);
    return [{ id, label, description, answer, rank, url: `https://www.wikidata.org/wiki/${id}` }];
  });
}

export async function fetchWikidataTerms(topic: string, request: typeof fetch = fetch, seed = topic) {
  const normalizedTopic = topic.trim().replace(/\s+/g, " ");
  if (normalizedTopic.length < 3 || normalizedTopic.length > 80) throw new Error("Enter a topic between 3 and 80 characters.");
  const wikipediaUrl = new URL(WIKIPEDIA_API);
  wikipediaUrl.search = new URLSearchParams({
    action: "query",
    generator: "links",
    titles: normalizedTopic,
    redirects: "1",
    gpllimit: "500",
    gplnamespace: "0",
    prop: "pageprops",
    format: "json",
    formatversion: "2",
    origin: "*",
  }).toString();
  const wikipediaResponse = await request(wikipediaUrl, { headers: { Accept: "application/json" } });
  if (!wikipediaResponse.ok) throw new Error(`Wikipedia topic request failed (${wikipediaResponse.status}). Try again when the service is available.`);
  const discoveredIds = parseWikipediaItemIds(await wikipediaResponse.json());
  if (discoveredIds.length < 6) throw new Error("That English Wikipedia topic page did not expose enough linked concepts. Try a broader or more established topic title.");

  const orderedIds = seededOrder(discoveredIds, seed).slice(0, 50);
  const wikidataUrl = new URL(WIKIDATA_API);
  wikidataUrl.search = new URLSearchParams({
    action: "wbgetentities",
    ids: orderedIds.join("|"),
    props: "labels|descriptions",
    languages: "en",
    languagefallback: "1",
    format: "json",
    origin: "*",
  }).toString();
  const wikidataResponse = await request(wikidataUrl, { headers: { Accept: "application/json" } });
  if (!wikidataResponse.ok) throw new Error(`Wikidata request failed (${wikidataResponse.status}). Try again when the service is available.`);
  const terms = parseWikidataEntities(await wikidataResponse.json(), orderedIds);
  if (terms.length < 6) throw new Error("Wikidata did not return enough usable English terms for that topic. Try a broader topic.");
  return terms;
}

export function selectWikidataTerms(terms: WikidataTerm[], difficulty: Exclude<Difficulty, "Unrated">, seed: string) {
  const profile = profiles[difficulty];
  const eligible = terms.filter((term) => term.answer.length <= profile.maxAnswerLength);
  const ranked = difficulty === "Easy"
    ? [...eligible].sort((left, right) => left.answer.length - right.answer.length || left.rank - right.rank)
    : difficulty === "Medium"
      ? eligible
      : [...eligible].sort((left, right) => right.answer.length - left.answer.length || right.rank - left.rank);
  const poolSize = Math.min(ranked.length, Math.max(profile.requestedTerms * 2, profile.requestedTerms));
  return seededOrder(ranked.slice(0, poolSize), seed).slice(0, profile.requestedTerms);
}

function sourceFor(terms: WikidataTerm[], topic: string, kind: PuzzleKind, seed: string, retrievedAt: string): PuzzleSource {
  const layout = kind === "word-search" ? "@blex41/word-search 1.2.0" : "crossword-layout-generator 0.1.1";
  return {
    name: "Wikipedia topic links + Wikidata terms",
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.trim().replace(/\s+/g, "_"))}`,
    licence: "CC0-1.0 terms · CC BY-SA 4.0 topic page",
    note: `Related item IDs discovered from the English Wikipedia topic page; labels${kind === "crossword" ? " and English descriptions used as clues" : " used as answers"} fetched from Wikidata: ${terms.map((term) => term.id).join(", ")}. Retrieved ${retrievedAt}. Generated locally by the Brain Games public-data generator ${GENERATOR_VERSION} with ${layout}; selection seed ${seed}. This private generated puzzle has not been editorially reviewed.`,
  };
}

function baseFields(kind: PuzzleKind, topic: string, difficulty: Exclude<Difficulty, "Unrated">, terms: WikidataTerm[], seed: string, retrievedAt: string) {
  const safeTopic = topic.trim().replace(/\s+/g, " ");
  const slug = safeTopic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "topic";
  return {
    id: `wikidata-${kind}-${slug}-${hash(seed).toString(36)}`,
    title: `${titleCase(safeTopic)} · ${difficulty}`,
    subtitle: `Generated locally from ${terms.length} Wikidata items`,
    difficulty,
    catalogueVersion: `wikidata-live-${GENERATOR_VERSION}`,
    source: sourceFor(terms, safeTopic, kind, seed, retrievedAt),
  };
}

function buildWordSearch(topic: string, difficulty: Exclude<Difficulty, "Unrated">, candidates: WikidataTerm[], seed: string, retrievedAt: string): WordSearchPuzzle {
  const profile = profiles[difficulty];
  const result = generateWordSearch(candidates.map((term) => term.answer), profile.gridSize, {
    disabledDirections: profile.disabledDirections,
    backwardsProbability: profile.backwardsProbability,
  });
  if (result.words.length < 6) throw new Error("These terms could not form a useful word search. Try another topic or difficulty.");
  const used = result.words.map((word) => candidates.find((term) => term.answer === word.clean)).filter((term): term is WikidataTerm => Boolean(term));
  return {
    ...baseFields("word-search", topic, difficulty, used, seed, retrievedAt),
    kind: "word-search",
    rows: result.grid.length,
    columns: result.grid[0]?.length ?? 0,
    grid: result.grid,
    words: result.words.map((word, index) => ({ id: `word-${index + 1}`, label: word.clean, path: word.path })),
  };
}

function buildCrossword(topic: string, difficulty: Exclude<Difficulty, "Unrated">, candidates: WikidataTerm[], seed: string, retrievedAt: string): CrosswordPuzzle {
  const result = generateCrossword(seededOrder(candidates, seed).map((term) => ({ answer: term.answer, clue: term.description })));
  const placed = result.result.filter((item): item is typeof item & { orientation: "across" | "down"; startx: number; starty: number; position: number } =>
    (item.orientation === "across" || item.orientation === "down") && typeof item.startx === "number" && typeof item.starty === "number" && typeof item.position === "number");
  if (placed.length < 5 || !placed.some((item) => item.orientation === "across") || !placed.some((item) => item.orientation === "down")) {
    throw new Error("These terms could not form a connected-enough crossword. Try a broader topic or a different difficulty.");
  }
  const used = placed.map((item) => candidates.find((term) => term.answer === item.answer)).filter((term): term is WikidataTerm => Boolean(term));
  return {
    ...baseFields("crossword", topic, difficulty, used, seed, retrievedAt),
    kind: "crossword",
    rows: result.rows,
    columns: result.cols,
    grid: result.table.map((row) => row.map((letter) => letter === "-" ? "#" : letter).join("")),
    clues: placed.map((item) => ({
      number: item.position,
      direction: item.orientation,
      clue: item.clue.charAt(0).toUpperCase() + item.clue.slice(1),
      answer: item.answer,
      row: item.starty - 1,
      column: item.startx - 1,
    })).sort((left, right) => left.number - right.number || left.direction.localeCompare(right.direction)),
  };
}

export function buildWikidataPuzzle(options: {
  kind: PuzzleKind;
  topic: string;
  difficulty: Exclude<Difficulty, "Unrated">;
  terms: WikidataTerm[];
  seed: string;
  retrievedAt?: string;
}): Puzzle {
  const retrievedAt = options.retrievedAt ?? new Date().toISOString();
  const selected = selectWikidataTerms(options.terms, options.difficulty, options.seed);
  if (selected.length < 6) throw new Error("There are not enough usable terms for this difficulty. Try a broader topic or an easier profile.");
  const puzzle = options.kind === "word-search"
    ? buildWordSearch(options.topic, options.difficulty, selected, options.seed, retrievedAt)
    : buildCrossword(options.topic, options.difficulty, selected, options.seed, retrievedAt);
  validatePuzzle(puzzle);
  return puzzle;
}

export async function generateWikidataPuzzle(options: {
  kind: PuzzleKind;
  topic: string;
  difficulty: Exclude<Difficulty, "Unrated">;
  seed?: string;
  request?: typeof fetch;
}) {
  const seed = options.seed ?? `${Date.now()}-${crypto.randomUUID()}`;
  const retrievedAt = new Date().toISOString();
  const terms = await fetchWikidataTerms(options.topic, options.request, seed);
  return buildWikidataPuzzle({ ...options, terms, seed, retrievedAt });
}
