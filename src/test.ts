import "mocha";

// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
mocha.checkLeaks();

import "./test/demo";

mocha.run();
