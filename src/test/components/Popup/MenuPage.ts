import "mocha";
import * as chai from "chai";
import { assert } from "chai";
import * as sinonChai from "sinon-chai";
import { createLocalVue, mount, Wrapper } from "@vue/test-utils";
import Vuex, { Store } from "vuex";

import { loadI18nMessages } from "../../../store/i18n";
import MenuPage from "../../../components/Popup/MenuPage.vue";

import chrome from "sinon-chrome";

chai.should();
chai.use(sinonChai);
mocha.setup("bdd");
const localVue = createLocalVue();

describe("MenuPage", () => {
  before(async () => {
    localVue.prototype.i18n = await loadI18nMessages();
    localVue.use(Vuex);
  });

  let storeOpts = {
    modules: {
      menu: {
        state: {},
        namespaced: true,
      },
    },
  };
  let store: Store<typeof storeOpts>;

  let wrapper: Wrapper<any>;

  beforeEach(() => {
    store = new Vuex.Store(storeOpts);
    // mock the chrome global object
    global.chrome = chrome as any;
  });

  const clickMenuPageButtonByTitle = async (
    wrapper: Wrapper<any>,
    title: string
  ) => wrapper.find(`*[title='${title}']`).trigger("click");

  describe("feedback button", () => {
    // mocks the user agent for testing purposes
    const mockUserAgent = (userAgent: string) => {
      Object.defineProperty(global, "navigator", {
        value: {
          userAgent,
        },
        configurable: true,
        enumerable: true,
        writable: true,
      });
    };

    beforeEach(() => {
      wrapper = mount(MenuPage, {
        store,
        localVue,
        computed: {
          version: () => "1.2.3",
        },
      });
    });

    it("should open a new tab to the Chrome help page when the feedback button is clicked and the user agent is Chrome", async () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
      );
      await clickMenuPageButtonByTitle(wrapper, "Feedback");
      assert.ok(
        chrome.tabs.create.withArgs({ url: "https://otp.ee/chromeissues" })
          .calledOnce,
        "Tab create should be called with the Chrome URL"
      );
    });

    it("should open a new tab to the Edge help page when the feedback button is clicked and the user agent is Edge", async () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.74 Safari/537.36 Edg/79.0.309.43"
      );
      await clickMenuPageButtonByTitle(wrapper, "Feedback");
      assert.ok(
        chrome.tabs.create.withArgs({ url: "https://otp.ee/edgeissues" })
          .calledOnce,
        "Tab create should be called with the Edge URL"
      );
    });

    it("should open a new tab to the Firefox help page when the feedback button is clicked and the user agent is Firefox", async () => {
      mockUserAgent(
        "Mozilla/5.0 (Windows NT x.y; rv:10.0) Gecko/20100101 Firefox/10.0"
      );
      await clickMenuPageButtonByTitle(wrapper, "Feedback");
      assert.ok(
        chrome.tabs.create.withArgs({ url: "https://otp.ee/firefoxissues" })
          .calledOnce,
        "Tab create should be called with the Firefox URL"
      );
    });

    it("should open a new tab to the Chrome help page when the feedback button is clicked and the user agent is unknown", async () => {
      mockUserAgent("Unknown");
      await clickMenuPageButtonByTitle(wrapper, "Feedback");
      assert.ok(
        chrome.tabs.create.withArgs({ url: "https://otp.ee/chromeissues" })
          .called,
        "Tab create should be called with the Chrome URL"
      );
    });
  });

  describe("extension version", () => {
    it("should be displayed at the bottom", () => {
      assert.equal(wrapper.find("#version").text(), "Version 1.2.3");
    });
  });
});
