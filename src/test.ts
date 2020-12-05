import "mocha";

import "./test/demo";
import "./test/components/Popup/EnterPasswordPage";

mocha.setup({
  checkLeaks: true
});

mocha.run();
