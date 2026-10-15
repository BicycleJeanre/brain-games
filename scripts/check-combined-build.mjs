import { access, readFile } from "node:fs/promises";

for (const path of ["dist/index.html", "dist/sw.js", "dist/sudoku/index.html", "dist/sudoku/sw.js", "dist/words/index.html", "dist/words/sw.js", "dist/words/catalogue/index.json"]) await access(path);
const shell = await readFile("dist/index.html", "utf8");
const sudoku = await readFile("dist/sudoku/index.html", "utf8");
const words = await readFile("dist/words/index.html", "utf8");
const sudokuRetirementWorker = await readFile("dist/sudoku/sw.js", "utf8");
const wordsRetirementWorker = await readFile("dist/words/sw.js", "utf8");
if (!shell.includes("/brain-games/")) throw new Error("Brain Games shell base path is missing");
if (!sudoku.includes("/brain-games/sudoku/")) throw new Error("Sudoku module base path is missing");
if (!words.includes("/brain-games/words/")) throw new Error("Word Games module base path is missing");
if (!sudoku.includes('/brain-games/manifest.webmanifest') || !words.includes('/brain-games/manifest.webmanifest')) throw new Error("Game modules do not use the shared Brain Games manifest");
if (!sudokuRetirementWorker.includes("registration.unregister") || !wordsRetirementWorker.includes("registration.unregister")) throw new Error("Legacy module service workers do not retire themselves");
console.log("Combined Brain Games artifact contains one shell, manifest and active service worker, retirement workers for older installs, integrated Sudoku, Word Games, catalogue, and correct base paths.");
