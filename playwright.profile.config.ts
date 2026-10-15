import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "profile.cloud.spec.ts",
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:4176/brain-games/",
    viewport: { width: 900, height: 800 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "BASE_PATH=/brain-games/ VITE_FIREBASE_API_KEY=demo-key VITE_FIREBASE_AUTH_DOMAIN=demo-brain-games.firebaseapp.com VITE_FIREBASE_PROJECT_ID=demo-brain-games VITE_FIREBASE_APP_ID=demo-app VITE_USE_EMULATORS=true npm run build && BASE_PATH=/brain-games/ vite preview --host 127.0.0.1 --port 4176 --strictPort",
    url: "http://127.0.0.1:4176/brain-games/",
    reuseExistingServer: false,
  },
});
