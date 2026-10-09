import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test(
  "login recovery requires a new password and supports a temporary code in the login field",
  { timeout: 60000 },
  async () => {
    const browser = await chromium.launch({
      channel: "chrome",
      headless: true,
    });
    try {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
      });
      const actions = [];
      await page.route("**/api/**", async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        let body = { user: null };
        if (path === "/api/recovery") {
          const data = request.postDataJSON();
          actions.push(data);
          body =
            data.action === "verify"
              ? { requiresPasswordChange: true }
              : { ok: true };
        } else if (path === "/api/auth" && request.method() === "POST")
          body = { requiresPasswordChange: true };
        await route.fulfill({ json: body });
      });
      await page.goto(base);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog
        .getByRole("button", { name: "Forgot password?", exact: true })
        .click();
      await dialog
        .getByLabel("Email", { exact: true })
        .fill("player@example.invalid");
      await dialog
        .getByRole("button", { name: "Send temporary code", exact: true })
        .click();
      await expect(dialog.getByRole("status")).toContainText(
        "If this account is eligible",
      );
      await dialog
        .getByLabel("Temporary code", { exact: true })
        .fill("1234-5678-ABCD-EF90");
      await dialog
        .getByRole("button", { name: "Verify code", exact: true })
        .click();
      await expect(
        dialog.getByLabel("New password", { exact: true }),
      ).toBeVisible();
      await dialog
        .getByLabel("New password", { exact: true })
        .fill("ReplacementPassword123");
      await dialog
        .getByLabel("Confirm new password", { exact: true })
        .fill("DifferentPassword123");
      await dialog
        .getByRole("button", { name: "Save new password", exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toHaveText(
        "The passwords do not match.",
      );
      assert.equal(actions.length, 2);
      await dialog
        .getByLabel("Confirm new password", { exact: true })
        .fill("ReplacementPassword123");
      await dialog
        .getByRole("button", { name: "Save new password", exact: true })
        .click();
      await expect(dialog.getByRole("status")).toContainText(
        "Password updated.",
      );
      await dialog
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
      await dialog
        .getByLabel("Email", { exact: true })
        .fill("player@example.invalid");
      await dialog
        .getByLabel("Password", { exact: true })
        .fill("1234-5678-ABCD-EF90");
      await dialog
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
      await expect(
        dialog.getByLabel("New password", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "My characters", exact: false }),
      ).toHaveCount(0);
      assert.deepEqual(
        actions.map((data) => data.action),
        ["request", "verify", "complete"],
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    } finally {
      await browser.close();
    }
  },
);
