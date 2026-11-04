const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'file:///home/javiercl/Escritorio/DAIA/gestorTareas',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], channel: 'firefox' },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 8888 --directory /home/javiercl/Escritorio/DAIA/gestorTareas',
    url: 'http://localhost:8888/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
