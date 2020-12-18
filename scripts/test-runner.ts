// Runs tests via puppeteer. Do not compile using webpack.
// TODO: show output in terminal if not in CI?

import * as puppeteer from "puppeteer";
import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
declare global {
  interface Window {
    __mocha_test_results__: MochaTestResults;
    __coverage__: any;
  }
}

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
}

interface MochaTestResults {
  total: number;
  tests: {
    title: string;
    duration: number;
    err?: string;
    status: "failed" | "passed" | "pending";
  }[];
}

async function runTests() {
  const browser = await puppeteer.launch({
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [
      `--load-extension=${path.resolve(__dirname, "../test/chrome")}`,
      "--no-sandbox",
    ],
    // chrome extensions don't work in headless
    headless: false,
    executablePath: process.env.PUPPETEER_EXEC_PATH,
  });
  const mochaPage = await browser.newPage();
  await mochaPage.goto(
    "chrome-extension://bhghoamapcdpbohphigoooaddinpkbai/view/test.html"
  );
  // @ts-expect-error
  const results: {
    coverage: {};
    testResults: MochaTestResults;
  } = await mochaPage.evaluate(() => {
    return new Promise((resolve) => {
      window.addEventListener("testsComplete", () => {
        resolve({
          coverage: window.__coverage__,
          testResults: window.__mocha_test_results__,
        });
      });
    });
  });

  if (process.env.CI) {
    if (!fs.existsSync(".nyc_output")) fs.mkdirSync(".nyc_output");
    fs.writeFileSync(".nyc_output/out.json", JSON.stringify(results.coverage));
    const output = execSync("./node_modules/.bin/nyc report --reporter=text-lcov");
    fs.writeFileSync("coverage.lcov", output);
  }

  let failedTest = false;
  for (const test of results.testResults.tests) {
    switch (test.status) {
      case "passed":
        console.log(`${colors.green}✓${colors.reset} ${test.title}`);
        break;
      case "failed":
        console.log(`${colors.red}✗ ${test.title}${colors.reset}`);
        if (test.err) {
          console.log(test.err)
        }
        failedTest = true;
        break;
      case "pending":
        console.log(`- ${test.title}`);
        break;
    }
  }
  process.exit(failedTest ? 1 : 0);
}

runTests();
