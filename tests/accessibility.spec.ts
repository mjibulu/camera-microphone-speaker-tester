import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createExternalRequestGuard } from "../src/lib/network-guard";

for (const theme of ["light", "dark"] as const) {
  test(`${theme} theme has no serious accessibility violations`, async ({
    page,
    baseURL,
  }) => {
    if (!baseURL) throw new Error("Playwright baseURL is required.");
    const networkGuard = createExternalRequestGuard(baseURL);
    page.on("request", (request) => networkGuard.inspect(request.url()));

    await page.goto("/");
    if (theme === "dark") {
      await page.getByRole("button", { name: "Use dark theme" }).click();
    }

    const results = await new AxeBuilder({ page }).analyze();
    const seriousViolations = results.violations.filter(({ impact }) =>
      impact === "serious" || impact === "critical",
    );

    expect(seriousViolations).toEqual([]);
    networkGuard.assertNoExternalRequests();
  });
}

test("the tool remains usable without horizontal overflow on mobile", async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Playwright baseURL is required.");
  const networkGuard = createExternalRequestGuard(baseURL);
  page.on("request", (request) => networkGuard.inspect(request.url()));

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");

  await expect(page.locator("h1")).toBeVisible();
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    return [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        let ancestor = element.parentElement;
        while (ancestor && ancestor !== document.body) {
          const overflowX = getComputedStyle(ancestor).overflowX;
          if (
            (overflowX === "auto" || overflowX === "scroll") &&
            ancestor.scrollWidth > ancestor.clientWidth
          ) {
            return false;
          }
          ancestor = ancestor.parentElement;
        }
        return true;
      })
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          element: element.tagName.toLowerCase(),
          className: element.className,
          left: Math.round(bounds.left),
          right: Math.round(bounds.right),
          width: Math.round(bounds.width),
        };
      })
      .filter(({ left, right }) => left < -1 || right > viewportWidth + 1)
      .slice(0, 10);
  });
  expect(overflow).toEqual([]);
  networkGuard.assertNoExternalRequests();
});
