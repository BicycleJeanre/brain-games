import assert from "node:assert/strict";
import test from "node:test";
import { buildWikidataPuzzle, fetchWikidataTerms, parseWikidataTerms, selectWikidataTerms } from "../src/wikidata.ts";

const labels = ["PLANET", "COMET", "METEOR", "ORBIT", "GALAXY", "NEBULA", "STAR", "SATURN", "EARTH", "MARS", "VENUS", "MOON", "ASTEROID", "COSMOS", "ECLIPSE", "TELESCOPE", "CONSTELLATION", "OBSERVATORY"];
const terms = labels.map((answer, rank) => ({
  id: `Q${rank + 1}`,
  label: answer,
  description: `A public description for ${answer.toLowerCase()}`,
  url: `https://www.wikidata.org/wiki/Q${rank + 1}`,
  answer,
  rank,
}));

test("Wikidata results are normalized, deduplicated, and provenance-ready", () => {
  const parsed = parseWikidataTerms({ search: [
    { id: "Q1", label: "Alpha Centauri", description: "star system", concepturi: "https://www.wikidata.org/wiki/Q1" },
    { id: "Q2", label: "Álpha-Centauri", description: "duplicate normalized answer" },
    { id: "not-an-item", label: "Invalid", description: "invalid identifier" },
    { id: "Q3", label: "No description" },
  ] });
  assert.deepEqual(parsed.map((term) => term.answer), ["ALPHACENTAURI"]);
  assert.equal(parsed[0]?.id, "Q1");
  assert.equal(parsed[0]?.url, "https://www.wikidata.org/wiki/Q1");
});

test("Wikidata fetching is explicit and rejects thin result sets", async () => {
  const requested: string[] = [];
  const request = (async (input: URL | RequestInfo) => {
    const url = String(input);
    requested.push(url);
    if (url.startsWith("https://en.wikipedia.org/")) return new Response(JSON.stringify({ query: { pages: terms.slice(0, 8).map((term) => ({ title: term.label, pageprops: { wikibase_item: term.id } })) } }), { status: 200 });
    return new Response(JSON.stringify({ entities: Object.fromEntries(terms.slice(0, 8).map((term) => [term.id, { id: term.id, labels: { en: { value: term.label } }, descriptions: { en: { value: term.description } } }])) }), { status: 200 });
  }) as typeof fetch;
  const fetched = await fetchWikidataTerms("astronomy", request);
  assert.equal(fetched.length, 8);
  assert.equal(requested.length, 2);
  assert.match(requested[0]!, /generator=links/);
  assert.match(requested[0]!, /titles=astronomy/);
  assert.match(requested[1]!, /action=wbgetentities/);
  assert.match(requested[1]!, /origin=\*/);
});

test("public data becomes a validated offline word-search payload with deterministic selection", () => {
  const options = { kind: "word-search" as const, topic: "astronomy", difficulty: "Medium" as const, terms, seed: "fixed-seed", retrievedAt: "2026-10-13T00:00:00.000Z" };
  const first = buildWikidataPuzzle(options);
  assert.equal(first.kind, "word-search");
  if (first.kind !== "word-search") throw new Error("Expected a word search.");
  assert.deepEqual(selectWikidataTerms(terms, "Medium", "fixed-seed"), selectWikidataTerms(terms, "Medium", "fixed-seed"));
  assert.equal(first.catalogueVersion, "wikidata-live-1.0.0");
  assert.match(first.source.licence, /CC0-1.0/);
  assert.match(first.source.note, /Q\d+/);
  assert.match(first.source.note, /selection seed fixed-seed/);
  assert.ok(first.words.length >= 6);
});

test("public descriptions become playable crossword clues", () => {
  const puzzle = buildWikidataPuzzle({ kind: "crossword", topic: "astronomy", difficulty: "Medium", terms, seed: "crossword-seed", retrievedAt: "2026-10-13T00:00:00.000Z" });
  assert.equal(puzzle.kind, "crossword");
  assert.ok(puzzle.clues.length >= 5);
  assert.ok(puzzle.clues.some((clue) => clue.direction === "across"));
  assert.ok(puzzle.clues.some((clue) => clue.direction === "down"));
  assert.match(puzzle.source.note, /English descriptions used as clues/);
});
