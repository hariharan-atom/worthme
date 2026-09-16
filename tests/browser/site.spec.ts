import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { makeResult, INCOME_RANGES } from "../../lib/worth";
import { packResult } from "../../lib/share";

const answers = { name: "Hari", age: 25, profession: "Designer", income: INCOME_RANGES[1], location: "Chennai", goal: "Build a useful product" };
async function openQuiz(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Find My Worth" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
async function profile(page: import("@playwright/test").Page) {
  await page.getByLabel("Display name", { exact: true }).fill("Hari");
  await page.getByLabel("Age", { exact: false }).fill("25");
  await page.getByRole("button", { name: "Continue to details" }).click();
  await expect(page.getByText("Big dreams. Small details.")).toBeVisible();
}
async function details(page: import("@playwright/test").Page) {
  await page.getByLabel("What do you do?").fill("Designer");
  await page.getByLabel("Annual income").selectOption(INCOME_RANGES[1]);
  await page.getByLabel("City", { exact: true }).fill("Chennai");
  await page.getByLabel("What are you chasing?").fill("Build a useful product");
}

for (const [width, height] of [[320, 740], [375, 812], [768, 1024], [1440, 1000], [3840, 2160], [812, 375]]) {
  test(`homepage and modal fit ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openQuiz(page);
    await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const bounds = await page.getByRole("dialog").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
    await page.getByRole("button", { name: "Continue to details" }).click();
    await expect(page.getByText("Use a name between 2 and 28 characters.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Find My Worth" })).toBeFocused();
    await page.locator("#why").scrollIntoViewIfNeeded();
    await expect(page.locator("#why h2")).toBeVisible();
    // Reveal every section before capturing the full page.
    for (const section of await page.locator("[data-reveal]").all()) {
      await section.scrollIntoViewIfNeeded();
      await expect(section).not.toHaveClass(/reveal-pending/);
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: `test-results/home-${width}x${height}.png`, fullPage: true, animations: "disabled" });
  });
}
test("native modal contains keyboard focus and restores it", async ({ page }) => {
  await openQuiz(page);
  for (let i = 0; i < 14; i++) {
    await page.keyboard.press(i < 7 ? "Tab" : "Shift+Tab");
    expect(await page.evaluate(() => document.querySelector("dialog")?.contains(document.activeElement))).toBeTruthy();
  }
  await page.getByRole("button", { name: "Close quiz" }).click();
  await expect(page.getByRole("button", { name: "Find My Worth" })).toBeFocused();
});
test("inline validation and back navigation preserve answers", async ({ page }) => {
  await openQuiz(page);
  await page.getByLabel("Display name").fill("Hari");
  await page.getByLabel("Age", { exact: false }).fill("121");
  await page.getByRole("button", { name: "Continue to details" }).click();
  await expect(page.getByText("Enter a whole-number age from 18 to 120.")).toBeVisible();
  await profile(page);
  await details(page);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Display name")).toHaveValue("Hari");
  await page.getByRole("button", { name: "Continue to details" }).click();
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Chennai");
});
test("photo compression, invalid photo recovery, full generation and portable sharing", async ({ page, browser }) => {
  await openQuiz(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("could not be opened");
  await page.locator('input[type="file"]').setInputFiles("public/brand/hero-thinker.png");
  await expect(page.getByAltText("Your selected profile photo")).toBeVisible();
  const photo = await page.getByAltText("Your selected profile photo").getAttribute("src");
  expect(photo!.length).toBeLessThanOrEqual(102400);
  await profile(page); await details(page);
  const loadingStartedAt = Date.now();
  await page.getByRole("dialog").getByRole("button", { name: "Reveal My Worth", exact: true }).click();
  await expect(page).toHaveURL(/\/r\/[a-z0-9]{10}\?d=/, { timeout: 7000 });
  expect(Date.now() - loadingStartedAt).toBeGreaterThanOrEqual(4800);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hari");
  await expect(page.getByText("THE WORTHME VERDICT", { exact: true })).toBeVisible();
  const fresh = await browser.newContext();
  const shared = await fresh.newPage();
  await shared.goto(page.url());
  await expect(shared.getByRole("heading", { level: 1 })).toContainText("Hari");
  await expect(shared.getByText("Your photo stays in this browser", { exact: false })).toBeVisible();
  await fresh.close();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download card" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/worthme-.*\.png/);
  await download.saveAs("test-results/download-card.png");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.screenshot({ path: "test-results/result-desktop.png", fullPage: true, animations: "disabled" });
});
test("API errors preserve answers and loading can be cancelled", async ({ page }) => {
  await openQuiz(page); await profile(page); await details(page);
  await page.route("**/api/results", route => route.fulfill({ status: 503, json: { error: "Please try again." } }));
  await page.getByRole("dialog").getByRole("button", { name: "Reveal My Worth", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Please try again");
  await expect(page.getByLabel("City", { exact: true })).toHaveValue("Chennai");
  await page.unroute("**/api/results");
  await page.route("**/api/results", async route => { await new Promise(resolve => setTimeout(resolve, 1500)); await route.fulfill({ status: 503, json: { error: "Unavailable" } }).catch(() => {}); });
  await page.getByRole("dialog").getByRole("button", { name: "Reveal My Worth", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Putting your perspective");
  await page.screenshot({ path: "test-results/loading.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("malformed shared links and corrupt cache fail safely", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("worthme:abc123def4", "broken json"));
  await page.goto("/r/abc123def4?d=e30");
  await expect(page.getByRole("heading", { name: "We couldn’t find that card." })).toBeVisible();
  await page.goto("/r/abc123def4");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
test("blocked browser storage still allows generating and viewing", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "SecurityError"); };
    Storage.prototype.getItem = () => { throw new DOMException("Blocked", "SecurityError"); };
  });
  await openQuiz(page); await profile(page); await details(page);
  await page.getByRole("dialog").getByRole("button", { name: "Reveal My Worth", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hari");
});
test("persisted result loading and clipboard fallback", async ({ page }) => {
  const result = makeResult(answers, "abc123def4");
  await page.route("**/api/results/abc123def4", route => route.fulfill({ json: { result } }));
  await page.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined }); Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) } }); });
  await page.goto("/r/abc123def4");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hari");
  await page.getByRole("button", { name: "Share my score" }).click();
  await expect(page.getByRole("textbox", { name: "Your share link" })).toBeVisible();
});
test("server rejects malformed and oversized requests and serves security headers", async ({ request }) => {
  const invalid = await request.post("/api/results", { data: { ...answers, age: 121 } });
  expect(invalid.status()).toBe(400);
  const malformed = await request.post("/api/results", { data: "{", headers: { "Content-Type": "application/json" } });
  expect(malformed.status()).toBe(400);
  const huge = await request.post("/api/results", { data: { ...answers, goal: "x".repeat(130000) } });
  expect(huge.status()).toBe(413);
  const wrongType = await request.post("/api/results", { data: "text" });
  expect(wrongType.status()).toBe(415);
  const crossSite = await request.post("/api/results", { data: answers, headers: { "sec-fetch-site": "cross-site" } });
  expect(crossSite.status()).toBe(403);
  const homepage = await request.get("/");
  expect(homepage.headers()["x-frame-options"]).toBe("DENY");
  expect((await request.get("/icon.svg")).status()).toBe(200);
});
test("reduced motion and no-JavaScript content remain usable", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  expect(await page.locator(".hero-person").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await context.close();
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const staticPage = await noJs.newPage();
  await staticPage.goto("/");
  await expect(staticPage.locator("#why h2")).toBeVisible();
  await noJs.close();
});
test("no serious accessibility issues on homepage, modal, or result", async ({ page }) => {
  // Audit stable UI colors; motion behavior has its own coverage.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const scan = async () => {
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations).toEqual([]);
  };
  await scan();
  await page.getByRole("button", { name: "Find My Worth" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await scan();
  await profile(page);
  await scan();
  await page.keyboard.press("Escape");
  const result = makeResult(answers, "abc123def4");
  await page.goto(`/r/${result.slug}?d=${packResult(result)}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hari");
  await scan();
});

test("hero and final CTA open the quiz and restore the right trigger", async ({ page }) => {
  await page.goto("/");
  for (const name of ["Reveal my worth", "Let's find out"]) {
    const trigger = page.getByRole("button", { name, exact: true });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
});

test("mobile navigation supports links and keyboard dismissal", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const navigation = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await navigation.getByRole("link", { name: "FAQs" }).click();
  await expect(page).toHaveURL(/#faqs$/);
  await expect(navigation).toBeHidden();
  await expect(page.locator("#faq-title")).toBeInViewport();
});

test("portable links take precedence over an older cached card", async ({ page }) => {
  const cached = makeResult({ ...answers, name: "Old name" }, "abc123def4");
  const linked = { ...cached, name: "New name", score: 99 };
  await page.addInitScript(result => sessionStorage.setItem(`worthme:${result.slug}`, JSON.stringify(result)), cached);
  await page.goto(`/r/${linked.slug}?d=${packResult(linked)}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("New name");
  await expect(page.locator(".score-total>strong")).toHaveText("99");
});

test("scroll reveals respond when reduced-motion preference changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".closing-section")).toHaveClass(/reveal-pending/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".reveal-pending")).toHaveCount(0);
  await page.locator(".closing-section").scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Let's find out" })).toBeVisible();
});

test("legal pages, missing routes, and narrow results render without runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const [url, title] of [["/privacy", "Privacy, in plain words."], ["/terms", "A little perspective."], ["/missing-page", "A little off the map."]]) {
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  }
  const result = makeResult({ ...answers, name: "A".repeat(28) }, "abc123def4");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto(`/r/${result.slug}?d=${packResult(result)}`);
  await expect(page.locator(".score-report")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: "test-results/result-mobile.png", fullPage: true, animations: "disabled" });
  expect(errors).toEqual([]);
});

test("long portable-card text stays inside the downloadable artwork", async ({ page }) => {
  await page.addInitScript(() => {
    const original = CanvasRenderingContext2D.prototype.fillText;
    (window as unknown as { drawnText: { x: number; y: number; width: number }[] }).drawnText = [];
    CanvasRenderingContext2D.prototype.fillText = function(text, x, y, maxWidth) {
      (window as unknown as { drawnText: { x: number; y: number; width: number }[] }).drawnText.push({
        x, y, width: Math.min(this.measureText(text).width, maxWidth ?? Infinity),
      });
      original.call(this, text, x, y, maxWidth);
    };
  });
  const result = {
    ...makeResult(answers, "abc123def4"), name: "W".repeat(28),
    verdict: "W".repeat(500), upgrade: "W".repeat(250), valueGap: "W".repeat(50),
    humanType: "W".repeat(80),
  };
  await page.goto(`/r/${result.slug}?d=${packResult(result)}`);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download card" }).click();
  await downloaded;
  const drawn = await page.evaluate(() => (window as unknown as { drawnText: { x: number; y: number; width: number }[] }).drawnText);
  expect(drawn.length).toBeGreaterThan(15);
  for (const line of drawn) {
    expect(line.x + line.width).toBeLessThanOrEqual(1025);
    expect(line.y).toBeLessThanOrEqual(1380);
    if (line.x === 82 && line.y >= 1001 && line.y < 1170) expect(line.y).toBeLessThanOrEqual(1100);
  }
});
