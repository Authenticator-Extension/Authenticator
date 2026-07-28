import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import CommonComponents from "../../../components/common/index";

import EnterPasswordPage from "../../../components/Popup/EnterPasswordPage.vue";
import { loadI18nMessages } from "../../../store/i18n";
import { useAccountsStore } from "../../../store/Accounts";

chai.should();
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

  // accounts is a Pinia store now (Wave 3 migration); createTestingPinia stubs
  // applyPassphrase so clicking the button just records the call.
  const mountPage = (attach = false, wrongPassword = false) => {
    const pinia = createTestingPinia({ createSpy: sinon.spy });
    const accountsStore = useAccountsStore(pinia);
    accountsStore.wrongPassword = wrongPassword;
    const wrapper = mount(EnterPasswordPage, {
      global: { plugins: [pinia], mocks: { i18n }, components },
      ...(attach ? { attachTo: document.body } : {}),
    });
    return { wrapper, accountsStore };
  };

  it("should apply password when button is clicked", async () => {
    const { wrapper, accountsStore } = mountPage();

    const passwordInput = wrapper.find("input");
    const passwordButton = wrapper.find("button");

    passwordInput.setValue("somePassword");
    await passwordButton.trigger("click");
    const applyPassphrase =
      accountsStore.applyPassphrase as unknown as sinon.SinonSpy;
    applyPassphrase.should.have.been.calledWith("somePassword");
  });

  it("should apply password when enter is pressed", async () => {
    const { wrapper, accountsStore } = mountPage();

    const passwordInput = wrapper.find("input");

    passwordInput.setValue("anotherPassword");
    await passwordInput.trigger("keyup.enter");
    const applyPassphrase =
      accountsStore.applyPassphrase as unknown as sinon.SinonSpy;
    applyPassphrase.should.have.been.calledWith("anotherPassword");
  });

  it("should autofocus password input", () => {
    const { wrapper } = mountPage(true);

    const passwordInput = wrapper.find("input");

    passwordInput.element.should.eq(document.activeElement);
  });

  it("should not show incorrect password message", () => {
    // isVisible() reads getComputedStyle, which only reflects v-show's
    // display:none for elements attached to the live document, so attach.
    const { wrapper } = mountPage(true);

    const errorText = wrapper.find("label.warning");

    errorText.isVisible().should.be.false;
  });

  context("Incorrect password was entered", () => {
    it("should show incorrect password message", () => {
      const { wrapper } = mountPage(false, true);

      const errorText = wrapper.find("label.warning");

      errorText.isVisible().should.be.true;
    });
  });
});
