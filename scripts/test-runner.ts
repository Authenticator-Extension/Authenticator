// Runs tests via puppeteer. Do not compile using webpack.

import * as puppeteer from "puppeteer";
import * as path from "path";

async function runTests() {
  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ["--disable-extensions"],
    args: [`--load-extension=${path.resolve(__dirname, "../test/chrome")}`]
  });
  const mochaPage = await browser.newPage();
  await mochaPage.goto(
    "chrome-extension://bhghoamapcdpbohphigoooaddinpkbai/view/test.html"
  );
  
  // TODO: make custom reporter & runner for mocha
  // use html if CI env var is not true
  // TODO: get coverage report from runner
  // https://github.com/karma-runner/karma-mocha/blob/master/src/adapter.js#L118
  // https://mochajs.org/api/mocha.reporters.base
  // should be able to route test output to any mocha reporter by faking the events
  // TODO: make into custom repo
  // TODO: fix html repo source maps
}

runTests();
