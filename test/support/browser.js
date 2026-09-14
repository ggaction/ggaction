import assert from "node:assert/strict";
import path from "node:path";
import { recordFailure } from "./failure-artifacts.js";

const pageErrors = new WeakMap();

export async function openBrowserPage(browser, url, { waitFor, waitForArg } = {}) {
  const page = await browser.newPage();
  const errors = [];
  pageErrors.set(page, errors);
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));

  try {
    const response = await page.goto(url, { waitUntil: "networkidle" });
    assert.equal(response?.ok(), true, `${url} failed to load`);
    if (waitFor) await page.waitForFunction(waitFor, waitForArg);
  } catch (error) {
    await saveBrowserPageEvidence(page, error, "page-readiness");
    throw error;
  }
  return { page, errors };
}

export async function windowValue(page, name) {
  return page.evaluate(key => window[key], name);
}

export function assertNoBrowserErrors(errors, label) {
  assert.deepEqual(errors, [], `${label} browser errors`);
}

export async function saveBrowserPageEvidence(page, error, label) {
  try {
    const directory = await recordFailure({
      label: `${label}: ${page.url()}`, error,
      details: { url: page.url(), viewport: page.viewportSize(), errors: pageErrors.get(page) ?? [] }
    });
    if (directory !== undefined) await page.screenshot({ path: path.join(directory, "actual.png"), timeout: 5000 });
  } catch (failure) { process.stderr.write(`Could not capture browser evidence: ${failure.message}\n`); }
}

export async function saveBrowserEvidence(browser, error) {
  try {
    const pages = browser?.contexts().flatMap(context => context.pages()) ?? [];
    for (const [index, page] of pages.slice(0, 8).entries()) {
      await saveBrowserPageEvidence(page, error, `open-page-${index}`);
    }
  } catch (failure) { process.stderr.write(`Could not inspect browser pages: ${failure.message}\n`); }
}

export async function closeBrowserWithEvidence(browser) {
  // Successful cases close their pages; failed assertions leave a page to inspect.
  await saveBrowserEvidence(browser);
  await browser?.close();
}
