import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

import { mount, createLocalVue } from "@vue/test-utils";
import Vuex, { Store } from "vuex";
import CommonComponents from "../../../components/common/index";

import EnterPasswordPage from "../../../components/Popup/EnterPasswordPage.vue";
import { loadI18nMessages } from "../../../store/i18n";

const should = chai.should();
chai.use(sinonChai);
mocha.setup("bdd");
const localVue = createLocalVue();

describe("EnterPasswordPage", () => {
  before(async () => {
    localVue.prototype.i18n = await loadI18nMessages();
    localVue.use(Vuex);
    for (const component of CommonComponents) {
      localVue.component(component.name, component.component);
    }
  });

  let storeOpts = {
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

  beforeEach(() => {
    // TODO: find a nicer var
    storeOpts.modules.accounts.actions.applyPassphrase.resetHistory();
    store = new Vuex.Store(storeOpts);
  });

  it("should apply password when button is clicked", async () => {
    const wrapper = mount(EnterPasswordPage, { store, localVue });

    const passwordInput = wrapper.find("input");
    const passwordButton = wrapper.find("button");

    passwordInput.setValue("somePassword");
    await passwordButton.trigger("click");
    storeOpts.modules.accounts.actions.applyPassphrase.should.have.been.calledWith(
      sinon.match.any,
      "somePassword"
    );
  });

  it("should apply password when enter is pressed", async () => {
    const wrapper = mount(EnterPasswordPage, { store, localVue });

    const passwordInput = wrapper.find("input");

    passwordInput.setValue("anotherPassword");
    await passwordInput.trigger("keyup.enter");
    storeOpts.modules.accounts.actions.applyPassphrase.should.have.been.calledWith(
      sinon.match.any,
      "anotherPassword"
    );
  });

  it("should autofocus password input", () => {
    const wrapper = mount(EnterPasswordPage, {
      store,
      localVue,
      attachToDocument: true,
    });

    const passwordInput = wrapper.find("input");

    passwordInput.element.should.eq(document.activeElement);
  });

  it("should not show incorrect password message", () => {
    const wrapper = mount(EnterPasswordPage, { store, localVue });

    const errorText = wrapper.find("label.warning");

    errorText.isVisible().should.be.false;
  });

  context("Incorrect password was entered", () => {
    before(() => {
      storeOpts.modules.accounts.state.wrongPassword = true;
    });

    it("should show incorrect password message", () => {
      const wrapper = mount(EnterPasswordPage, { store, localVue });

      const errorText = wrapper.find("label.warning");

      errorText.isVisible().should.be.true;
    });
  });
});
