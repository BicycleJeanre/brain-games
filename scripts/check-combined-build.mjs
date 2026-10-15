import { access, readFile } from "node:fs/promises";

for (const path of ["dist/index.html", "dist/sw.js", "dist/sudoku/index.html", "dist/sudoku/sw.js", "dist/words/index.html", "dist/words/sw.js", "dist/words/catalogue/index.json"]) await access(path);
const shell = await readFile("dist/index.html", "utf8");
const sudoku = await readFile("dist/sudoku/index.html", "utf8");
const words = await readFile("dist/words/index.html", "utf8");
if (!shell.includes("/brain-games/")) throw new Error("Brain Games shell base path is missing");
if (!sudoku.includes("/brain-games/sudoku/")) throw new Error("Sudoku module base path is missing");
if (!words.includes("/brain-games/words/")) throw new Error("Word Games module base path is missing");
console.log("Combined Brain Games artifact contains shell, Sudoku, Word Games, service workers, catalogue, and correct base paths.");
