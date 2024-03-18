import "mocha";
import { MochaReporter } from "./mochaReporter";
import sinon from "sinon";

// @ts-expect-error this is not a node require
const tests = require.context("./test", true, /\.tsx?$/);
tests.keys().forEach(tests);

mocha.setup({
  // @ts-expect-error - typings are wrong
  reporter: MochaReporter,
  rootHooks: {
    afterEach() {
      sinon.restore();
    },
  },
});

mocha.run();
