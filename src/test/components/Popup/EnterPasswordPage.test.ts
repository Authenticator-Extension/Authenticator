import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

import { mount } from "@vue/test-utils";
import { createStore, Store } from "vuex";
import CommonComponents from "../../../components/common/index";

import EnterPasswordPage from "../../../components/Popup/EnterPasswordPage.vue";
import { loadI18nMessages } from "../../../store/i18n";

const should = chai.should();
chai.use(sinonChai);
mocha.setup("bdd");

describe("EnterPasswordPage", () => {
  let i18n: { [key: string]: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: { [name: string]: any } = {};

  before(async () => {
    i18n = await loadI18nMessages();
    for (const component of CommonComponents) {
      components[component.name] = component.component;
    }
  });

  const storeOpts = {
    modules: {
      accounts: {
        actions: {
          applyPassphrase: sinon.fake(),
        },
        state: {
          wrongPassword: false,
        },
        namespaced: true,
      },
    },
  };
  let store: Store<typeof storeOpts>;

  const mountPage = (attach = false) =>
    mount(EnterPasswordPage, {
      global: { plugins: [store], mocks: { i18n }, components },
      ...(attach ? { attachTo: document.body } : {}),
    });

  beforeEach(() => {
    // TODO: find a nicer var
    storeOpts.modules.accounts.actions.applyPassphrase.resetHistory();
    store = createStore(storeOpts);
  });

  it("should apply password when button is clicked", async () => {
    const wrapper = mountPage();

    const passwordInput = wrapper.find("input");
    const passwordButton = wrapper.find("button");

    passwordInput.setValue("somePassword");
    await passwordButton.trigger("click");
    storeOpts.modules.accounts.actions.applyPassphrase.should.have.been.calledWith(
      sinon.match.any,
      "somePassword",
    );
  });

  it("should apply password when enter is pressed", async () => {
    const wrapper = mountPage();

    const passwordInput = wrapper.find("input");

    passwordInput.setValue("anotherPassword");
    await passwordInput.trigger("keyup.enter");
    storeOpts.modules.accounts.actions.applyPassphrase.should.have.been.calledWith(
      sinon.match.any,
      "anotherPassword",
    );
  });

  it("should autofocus password input", () => {
    const wrapper = mountPage(true);

    const passwordInput = wrapper.find("input");

    passwordInput.element.should.eq(document.activeElement);
  });

  it("should not show incorrect password message", () => {
    // isVisible() reads getComputedStyle, which only reflects v-show's
    // display:none for elements attached to the live document, so attach.
    const wrapper = mountPage(true);

    const errorText = wrapper.find("label.warning");

    errorText.isVisible().should.be.false;
  });

  context("Incorrect password was entered", () => {
    before(() => {
      storeOpts.modules.accounts.state.wrongPassword = true;
    });

    it("should show incorrect password message", () => {
      const wrapper = mountPage();

      const errorText = wrapper.find("label.warning");

      errorText.isVisible().should.be.true;
    });
  });
});
