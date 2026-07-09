import { test, expect } from './auth';

/**
 * 1.7 Admin 审批自动建小区 — 5 检查点。
 * 1.7.1-1.7.3 自动化；1.7.4-1.7.5 涉及前后端联动，标手动（HTML 子页面同步标记）。
 *
 * 依赖：seed 数据中存在 pending 状态的小区申请。若无，1.7.3 自动跳过。
 */
test.describe.serial('1.7 Admin 审批自动建小区', () => {
  test('1.7.1 Admin 登录 — zhangsan_admin/admin123 → /dashboard', async ({ loggedInPage }) => {
    await expect(loggedInPage).toHaveURL(/\/dashboard/);
  });

  test('1.7.2 进入小区审批页 — /community-applications 显示待审批列表', async ({
    loggedInPage,
  }) => {
    await loggedInPage.goto('/community-applications');
    // Card 标题「小区申请」可见 = 页面渲染
    await expect(loggedInPage.getByText('小区申请').first()).toBeVisible({ timeout: 10000 });
    // 表格容器渲染（列表非空由 1.7.3 的 pending 行前置检查兜底）
    await expect(loggedInPage.locator('.ant-table')).toBeVisible();
  });

  test('1.7.3 审批通过 — 点击通过 → 提示成功', async ({ loggedInPage }) => {
    await loggedInPage.goto('/community-applications');
    // 首个「通过」按钮（仅 pending 行显示）
    const approveBtn = loggedInPage.getByRole('button', { name: '通过' }).first();
    const hasPending = await approveBtn.isVisible().catch(() => false);
    test.skip(!hasPending, '无待审批小区申请，需 seed 一条 pending 数据');

    await approveBtn.click();
    // Modal.confirm 弹窗 → 点主按钮（确定 / OK，避开 locale 差异）
    const modalBtns = loggedInPage.locator('.ant-modal-confirm-btns .ant-btn-primary');
    await expect(modalBtns).toBeVisible({ timeout: 5000 });
    await modalBtns.click();
    // 成功提示
    await expect(loggedInPage.getByText('已通过，小区已开通')).toBeVisible({ timeout: 10000 });
  });

  test('1.7.4 自动建小区验证（手动） — 列表/数据库出现新小区', async () => {
    test.skip(true, '手动确认：审批通过后查 DB communities 表或小区列表，新小区已建');
  });

  test('1.7.5 用户侧状态更新（手动） — 用户刷新 my-applications → 已通过', async () => {
    test.skip(true, '手动确认：切小程序视角，my-applications 状态变「已通过」且可切换');
  });
});
