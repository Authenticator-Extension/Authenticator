import "mocha";
import * as chai from "chai";
import { assert } from "chai";
import * as sinonChai from "sinon-chai";
import * as sinon from "sinon";
import { mount, VueWrapper } from "@vue/test-utils";
import { createStore, Store } from "vuex";

import MenuPage from "../../../components/Popup/MenuPage.vue";

chai.should();
chai.use(sinonChai);
mocha.setup("bdd");

describe("MenuPage", () => {
  // chrome.i18n.getMessage returns "" in the test extension, so titles bound
  // to i18n.* render empty. Use a fixed map; only `feedback` is asserted on
  // (the feedback button is found via *[title='Feedback']).
  const i18n: { [key: string]: string } = { feedback: "Feedback" };

  const storeOpts = {
    menu: {
      state: {
        version: "1.2.3",
      },
      namespaced: true,
    },
  };

  let store: Store<{}>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: VueWrapper<any>;

  const mountMenu = () =>
    mount(MenuPage, {
      global: { plugins: [store], mocks: { i18n } },
    });

  beforeEach(async () => {
    store = createStore({
      modules: storeOpts,
    });
    wrapper = mountMenu();
  });

  describe("feedback button", () => {
    it("opens the GitHub issues page", async () => {
      const openStub = sinon.stub(window, "open");
      await wrapper.find("*[title='Feedback']").trigger("click");
      assert.ok(
        openStub.calledWith(
          "https://github.com/Hank076/Authenticator/issues",
          "_blank"
        ),
        "window.open should be called with the GitHub issues URL"
      );
      openStub.restore();
    });
  });

  describe("extension version", () => {
    it("should be displayed", () => {
      assert.equal(wrapper.find("#version").text(), "Version 1.2.3");
    });
  });
});
