import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

import { mount } from "@vue/test-utils";
import { toRaw } from "vue";
import { createTestingPinia } from "@pinia/testing";
import CommonComponents from "../../../components/common/index";

import AddAccountPage from "../../../components/Popup/AddAccountPage.vue";
import { EntryStorage } from "../../../models/storage";
import { loadI18nMessages } from "../../../store/i18n";
import { useAccountsStore } from "../../../store/Accounts";

chai.should();
chai.use(sinonChai);
mocha.setup("bdd");

describe("AddAccountPage", () => {
  let i18n: { [key: string]: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const components: { [name: string]: any } = {};

  before(async () => {
    i18n = await loadI18nMessages();
    for (const component of CommonComponents) {
      components[component.name] = component.component;
    }
  });

  // a minimal stand-in for a real encryption instance held in the Map
  const fakeEncryption = { getEncryptionStatus: () => true };

  beforeEach(() => {
    // don't touch real storage when the entry is created
    sinon.stub(EntryStorage, "add").resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should construct the new entry with the default encryption instance", async () => {
    // accounts, style and notification are all Pinia stores now (Wave 1-3
    // migration). createTestingPinia stubs every action, so the post-add calls
    // (addCode/hideInfo/toggleEdit) are no-op spies — matching the previous
    // Vuex sinon.fake()/no-op mutation stand-ins.
    const pinia = createTestingPinia({ createSpy: sinon.spy });
    const accountsStore = useAccountsStore(pinia);
    accountsStore.encryption = new Map([
      // regression fixture: the encryption Map must be read with .get(), not []
      ["key-1", fakeEncryption as unknown as EncryptionInterface],
    ]);
    accountsStore.defaultEncryption = "key-1";

    const wrapper = mount(AddAccountPage, {
      global: { plugins: [pinia], mocks: { i18n }, components },
    });

    wrapper.vm.newAccount.secret = "aaaaaaaaaaaaaaaa"; // valid base32, >= 16 chars
    await wrapper.vm.addNewAccount();

    const addCode = accountsStore.addCode as unknown as sinon.SinonSpy;
    addCode.should.have.been.calledOnce;
    // regression: encryption Map must be read with .get(), not [] — bracket
    // indexing returns undefined and the secret would be stored UNENCRYPTED.
    // A Pinia action receives the payload as its first arg (no Vuex context).
    // toRaw: the Map value comes back as a reactive proxy, and chai's `.should`
    // getter chokes on Vue's __v_isRef probe, so compare the raw target.
    const entry = addCode.lastCall.args[0];
    chai.assert.strictEqual(toRaw(entry.encryption), fakeEncryption);
  });
});
