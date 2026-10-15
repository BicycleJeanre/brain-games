import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  use: { baseURL: "http://127.0.0.1:4175/brain-games/", trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && BASE_PATH=/brain-games/ vite preview",
    url: "http://127.0.0.1:4175/brain-games/",
    reuseExistingServer: !process.env.CI,
  },
});
