import "mocha";
import { MochaReporter } from "./mochaReporter";

// @ts-expect-error this is not a node require
const tests = require.context("./test", true, /\.tsx?$/);
tests.keys().forEach(tests);

mocha.setup({
  // @ts-expect-error - typings are wrong
  reporter: MochaReporter,
});

mocha.run();
