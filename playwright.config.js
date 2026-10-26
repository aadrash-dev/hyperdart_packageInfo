import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export default defineConfig({
  testDir: './tests/browser', workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', launchOptions: existsSync(chrome) ? { executablePath: chrome } : {}, headless: true },
  webServer: { command: 'npm start', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
  reporter: 'list'
});
