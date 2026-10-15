import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  testIgnore: "**/profile.cloud.spec.ts",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:4175/brain-games/", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "VITE_FIREBASE_API_KEY=test-key VITE_FIREBASE_AUTH_DOMAIN=test.invalid VITE_FIREBASE_PROJECT_ID=test-project VITE_FIREBASE_APP_ID=test-app npm run build && BASE_PATH=/brain-games/ vite preview",
    url: "http://127.0.0.1:4175/brain-games/",
    reuseExistingServer: !process.env.CI,
  },
});
