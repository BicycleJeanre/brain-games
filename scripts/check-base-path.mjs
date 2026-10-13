import { readFile, readdir } from "node:fs/promises";

const files = await readdir(new URL("../dist/", import.meta.url));
const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
if (!html.includes("/wtrack/assets/") || !html.includes('href="./manifest.webmanifest"')) throw new Error("Build assets do not use the /wtrack/ base path.");
if (!files.includes("sw.js")) throw new Error("Service worker was not emitted.");
const serviceWorker = await readFile(new URL("../dist/sw.js", import.meta.url), "utf8");
if (!serviceWorker.includes("catalogue/index.json")) throw new Error("Service worker does not cache the catalogue index.");
if (serviceWorker.includes("catalogue/puzzles/")) throw new Error("Service worker must not cache full puzzle payloads.");
const catalogueIndex = JSON.parse(await readFile(new URL("../dist/catalogue/index.json", import.meta.url), "utf8"));
const puzzleFiles = await readdir(new URL("../dist/catalogue/puzzles/", import.meta.url));
if (catalogueIndex.puzzles.length < 100) throw new Error(`Expected at least 100 catalogue entries, found ${catalogueIndex.puzzles.length}.`);
if (puzzleFiles.length !== catalogueIndex.puzzles.length) throw new Error(`Expected ${catalogueIndex.puzzles.length} on-demand puzzle payloads, found ${puzzleFiles.length}.`);
if (catalogueIndex.puzzles.some((puzzle) => "grid" in puzzle || "words" in puzzle || "clues" in puzzle)) {
  throw new Error("Catalogue index must contain metadata only.");
}
const assetFiles = await readdir(new URL("../dist/assets/", import.meta.url));
const applicationJavaScript = (await Promise.all(assetFiles.filter((file) => file.endsWith(".js")).map((file) => readFile(new URL(`../dist/assets/${file}`, import.meta.url), "utf8")))).join("\n");
if (applicationJavaScript.includes("ws-word-craft-001")) throw new Error("Full puzzle payloads leaked into the JavaScript bundle.");
console.log(`Verified /wtrack/ paths, metadata-only service-worker cache, and ${puzzleFiles.length} on-demand puzzle payloads.`);
