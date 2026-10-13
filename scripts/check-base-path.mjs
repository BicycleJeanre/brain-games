import { readFile, readdir } from "node:fs/promises";

const files = await readdir(new URL("../dist/", import.meta.url));
const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
if (!html.includes("/wtrack/assets/") || !html.includes('href="./manifest.webmanifest"')) throw new Error("Build assets do not use the /wtrack/ base path.");
if (!files.includes("sw.js")) throw new Error("Service worker was not emitted.");
console.log("Verified /wtrack/ asset paths and service worker output.");
