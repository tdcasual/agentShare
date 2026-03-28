import { expect, test } from "@playwright/test";

test("login creates a management session and redirects to the requested page", async ({ page }) => {
  await page.goto("/login?next=%2Ftasks");
  await page.getByLabel("Bootstrap management credential").fill("changeme-bootstrap-key");
  await page.getByRole("button", { name: "Create management session" }).click();

  await expect(page).toHaveURL(/\/tasks$/);

  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === "management_session");

  expect(sessionCookie?.value).toBeTruthy();
});

test("invalid management cookies redirect back to login with an expiry error", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "management_session",
      value: "invalid-session-cookie",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/secrets");

  await expect(page).toHaveURL(/\/login\?next=%2Fsecrets&error=session-expired$/);
  await expect(page.locator("section.notice.error[role='alert']")).toContainText("expired");
});
