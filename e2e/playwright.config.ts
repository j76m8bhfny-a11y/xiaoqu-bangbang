import { defineConfig, devices } from '@playwright/test';

/**
 * Admin 后台 E2E 配置。
 * 小程序部分用 weapp-dev-mcp 驱动，不走 Playwright。
 * config 置于 e2e/，webServer.cwd 指向项目根以复用根 pnpm 脚本。
 */
export default defineConfig({
  testDir: './admin',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    // 每测试独立登录态，不共享 storageState
    storageState: { cookies: [], origins: [] },
  },
  webServer: {
    command: 'pnpm dev:admin',
    port: 3001,
    reuseExistingServer: true,
    cwd: '..',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
