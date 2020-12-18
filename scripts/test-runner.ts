// Runs tests via puppeteer. Do not compile using webpack.

import * as puppeteer from "puppeteer";
import * as path from "path";

declare global {
  interface Window {
    __mocha_test_results__: any;
    __coverage__: any;
  }
}

async function runTests() {
  const browser = await puppeteer.launch({
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--load-extension=${path.resolve(__dirname, "../test/chrome")}`],
  });
  const mochaPage = await browser.newPage();
  await mochaPage.goto(
    "chrome-extension://bhghoamapcdpbohphigoooaddinpkbai/view/test.html"
  );
  const results = await mochaPage.evaluate(() => {
    return new Promise(resolve => {
      window.addEventListener("testsComplete", () => {
        resolve({
          coverage: window.__coverage__,
          testResults: window.__mocha_test_results__
        });
      });
    });
  });
  console.log(results);
}

runTests();
