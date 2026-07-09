import { test as base, expect, type Page } from '@playwright/test';

/**
 * Admin 登录 fixture（后续模块复用）。
 *
 * 凭据来自 seed：zhangsan_admin / admin123。
 * 复用方式：import { test, expect } from './auth';
 *           test('xxx', async ({ loggedInPage }) => { ... });
 * loggedInPage 已完成 UI 登录，localStorage.admin_token 已写入。
 */

export const ADMIN_CREDENTIALS = {
  username: 'zhangsan_admin',
  password: 'admin123',
};

// 通过 UI 登录 Admin，返回已登录的 page。
export async function adminLogin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('用户名').fill(ADMIN_CREDENTIALS.username);
  await page.getByPlaceholder('密码').fill(ADMIN_CREDENTIALS.password);
  // Antd Button 自动在两中文字符间插空格，渲染为「登 录」，用正则兼容
  await page.getByRole('button', { name: /登\s?录/ }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

// 已登录 page fixture
export const test = base.extend<{ loggedInPage: Page }>({
  loggedInPage: async ({ page }, use) => {
    await adminLogin(page);
    await use(page);
  },
});

export { expect };
