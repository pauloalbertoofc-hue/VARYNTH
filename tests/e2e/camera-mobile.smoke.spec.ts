import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 }, isMobile: true });

test("camera mobile route exposes immersive controls without requiring hardware", async ({ page }) => {
  await page.goto("/modules/camera");
  await expect(page.getByRole("heading", { name: "Varynth Camera" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir modo imersivo" })).toBeVisible();

  await page.getByRole("button", { name: "Abrir modo imersivo" }).click();
  await expect(page.getByRole("button", { name: "Sair do modo imersivo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir configurações da câmera" })).toBeVisible();

  await page.getByRole("button", { name: "Abrir configurações da câmera" }).click();
  await expect(page.getByRole("button", { name: "Ocultar configurações da câmera" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir configurações da câmera" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir modo imersivo" })).toBeVisible();
});
