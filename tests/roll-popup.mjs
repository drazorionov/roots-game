import { expect } from "@playwright/test";

export async function dismissRollPopup(page) {
  const popup = page.locator(".dice-dialog");
  await expect(popup).toBeVisible();
  await expect(popup.locator(".dice-total")).toBeVisible();
  const equation = await popup.locator(".dice-equation").textContent();
  const notification = await page.locator(".activity-roll").first().textContent();
  expect(notification.replace(/\s/g, "")).toContain(equation.replace(/\s/g, ""));
  await page.keyboard.press("Escape");
  await expect(popup).toHaveCount(0);
}
