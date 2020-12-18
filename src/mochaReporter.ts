import { Runner, Test } from "mocha";

interface MochaTestResults {
  total?: number;
  tests?: Test[];
  pending?: Test[];
  failures?: Test[];
  passes?: Test[];
}

declare global {
  interface Window {
    __mocha_test_results__: MochaTestResults;
  }
}

export function MochaReporter(runner: Runner) {
  const tests: Test[] = [];
  const pending: Test[] = [];
  const failures: Test[] = [];
  const passes: Test[] = [];

  runner.on("start", () => {
    // eslint-disable-next-line @typescript-eslint/camelcase
    window.__mocha_test_results__ = {};
    window.__mocha_test_results__.total = runner.total;
  });

  runner.on("end", () => {
    window.__mocha_test_results__.tests = tests;
    window.__mocha_test_results__.pending = pending;
    window.__mocha_test_results__.failures = failures;
    window.__mocha_test_results__.passes = passes;

    const event = new Event("testsComplete");
    window.dispatchEvent(event);
  });

  runner.on("test end", (test: Test) => tests.push(test));
  runner.on("pending", (test: Test) => pending.push(test));
  runner.on("fail", (test: Test) => failures.push(test));
  runner.on("pass", (test: Test) => passes.push(test));
}
