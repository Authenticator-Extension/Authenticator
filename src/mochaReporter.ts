import { Runner, Test } from "mocha";

interface MochaTestResults {
  total?: number;
  tests?: Record<string, unknown>[];
  pending?: Record<string, unknown>[];
  failures?: Record<string, unknown>[];
  passes?: Record<string, unknown>[];
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
    const strip = (test: Test) => {
      return {
        title: test.fullTitle(),
        duration: test.duration,
        err: test.err
      };
    };
    window.__mocha_test_results__.tests = tests.map(strip);
    window.__mocha_test_results__.pending = pending.map(strip);
    window.__mocha_test_results__.failures = failures.map(strip);
    window.__mocha_test_results__.passes = passes.map(strip);

    const event = new Event("testsComplete", { bubbles: true });
    window.dispatchEvent(event);
  });

  runner.on("test end", (test: Test) => tests.push(test));
  runner.on("pending", (test: Test) => pending.push(test));
  runner.on("fail", (test: Test) => failures.push(test));
  runner.on("pass", (test: Test) => passes.push(test));
}
