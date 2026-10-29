import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { copyFile } from "node:fs/promises";
import { build } from "vite";

const appRoot = fileURLToPath(new URL("../", import.meta.url));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "warn",
  build: {
    emptyOutDir: true,
    outDir: resolve(appRoot, "vendor/sudokui/dist"),
    lib: {
      entry: resolve(appRoot, "vendor/sudokui/entry.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rolldownOptions: { output: { codeSplitting: false } },
    minify: false,
    sourcemap: false,
  },
});

await copyFile(resolve(appRoot, "vendor/sudokui/types.d.ts"), resolve(appRoot, "vendor/sudokui/dist/index.d.ts"));
