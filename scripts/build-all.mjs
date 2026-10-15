import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const run = (command, args, environment = {}) => {
  const result = spawnSync(command, args, { cwd: root, env: { ...process.env, ...environment }, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

rmSync(resolve(root, "dist"), { recursive: true, force: true });
run("npm", ["run", "build:shell"], { BASE_PATH: process.env.BASE_PATH || "/brain-games/" });
run("npm", ["run", "build", "--workspace=strack"], {
  BASE_PATH: `${process.env.BASE_PATH || "/brain-games/"}sudoku/`,
  BUILD_OUT_DIR: "../../dist/sudoku",
  EMPTY_OUT_DIR: "false",
  VITE_BRAIN_GAMES: "true",
});
run("npm", ["run", "build", "--workspace=wtrack"], {
  BASE_PATH: `${process.env.BASE_PATH || "/brain-games/"}words/`,
  BUILD_OUT_DIR: "../../dist/words",
  EMPTY_OUT_DIR: "false",
  VITE_BRAIN_GAMES: "true",
});

const dist = resolve(root, "dist");
const basePath = process.env.BASE_PATH || "/brain-games/";
for (const module of ["sudoku", "words"]) {
  const htmlPath = resolve(dist, module, "index.html");
  const html = readFileSync(htmlPath, "utf8")
    .replace(/href="[^"]*manifest\.webmanifest"/, `href="${basePath}manifest.webmanifest"`)
    .replace(/href="[^"]*icon\.svg"/, `href="${basePath}icon.svg"`);
  writeFileSync(htmlPath, html);
  rmSync(resolve(dist, module, "manifest.webmanifest"), { force: true });
  const legacyCachePrefix = module === "sudoku" ? "strack-" : "wtrack-";
  writeFileSync(resolve(dist, module, "sw.js"), `self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(${JSON.stringify(legacyCachePrefix)})).map(key=>caches.delete(key)))),
  self.registration.unregister()
])));
`);
}

const walk = (directory) => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const path = resolve(directory, entry.name);
  return entry.isDirectory() ? walk(path) : [relative(dist, path).replaceAll("\\", "/")];
});
const assets = walk(dist).filter((file) => file !== "sw.js" && !file.endsWith(".map") && !file.startsWith("words/catalogue/puzzles/"));
const version = `brain-games-${Date.now()}`;
writeFileSync(resolve(dist, "sw.js"), `const CACHE=${JSON.stringify(version)};
const BASE=new URL('./',self.location.href);
const ASSETS=${JSON.stringify(assets)}.map(path=>new URL(path,BASE).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('brain-games-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==BASE.origin)return;
  const url=new URL(event.request.url);
  if(event.request.mode==='navigate'&&url.pathname.startsWith(BASE.pathname)){
    const relativePath=url.pathname.slice(BASE.pathname.length);
    const documentPath=relativePath===''?'index.html':relativePath.endsWith('/')?relativePath+'index.html':relativePath;
    event.respondWith(caches.open(CACHE).then(cache=>cache.match(new URL(documentPath,BASE).href)).then(hit=>hit||fetch(event.request)));return;
  }
  if(ASSETS.includes(event.request.url))event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreVary:true})).then(hit=>hit||fetch(event.request)));
});
`);
