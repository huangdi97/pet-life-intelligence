import { test, expect, urlRe } from "./fixtures";

/** Real-auth browser E2E against the running stack (Stage E §6.5). */

test("AUTH-E2E-B01 注册 → 登录 → 进入 → 退出 → 再登录", async ({ page }) => {
  const email = `real-${Date.now()}@pli.test`;

  // register via real UI
  await page.goto("/register");
  await page.getByLabel("昵称").fill("真实用户");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码", { exact: true }).first().fill("RealPass!w0rd");
  await page.getByPlaceholder("再次输入密码").fill("RealPass!w0rd");
  await page.getByRole("button", { name: "注册", exact: true }).click();
  await expect(page).toHaveURL(urlRe("/"));

  // logout
  await page.getByRole("button", { name: "退出" }).click();
  await expect(page).toHaveURL(urlRe("/login"));

  // login again with the same credentials — data persists (new account, no pets)
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("RealPass!w0rd");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(urlRe("/"));
  await expect(page.getByText("还没有宠物")).toBeVisible();
});

test("AUTH-E2E-B02 错误密码被拒 + 忘记密码→重置→新密码登录", async ({ page }) => {
  const email = `reset-${Date.now()}@pli.test`;

  await page.goto("/register");
  await page.getByLabel("昵称").fill("重置用户");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码", { exact: true }).first().fill("ResetPass!w0rd");
  await page.getByPlaceholder("再次输入密码").fill("ResetPass!w0rd");
  await page.getByRole("button", { name: "注册", exact: true }).click();
  await expect(page).toHaveURL(urlRe("/"));

  // logout
  await page.getByRole("button", { name: "退出" }).click();
  await expect(page).toHaveURL(urlRe("/login"));

  // wrong password rejected
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("WrongPassword!1");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.locator(".alert.emergency")).toBeVisible();

  // forgot password → console token → reset
  await page.goto("/forgot-password");
  await page.getByLabel("邮箱").fill(email);
  await page.getByRole("button", { name: /发送重置/ }).click();
  await expect(page.getByText(/重置链接已生成/)).toBeVisible();
  const tokenText = await page.locator("p.muted", { hasText: "token:" }).textContent();
  const token = tokenText!.match(/token: (\S+)/)![1];

  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("新密码", { exact: true }).fill("NewPass!w0rd22");
  await page.getByLabel("确认新密码").fill("NewPass!w0rd22");
  await page.getByRole("button", { name: "重置密码" }).click();
  await expect(page.getByText(/密码已重置/)).toBeVisible();

  // new password works
  await page.getByRole("link", { name: "去登录" }).click();
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill("NewPass!w0rd22");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(urlRe("/"));
});