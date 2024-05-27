import "mocha";
import * as chai from "chai";
import { assert } from "chai";
import * as sinonChai from "sinon-chai";
import { createLocalVue, mount, Wrapper } from "@vue/test-utils";
import Vuex, { Store } from "vuex";

import { loadI18nMessages } from "../../../store/i18n";
import MenuPage from "../../../components/Popup/MenuPage.vue";

import { Style } from "../../../store/Style";
import { Accounts } from "../../../store/Accounts";
import { Backup } from "../../../store/Backup";
import { CurrentView } from "../../../store/CurrentView";
import { Menu } from "../../../store/Menu";
import { Notification } from "../../../store/Notification";
import { Qr } from "../../../store/Qr";

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
    menu: {
      state: {
        version: "1.2.3",
      },
      namespaced: true,
    },
  };

  let store: Store<{}>;

  let wrapper: Wrapper<any>;

  before(() => {
    // mock the chrome global object
    global.chrome.tabs.create = chrome.tabs.create;
    global.chrome.storage.managed.get = chrome.storage.managed.get;
  });

  beforeEach(async () => {
    store = new Vuex.Store({
      modules: storeOpts,
    });
    wrapper = mount(MenuPage, {
      store,
      localVue,
    });
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

    describe("feedbackURL is set", () => {
      beforeEach(async () => {
        try {
          chrome.storage.managed.get.yieldsAsync({
            feedbackURL: "https://authenticator.cc",
          });

          store = new Vuex.Store({
            modules: {
              backup: await new Backup().getModule(),
              currentView: new CurrentView().getModule(),
              notification: new Notification().getModule(),
              qr: new Qr().getModule(),
              style: new Style().getModule(),
              menu: await new Menu().getModule(),
              accounts: await new Accounts().getModule(),
            },
          });

          wrapper = mount(MenuPage, {
            store,
            localVue,
          });
        } catch (e) {
          console.error(e);
          // Doesn't show up in mocha?
          throw e;
        }
      });

      it("should open a new tab to the page specified in ManagedStorage", async () => {
        await clickMenuPageButtonByTitle(wrapper, "Feedback");
        assert.ok(
          chrome.tabs.create.withArgs({ url: "https://authenticator.cc" })
            .called,
          "Tab create should be called with the feedback URL"
        );
      });
    });
  });

  describe("extension version", () => {
    it("should be displayed", () => {
      assert.equal(wrapper.find("#version").text(), "Version 1.2.3");
    });
  });
});
