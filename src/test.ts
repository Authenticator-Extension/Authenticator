import "mocha";
import { MochaReporter } from "./mochaReporter";

import "./test/components/Popup/EnterPasswordPage";

mocha.setup({
  // @ts-expect-error - typings are wrong, CI not declared
  reporter: CI ? MochaReporter : "html",
});

mocha.run();
