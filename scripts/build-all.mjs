import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

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
